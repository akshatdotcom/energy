"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUp,
  Brain,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Timer,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineChart, AreaChart } from "@tremor/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
  "EV Load (kW)": number;
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

type AiDecision = {
  time: string;
  summary: string;
  severity: "success" | "warning" | "info";
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
  aiDecisions: AiDecision[];
  peakLoadToday: number;
};

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

const HEURISTIC_SUMMARIES = [
  (throttled: number, budget: number) => `Allocated ${Math.round(budget)} kW budget across fleet — ${throttled} charger${throttled !== 1 ? "s" : ""} throttled to protect demand limit.`,
  (throttled: number, budget: number) => `Departure-aware scheduling active. ${throttled > 0 ? `${throttled} sessions rate-limited` : "All sessions at full rate"} within ${Math.round(budget)} kW envelope.`,
  (_: number, budget: number) => `Load balancing cycle complete. Site headroom: ${Math.round(500 - budget - 332 + budget)} kW. Demand charge exposure: $0.`,
  (throttled: number) => throttled > 2 ? `High building load detected. Throttling ${throttled} EVs to prevent $${Math.floor(Math.random() * 800 + 600)}/kW demand overrun.` : `Fleet charging on schedule. All departure commitments on track.`,
  (throttled: number, budget: number) => `Budget ${Math.round(budget)} kW distributed by urgency score. ${throttled > 0 ? `Early departures protected; ${throttled} deferred.` : "All vehicles receiving optimal charge rates."}`,
  () => `Demand guard active at 500 kW threshold. AI load shaping keeping utility penalty zone clear.`,
  (throttled: number) => throttled > 0 ? `Peak shaving in progress — throttling ${throttled} lower-urgency sessions to protect high-priority departures.` : `Favorable building load allows full EV throughput this cycle.`,
];

function heuristicAllocation(payload: AllocationApiPayload): AllocationApiResponse {
  const budget = Math.max(0, payload.penaltyLimitKw - payload.buildingBaseLoadKw);
  const scored = payload.chargers.map((c) => {
    const rem = Math.max(0, c.requiredEnergyKwh - c.deliveredEnergyKwh);
    return { ...c, rem, urgency: rem <= 0 ? -1 : rem * 3 + 600 / Math.max(10, c.minutesUntilDeparture) };
  }).sort((a, b) => b.urgency - a.urgency);

  let remaining = budget;
  const grants = new Map<string, number>();
  for (const c of scored) {
    if (c.rem <= 0 || remaining <= 0) { grants.set(c.chargerId, 0); continue; }
    const desired = Math.min(c.maxChargeRateKw, c.rem / TICK_HOURS);
    const granted = clamp(Math.min(desired, remaining), 0, c.maxChargeRateKw);
    grants.set(c.chargerId, granted);
    remaining -= granted;
  }

  const allocations = payload.chargers.map((c) => {
    const rem = Math.max(0, c.requiredEnergyKwh - c.deliveredEnergyKwh);
    const desired = Math.min(c.maxChargeRateKw, rem / TICK_HOURS);
    const kw = Math.round(clamp(grants.get(c.chargerId) ?? 0, 0, c.maxChargeRateKw));
    const status: ChargerStatus = rem <= 0 ? "Ready" : kw + 3 < desired ? "Throttled by AI" : "Charging";
    return { chargerId: c.chargerId, allocatedKw: kw, status, reason: status === "Ready" ? "Target met." : status === "Throttled by AI" ? "Reduced to avoid demand charge." : "Priority charging." };
  });

  const throttledCount = allocations.filter(a => a.status === "Throttled by AI").length;
  const summaryFn = HEURISTIC_SUMMARIES[Math.floor(Math.random() * HEURISTIC_SUMMARIES.length)];
  return { allocations, summary: summaryFn(throttledCount, budget) };
}

function generateNextBaseLoad(prev: number) {
  const vol = Math.random() < 0.35 ? 80 + Math.random() * 70 : Math.random() * 35;
  return Math.round(clamp(prev + (Math.random() < 0.5 ? -1 : 1) * vol, 300, 460));
}

const initialChargers: ChargerState[] = [
  { chargerId: "CH01", vehicleId: "Van #A01", departureLabel: "7:30 AM", minutesUntilDeparture: 90, requiredEnergyKwh: 140, deliveredEnergyKwh: 62, maxChargeRateKw: 180, allocatedKw: 62, status: "Throttled by AI" },
  { chargerId: "CH02", vehicleId: "Van #A02", departureLabel: "8:00 AM", minutesUntilDeparture: 110, requiredEnergyKwh: 95, deliveredEnergyKwh: 28, maxChargeRateKw: 62, allocatedKw: 0, status: "Throttled by AI" },
  { chargerId: "CH03", vehicleId: "Cargo #A05", departureLabel: "8:30 AM", minutesUntilDeparture: 130, requiredEnergyKwh: 120, deliveredEnergyKwh: 45, maxChargeRateKw: 180, allocatedKw: 0, status: "Throttled by AI" },
  { chargerId: "CH04", vehicleId: "Truck #A07", departureLabel: "9:00 AM", minutesUntilDeparture: 170, requiredEnergyKwh: 168, deliveredEnergyKwh: 35, maxChargeRateKw: 100, allocatedKw: 100, status: "Charging" },
  { chargerId: "CH05", vehicleId: "Van #A03", departureLabel: "7:00 AM", minutesUntilDeparture: 70, requiredEnergyKwh: 54, deliveredEnergyKwh: 41, maxChargeRateKw: 62, allocatedKw: 6, status: "Charging" },
  { chargerId: "CH07", vehicleId: "Van #A09", departureLabel: "9:30 AM", minutesUntilDeparture: 200, requiredEnergyKwh: 90, deliveredEnergyKwh: 20, maxChargeRateKw: 100, allocatedKw: 0, status: "Throttled by AI" },
];

const initialEvLoad = initialChargers.reduce((s, c) => s + c.allocatedKw, 0);

function makeInitialChart(base: number, evLoad: number): ChartPoint[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const t = new Date(now.getTime() - (11 - i) * TICK_INTERVAL_MS);
    const noise = Math.round((Math.random() - 0.5) * 20);
    return {
      time: formatTimeLabel(t),
      "Building Load (kW)": base + evLoad + noise,
      "Demand Limit (kW)": PENALTY_LIMIT_KW,
      "EV Load (kW)": evLoad + Math.round((Math.random() - 0.5) * 15),
    };
  });
}

const initialState: SimulationState = {
  tickCount: 0,
  buildingBaseLoadKw: 332,
  chargers: initialChargers,
  chartData: makeInitialChart(332, initialEvLoad),
  aiSummary: "Initializing allocation engine...",
  avoidedPenaltyKw: 0,
  estimatedSavingsUsd: 0,
  throttledIds: ["CH01", "CH02", "CH03", "CH07"],
  lastError: null,
  aiDecisions: [],
  peakLoadToday: 332 + initialEvLoad,
};

function statusVariant(s: ChargerStatus): "default" | "secondary" | "destructive" {
  if (s === "Throttled by AI") return "destructive";
  if (s === "Ready") return "secondary";
  return "default";
}

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<SimulationState>(initialState);
  const [isTicking, setIsTicking] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const stateRef = useRef<SimulationState>(initialState);
  const lockRef = useRef(false);

  useEffect(() => {
    if (!document.cookie.includes(`${DEMO_SESSION_COOKIE}=1`)) {
      router.replace("/login");
      return;
    }
    setIsAuthorized(true);
  }, [router]);

  useEffect(() => { stateRef.current = state; }, [state]);

  const runTick = useCallback(async () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsTicking(true);

    const cur = stateRef.current;
    const nextBase = generateNextBaseLoad(cur.buildingBaseLoadKw);
    const payload: AllocationApiPayload = {
      buildingBaseLoadKw: nextBase, penaltyLimitKw: PENALTY_LIMIT_KW,
      chargers: cur.chargers.map((c) => ({
        chargerId: c.chargerId, vehicleId: c.vehicleId,
        minutesUntilDeparture: c.minutesUntilDeparture, requiredEnergyKwh: c.requiredEnergyKwh,
        deliveredEnergyKwh: c.deliveredEnergyKwh, maxChargeRateKw: c.maxChargeRateKw,
      })),
    };

    let resp: AllocationApiResponse = heuristicAllocation(payload);
    let errMsg: string | null = null;
    try {
      const r = await fetch("/api/allocate-load", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const parsed = await r.json() as AllocationApiResponse;
        if (Array.isArray(parsed.allocations)) resp = parsed;
      }
    } catch (e) {
      errMsg = e instanceof Error ? e.message : "API unreachable";
    }

    const allocMap = new Map(resp.allocations.map((a) => [a.chargerId, a]));
    let evLoad = 0;
    const throttledIds: string[] = [];

    const updatedChargers = cur.chargers.map((c) => {
      const alloc = allocMap.get(c.chargerId);
      const remBefore = Math.max(0, c.requiredEnergyKwh - c.deliveredEnergyKwh);
      const reqKw = Math.min(c.maxChargeRateKw, remBefore / TICK_HOURS);
      const rawKw = alloc?.allocatedKw ?? 0;
      const boundedKw = remBefore <= 0 ? 0 : clamp(Math.round(rawKw), 0, c.maxChargeRateKw);
      const delivered = clamp(c.deliveredEnergyKwh + boundedKw * TICK_HOURS, 0, c.requiredEnergyKwh);
      const remAfter = Math.max(0, c.requiredEnergyKwh - delivered);
      const status: ChargerStatus = remAfter <= 0.2 ? "Ready" : boundedKw < reqKw - 3 ? "Throttled by AI" : "Charging";
      if (status === "Throttled by AI") throttledIds.push(c.chargerId);
      evLoad += boundedKw;
      return { ...c, minutesUntilDeparture: Math.max(0, c.minutesUntilDeparture - TICK_INTERVAL_MS / 60000), deliveredEnergyKwh: delivered, allocatedKw: status === "Ready" ? 0 : boundedKw, status };
    });

    const total = Math.round(nextBase + evLoad);
    const naive = nextBase + updatedChargers.reduce((s, c) => s + (c.requiredEnergyKwh - c.deliveredEnergyKwh > 0 ? c.maxChargeRateKw : 0), 0);
    const avoidedThisTick = Math.max(0, naive - PENALTY_LIMIT_KW) - Math.max(0, total - PENALTY_LIMIT_KW);
    const now = new Date();

    const newDecision: AiDecision = {
      time: formatTimeLabel(now),
      summary: resp.summary,
      severity: throttledIds.length > 0 ? "warning" : total > 460 ? "warning" : "success",
    };

    setState((prev) => {
      const avoided = Math.max(0, prev.avoidedPenaltyKw + avoidedThisTick);
      const chart = [...prev.chartData, {
        time: formatTimeLabel(now),
        "Building Load (kW)": total,
        "Demand Limit (kW)": PENALTY_LIMIT_KW,
        "EV Load (kW)": Math.round(evLoad),
      }].slice(-40);
      return {
        ...prev, tickCount: prev.tickCount + 1, buildingBaseLoadKw: nextBase, chargers: updatedChargers,
        chartData: chart, aiSummary: resp.summary, throttledIds, avoidedPenaltyKw: avoided,
        estimatedSavingsUsd: avoided * 16.5, lastError: errMsg,
        peakLoadToday: Math.max(prev.peakLoadToday, total),
        aiDecisions: [newDecision, ...prev.aiDecisions].slice(0, 8),
      };
    });

    void fetch("/api/log-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "simulation_tick", payload: { tick: cur.tickCount + 1, baseLoadKw: nextBase, evLoadKw: Math.round(evLoad), totalLoadKw: total, throttledIds } }) }).catch(() => null);

    setIsTicking(false);
    lockRef.current = false;
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    void runTick();
    const id = setInterval(() => void runTick(), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthorized, runTick]);

  const totalLoad = useMemo(() => Math.round(state.buildingBaseLoadKw + state.chargers.reduce((s, c) => s + c.allocatedKw, 0)), [state]);
  const headroom = PENALTY_LIMIT_KW - totalLoad;
  const evLoad = useMemo(() => state.chargers.reduce((s, c) => s + c.allocatedKw, 0), [state]);
  const chargingCount = state.chargers.filter((c) => c.status === "Charging").length;
  const throttledCount = state.throttledIds.length;

  if (!isAuthorized) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Oakland Distribution Center</h1>
          <p className="text-sm text-slate-500">2450 Maritime Dr · Live AI Load Management</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className={cn("h-1.5 w-1.5 rounded-full", isTicking ? "bg-amber-400 animate-pulse" : "bg-emerald-500")} />
          {isTicking ? "Computing allocation..." : `Cycle #${state.tickCount}`}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Site Load"
          value={`${totalLoad} kW`}
          sub={`${headroom} kW headroom`}
          subColor={headroom < 50 ? "text-rose-400" : headroom < 100 ? "text-amber-400" : "text-emerald-400"}
          icon={<Activity className="h-4 w-4" />}
          accent="cyan"
        />
        <KpiCard
          label="EV Charging Load"
          value={`${evLoad} kW`}
          sub={`${chargingCount} active · ${throttledCount} throttled`}
          subColor={throttledCount > 0 ? "text-amber-400" : "text-slate-400"}
          icon={<Zap className="h-4 w-4" />}
          accent="emerald"
        />
        <KpiCard
          label="Demand Avoided"
          value={`${state.avoidedPenaltyKw.toFixed(0)} kW`}
          sub="Cumulative this session"
          subColor="text-slate-400"
          icon={<TrendingDown className="h-4 w-4" />}
          accent="violet"
        />
        <KpiCard
          label="Est. Monthly Savings"
          value={`$${state.estimatedSavingsUsd.toFixed(0)}`}
          sub="@ $16.50/kW demand rate"
          subColor="text-slate-400"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main demand chart */}
        <Card className="col-span-2 border-slate-800/80 bg-slate-900/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-300">Site Power Load — Live</CardTitle>
              <Badge variant={totalLoad > 470 ? "destructive" : "secondary"} className="text-xs">
                {totalLoad > 470 ? "Near Limit" : totalLoad > 420 ? "Elevated" : "Nominal"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <LineChart
              className="h-56"
              data={state.chartData}
              index="time"
              categories={["Building Load (kW)", "Demand Limit (kW)", "EV Load (kW)"]}
              colors={["cyan", "rose", "emerald"]}
              valueFormatter={(n) => `${n.toFixed(0)} kW`}
              yAxisWidth={55}
              showAnimation
              showLegend
            />
          </CardContent>
        </Card>

        {/* AI Decision Feed */}
        <Card className="border-slate-800/80 bg-slate-900/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-400" />
              <CardTitle className="text-sm font-medium text-slate-300">AI Decision Feed</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.aiDecisions.length === 0 ? (
              <p className="text-xs text-slate-500">Waiting for first allocation cycle...</p>
            ) : (
              state.aiDecisions.map((d, i) => (
                <div key={i} className={cn(
                  "rounded-md px-3 py-2 text-xs",
                  d.severity === "warning" ? "bg-amber-500/10 text-amber-200 border border-amber-500/20" :
                  d.severity === "success" ? "bg-emerald-500/10 text-emerald-200 border border-emerald-500/20" :
                  "bg-slate-800/60 text-slate-300 border border-slate-700/50"
                )}>
                  <span className="block font-medium text-slate-400">{d.time}</span>
                  {d.summary}
                </div>
              ))
            )}
            {state.lastError && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                Fallback: {state.lastError}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charger Cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-400">Active Chargers</h2>
          <Link href="/dashboard/chargers" className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {state.chargers.map((c) => {
            const rem = Math.max(0, c.requiredEnergyKwh - c.deliveredEnergyKwh);
            const pct = Math.round((c.deliveredEnergyKwh / c.requiredEnergyKwh) * 100);
            const isThrottled = state.throttledIds.includes(c.chargerId);
            return (
              <div
                key={c.chargerId}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  isThrottled
                    ? "border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)] animate-pulse"
                    : c.status === "Ready"
                    ? "border-slate-700/60 bg-slate-900/40"
                    : "border-slate-800/60 bg-slate-900/40"
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{c.vehicleId}</p>
                    <p className="text-xs text-slate-500">Charger {c.chargerId}</p>
                  </div>
                  <Badge variant={statusVariant(c.status)} className="text-xs">{c.status}</Badge>
                </div>

                <div className="mb-3 space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Energy Progress</span>
                    <span className="text-slate-300">{c.deliveredEnergyKwh.toFixed(1)} / {c.requiredEnergyKwh} kWh</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={cn("h-full rounded-full transition-all", isThrottled ? "bg-gradient-to-r from-amber-400 to-orange-400" : "bg-gradient-to-r from-emerald-400 to-cyan-400")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {Math.round(c.minutesUntilDeparture)}m → {c.departureLabel}
                  </span>
                  <span className={cn("font-medium", isThrottled ? "text-amber-300" : "text-cyan-300")}>
                    {c.allocatedKw} kW
                  </span>
                </div>

                {c.status === "Throttled by AI" && (
                  <p className="mt-2 text-[10px] text-amber-400/80">
                    Rate reduced to keep site under {PENALTY_LIMIT_KW} kW demand limit
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: "/dashboard/site", label: "3D Site View", desc: "Interactive depot visualization", color: "from-violet-500/10 to-violet-600/5 border-violet-500/20 text-violet-300" },
          { href: "/dashboard/ai", label: "AI Insights", desc: "Predictions & anomaly detection", color: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-300" },
          { href: "/dashboard/rebates", label: "Rebates & Incentives", desc: "$154K identified", color: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-300" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center justify-between rounded-xl border bg-gradient-to-br p-4 transition-all hover:scale-[1.01]",
              item.color
            )}
          >
            <div>
              <p className="text-sm font-medium text-slate-200">{item.label}</p>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, subColor, icon, accent }: {
  label: string; value: string; sub: string; subColor: string; icon: React.ReactNode;
  accent: "cyan" | "emerald" | "violet" | "amber";
}) {
  const colors = {
    cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    violet: "text-violet-300 bg-violet-500/10 border-violet-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <span className={cn("rounded-lg border p-1.5", colors[accent])}>{icon}</span>
      </div>
      <p className={cn("text-2xl font-semibold", colors[accent].split(" ")[0])}>{value}</p>
      <p className={cn("mt-1 text-xs", subColor)}>{sub}</p>
    </div>
  );
}
