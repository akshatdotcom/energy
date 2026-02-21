"use client";

import { Activity, AlertTriangle, LogOut, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineChart } from "@tremor/react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";
import { cn } from "@/lib/utils";

const TICK_INTERVAL_MS = 5000;
const TICK_HOURS = TICK_INTERVAL_MS / 1000 / 3600;
const PENALTY_LIMIT_KW = 500;

type ChargerStatus = "Charging" | "Throttled by AI" | "Ready";

type ChargerState = {
  chargerId: string;
  vehicleId: string;
  departureLabel: string;
  minutesUntilDeparture: number;
  requiredEnergyKwh: number;
  deliveredEnergyKwh: number;
  maxChargeRateKw: number;
  allocatedKw: number;
  status: ChargerStatus;
};

type ChartPoint = {
  time: string;
  "Building Load (kW)": number;
  "Demand Limit (kW)": number;
};

type AllocationApiPayload = {
  buildingBaseLoadKw: number;
  penaltyLimitKw: number;
  chargers: Array<{
    chargerId: string;
    vehicleId: string;
    minutesUntilDeparture: number;
    requiredEnergyKwh: number;
    deliveredEnergyKwh: number;
    maxChargeRateKw: number;
  }>;
};

type AllocationApiResponse = {
  allocations: Array<{
    chargerId: string;
    allocatedKw: number;
    status: ChargerStatus;
    reason: string;
  }>;
  summary: string;
};

type SimulationState = {
  tickCount: number;
  buildingBaseLoadKw: number;
  chargers: ChargerState[];
  chartData: ChartPoint[];
  aiSummary: string;
  avoidedPenaltyKw: number;
  estimatedSavingsUsd: number;
  throttledIds: string[];
  lastError: string | null;
};

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function makeInitialChart(baseLoad: number, evLoad: number): ChartPoint[] {
  const now = new Date();

  return Array.from({ length: 10 }, (_, index) => {
    const pointTime = new Date(now.getTime() - (9 - index) * TICK_INTERVAL_MS);
    return {
      time: formatTimeLabel(pointTime),
      "Building Load (kW)": Math.round(baseLoad + evLoad),
      "Demand Limit (kW)": PENALTY_LIMIT_KW
    };
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function heuristicAllocation(payload: AllocationApiPayload): AllocationApiResponse {
  const availableEvBudget = Math.max(0, payload.penaltyLimitKw - payload.buildingBaseLoadKw);
  const chargers = payload.chargers.map((charger) => {
    const remainingKwh = Math.max(0, charger.requiredEnergyKwh - charger.deliveredEnergyKwh);
    const urgencyScore =
      remainingKwh <= 0 ? -1 : remainingKwh * 3 + 600 / Math.max(10, charger.minutesUntilDeparture);

    return { ...charger, remainingKwh, urgencyScore };
  });

  const sorted = [...chargers].sort((a, b) => b.urgencyScore - a.urgencyScore);
  let remainingBudget = availableEvBudget;
  const allocations = new Map<string, number>();

  for (const charger of sorted) {
    if (charger.remainingKwh <= 0 || remainingBudget <= 0) {
      allocations.set(charger.chargerId, 0);
      continue;
    }

    const desiredKw = Math.min(charger.maxChargeRateKw, charger.remainingKwh / TICK_HOURS);
    const grantedKw = clamp(Math.min(desiredKw, remainingBudget), 0, charger.maxChargeRateKw);
    allocations.set(charger.chargerId, grantedKw);
    remainingBudget -= grantedKw;
  }

  const normalized = payload.chargers.map((charger) => {
    const remainingKwh = Math.max(0, charger.requiredEnergyKwh - charger.deliveredEnergyKwh);
    const allocatedKw = clamp(allocations.get(charger.chargerId) ?? 0, 0, charger.maxChargeRateKw);
    const throttled = remainingKwh > 0 && allocatedKw < Math.min(charger.maxChargeRateKw, remainingKwh / TICK_HOURS);
    const status: ChargerStatus = remainingKwh <= 0 ? "Ready" : throttled ? "Throttled by AI" : "Charging";

    return {
      chargerId: charger.chargerId,
      allocatedKw: Math.round(allocatedKw),
      status,
      reason:
        status === "Ready"
          ? "Energy target reached."
          : status === "Throttled by AI"
            ? "Allocation reduced to keep site under demand threshold."
            : "Priority charging while maintaining load balance."
    };
  });

  return {
    allocations: normalized,
    summary: "Heuristic allocator active. Prioritizing departures while staying under demand limit."
  };
}

function generateNextBaseLoad(previousLoad: number) {
  const volatility = Math.random() < 0.35 ? 80 + Math.random() * 70 : Math.random() * 35;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const candidate = previousLoad + direction * volatility;

  return Math.round(clamp(candidate, 300, 460));
}

const initialChargers: ChargerState[] = [
  {
    chargerId: "C1",
    vehicleId: "Delivery Van A",
    departureLabel: "8:00 AM",
    minutesUntilDeparture: 110,
    requiredEnergyKwh: 140,
    deliveredEnergyKwh: 24,
    maxChargeRateKw: 120,
    allocatedKw: 80,
    status: "Charging"
  },
  {
    chargerId: "C2",
    vehicleId: "Service Truck B",
    departureLabel: "8:30 AM",
    minutesUntilDeparture: 140,
    requiredEnergyKwh: 95,
    deliveredEnergyKwh: 18,
    maxChargeRateKw: 90,
    allocatedKw: 65,
    status: "Charging"
  },
  {
    chargerId: "C3",
    vehicleId: "Shuttle C",
    departureLabel: "9:15 AM",
    minutesUntilDeparture: 190,
    requiredEnergyKwh: 70,
    deliveredEnergyKwh: 30,
    maxChargeRateKw: 70,
    allocatedKw: 40,
    status: "Charging"
  },
  {
    chargerId: "C4",
    vehicleId: "Cargo EV D",
    departureLabel: "9:45 AM",
    minutesUntilDeparture: 220,
    requiredEnergyKwh: 120,
    deliveredEnergyKwh: 12,
    maxChargeRateKw: 110,
    allocatedKw: 45,
    status: "Charging"
  }
];

const initialEvLoad = initialChargers.reduce((sum, charger) => sum + charger.allocatedKw, 0);

const initialState: SimulationState = {
  tickCount: 0,
  buildingBaseLoadKw: 332,
  chargers: initialChargers,
  chartData: makeInitialChart(332, initialEvLoad),
  aiSummary: "Waiting for first AI allocation cycle...",
  avoidedPenaltyKw: 0,
  estimatedSavingsUsd: 0,
  throttledIds: [],
  lastError: null
};

function getBadgeVariant(status: ChargerStatus): "default" | "secondary" | "destructive" {
  if (status === "Throttled by AI") {
    return "destructive";
  }

  if (status === "Ready") {
    return "secondary";
  }

  return "default";
}

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<SimulationState>(initialState);
  const [isTicking, setIsTicking] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const stateRef = useRef<SimulationState>(initialState);
  const tickLockRef = useRef(false);

  useEffect(() => {
    const hasSession = document.cookie.includes(`${DEMO_SESSION_COOKIE}=1`);
    if (!hasSession) {
      router.replace("/login");
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const runSimulationTick = useCallback(async () => {
    if (tickLockRef.current) {
      return;
    }

    tickLockRef.current = true;
    setIsTicking(true);

    const currentState = stateRef.current;
    const nextBaseLoad = generateNextBaseLoad(currentState.buildingBaseLoadKw);

    const payload: AllocationApiPayload = {
      buildingBaseLoadKw: nextBaseLoad,
      penaltyLimitKw: PENALTY_LIMIT_KW,
      chargers: currentState.chargers.map((charger) => ({
        chargerId: charger.chargerId,
        vehicleId: charger.vehicleId,
        minutesUntilDeparture: charger.minutesUntilDeparture,
        requiredEnergyKwh: charger.requiredEnergyKwh,
        deliveredEnergyKwh: charger.deliveredEnergyKwh,
        maxChargeRateKw: charger.maxChargeRateKw
      }))
    };

    let allocationResponse: AllocationApiResponse = heuristicAllocation(payload);
    let errorMessage: string | null = null;

    try {
      const response = await fetch("/api/allocate-load", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`AI allocator responded with ${response.status}`);
      }

      const parsed = (await response.json()) as AllocationApiResponse;
      if (!Array.isArray(parsed.allocations)) {
        throw new Error("Allocator response missing allocations array.");
      }

      allocationResponse = parsed;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Failed to call allocator API.";
    }

    const allocationMap = new Map(
      allocationResponse.allocations.map((allocation) => [allocation.chargerId, allocation])
    );
    let evLoadKw = 0;
    const throttledIds: string[] = [];

    const updatedChargers = currentState.chargers.map((charger) => {
      const allocation = allocationMap.get(charger.chargerId);
      const remainingBefore = Math.max(0, charger.requiredEnergyKwh - charger.deliveredEnergyKwh);
      const requestedKw = Math.min(charger.maxChargeRateKw, remainingBefore / TICK_HOURS);
      const rawAllocatedKw = allocation?.allocatedKw ?? 0;
      const boundedAllocatedKw =
        remainingBefore <= 0 ? 0 : clamp(Math.round(rawAllocatedKw), 0, charger.maxChargeRateKw);

      const deliveredIncrement = boundedAllocatedKw * TICK_HOURS;
      const deliveredEnergyKwh = clamp(
        charger.deliveredEnergyKwh + deliveredIncrement,
        0,
        charger.requiredEnergyKwh
      );

      const remainingAfter = Math.max(0, charger.requiredEnergyKwh - deliveredEnergyKwh);
      let status: ChargerStatus;

      if (remainingAfter <= 0.2) {
        status = "Ready";
      } else if (boundedAllocatedKw < requestedKw - 3) {
        status = "Throttled by AI";
      } else {
        status = "Charging";
      }

      if (status === "Throttled by AI") {
        throttledIds.push(charger.chargerId);
      }

      evLoadKw += boundedAllocatedKw;

      return {
        ...charger,
        minutesUntilDeparture: Math.max(0, charger.minutesUntilDeparture - TICK_INTERVAL_MS / 60000),
        deliveredEnergyKwh,
        allocatedKw: status === "Ready" ? 0 : boundedAllocatedKw,
        status
      };
    });

    const totalLoadKw = Math.round(nextBaseLoad + evLoadKw);
    const naiveLoadKw =
      nextBaseLoad +
      updatedChargers.reduce(
        (sum, charger) =>
          sum +
          (charger.requiredEnergyKwh - charger.deliveredEnergyKwh > 0 ? charger.maxChargeRateKw : 0),
        0
      );

    const avoidedThisTick =
      Math.max(0, naiveLoadKw - PENALTY_LIMIT_KW) - Math.max(0, totalLoadKw - PENALTY_LIMIT_KW);
    const updatedChartData = [...currentState.chartData];
    updatedChartData.push({
      time: formatTimeLabel(new Date()),
      "Building Load (kW)": totalLoadKw,
      "Demand Limit (kW)": PENALTY_LIMIT_KW
    });

    setState((prev) => {
      const avoidedPenaltyKw = Math.max(0, prev.avoidedPenaltyKw + avoidedThisTick);
      const estimatedSavingsUsd = avoidedPenaltyKw * 16.5;

      return {
        ...prev,
        tickCount: prev.tickCount + 1,
        buildingBaseLoadKw: nextBaseLoad,
        chargers: updatedChargers,
        chartData: updatedChartData.slice(-40),
        aiSummary: allocationResponse.summary,
        throttledIds,
        avoidedPenaltyKw,
        estimatedSavingsUsd,
        lastError: errorMessage
      };
    });

    void fetch("/api/log-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        eventType: "simulation_tick",
        payload: {
          tick: currentState.tickCount + 1,
          baseLoadKw: nextBaseLoad,
          evLoadKw,
          totalLoadKw,
          throttledIds
        }
      })
    }).catch(() => null);

    setIsTicking(false);
    tickLockRef.current = false;
  }, []);

  useEffect(() => {
    if (!isAuthorized) {
      return;
    }

    void runSimulationTick();
    const intervalId = window.setInterval(() => {
      void runSimulationTick();
    }, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthorized, runSimulationTick]);

  const totalLoadKw = useMemo(() => {
    return Math.round(state.buildingBaseLoadKw + state.chargers.reduce((sum, charger) => sum + charger.allocatedKw, 0));
  }, [state.buildingBaseLoadKw, state.chargers]);

  const handleLogout = () => {
    document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
    router.push("/login");
    router.refresh();
  };

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-slate-300">
        Preparing dashboard...
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">AeroCharge Live Simulation</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">
            AI EV Load Balancer for Demand Charge Avoidance
          </h1>
          <p className="max-w-3xl text-sm text-slate-300">
            Every 5 seconds we simulate a facility load shock and let the AI reallocate charger power to stay below
            the demand penalty zone.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            End Demo Session
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-800/80 bg-slate-900/65">
          <CardHeader className="pb-3">
            <CardDescription>Current Building Load</CardDescription>
            <CardTitle className="text-3xl text-cyan-300">{totalLoadKw} kW</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Penalty zone starts at {PENALTY_LIMIT_KW} kW.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/65">
          <CardHeader className="pb-3">
            <CardDescription>Penalty Avoided</CardDescription>
            <CardTitle className="text-3xl text-emerald-300">{state.avoidedPenaltyKw.toFixed(0)} kW</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Cumulative peak overage prevented by allocator.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/65">
          <CardHeader className="pb-3">
            <CardDescription>Estimated Monthly Savings</CardDescription>
            <CardTitle className="text-3xl text-amber-300">${state.estimatedSavingsUsd.toFixed(0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">Using $16.5 per kW demand charge assumption.</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800/80 bg-slate-900/65">
          <CardHeader className="pb-3">
            <CardDescription>Simulation Cycle</CardDescription>
            <CardTitle className="text-3xl text-slate-100">#{state.tickCount}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-slate-400">
            <Timer className="h-3.5 w-3.5" />
            <span>{isTicking ? "Computing allocation..." : "Next tick in 5 seconds"}</span>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-800/80 bg-slate-900/60">
        <CardHeader>
          <CardTitle>Building Power Load (kW)</CardTitle>
          <CardDescription>
            Red line is the demand limit. Crossing it triggers expensive utility demand charges.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LineChart
            className="h-80"
            data={state.chartData}
            index="time"
            categories={["Building Load (kW)", "Demand Limit (kW)"]}
            colors={["cyan", "rose"]}
            valueFormatter={(number) => `${number.toFixed(0)} kW`}
            yAxisWidth={60}
            showAnimation
          />
          <p className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-sm text-cyan-100">
            AI Decision: {state.aiSummary}
          </p>
          {state.lastError ? (
            <p className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              Fallback allocator used this tick: {state.lastError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {state.chargers.map((charger) => {
          const remainingKwh = Math.max(0, charger.requiredEnergyKwh - charger.deliveredEnergyKwh);
          const completion = Math.round((charger.deliveredEnergyKwh / charger.requiredEnergyKwh) * 100);
          const isThrottled = state.throttledIds.includes(charger.chargerId);

          return (
            <Card
              key={charger.chargerId}
              className={cn(
                "border-slate-800/80 bg-slate-900/60 transition-all",
                isThrottled && "border-rose-500/70 shadow-[0_0_24px_rgba(244,63,94,0.2)] animate-pulse"
              )}
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-slate-100">{charger.vehicleId}</CardTitle>
                  <Badge variant={getBadgeVariant(charger.status)}>{charger.status}</Badge>
                </div>
                <CardDescription>Charger {charger.chargerId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Target Departure</span>
                  <span className="font-medium text-slate-100">
                    {charger.departureLabel} ({Math.round(charger.minutesUntilDeparture)}m)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Required Energy</span>
                  <span className="font-medium text-slate-100">{charger.requiredEnergyKwh.toFixed(0)} kWh</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Current Allocated Rate</span>
                  <span className="font-medium text-cyan-300">{charger.allocatedKw.toFixed(0)} kW</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Energy Progress</span>
                    <span>
                      {charger.deliveredEnergyKwh.toFixed(1)} / {charger.requiredEnergyKwh.toFixed(0)} kWh
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">{remainingKwh.toFixed(1)} kWh remaining</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/50 px-4 py-3 text-xs text-slate-300">
        <Activity className="h-3.5 w-3.5 text-emerald-300" />
        <span>Simulation tick interval: 5s | Penalty limit: {PENALTY_LIMIT_KW} kW | 4 active chargers</span>
      </section>
    </main>
  );
}
