"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  Truck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wifi,
  WifiOff,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChargerStatus = "charging" | "throttled" | "available" | "faulted";

type ChargerData = {
  id: string;
  site_id: string;
  name: string;
  vendor: string;
  model: string;
  max_kw: number;
  connector_type: string;
  status: ChargerStatus;
  last_heartbeat: string | null;
  site_name: string;
  city: string;
};

type VehicleAssignment = {
  charger_id: string;
  vehicle_name: string;
  driver_name: string;
  allocated_kw: number;
  soc_pct: number;
};

type SiteData = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  demand_limit_kw: number;
  base_load_kw: number;
  charger_count: number;
  vehicle_count: number;
  active_sessions: number;
  faulted_chargers: number;
  stats: {
    total_sessions: number;
    total_energy_kwh: number;
    total_demand_avoided_usd: number;
  };
};

type StatusFilter = "all" | ChargerStatus;

// ── Static Vehicle Assignments ────────────────────────────────────────────────

const VEHICLE_ASSIGNMENTS: VehicleAssignment[] = [
  { charger_id: "CH01", vehicle_name: "Van #A01", driver_name: "Marcus Thompson", allocated_kw: 120, soc_pct: 62 },
  { charger_id: "CH02", vehicle_name: "Van #A02", driver_name: "Sarah Lin", allocated_kw: 48, soc_pct: 44 },
  { charger_id: "CH03", vehicle_name: "Cargo #A05", driver_name: "Carlos Rivera", allocated_kw: 80, soc_pct: 51 },
  { charger_id: "CH04", vehicle_name: "Truck #A07", driver_name: "David Chen", allocated_kw: 38, soc_pct: 33 },
  { charger_id: "CH05", vehicle_name: "Van #A03", driver_name: "James Kowalski", allocated_kw: 62, soc_pct: 75 },
  { charger_id: "CH07", vehicle_name: "Van #A09", driver_name: "Robert Johnson", allocated_kw: 55, soc_pct: 47 },
  { charger_id: "CH09", vehicle_name: "SJ Van #B01", driver_name: "Wei Zhang", allocated_kw: 40, soc_pct: 58 },
  { charger_id: "CH11", vehicle_name: "SJ Truck #B03", driver_name: "Kevin Park", allocated_kw: 65, soc_pct: 39 },
  { charger_id: "CH12", vehicle_name: "SJ Van #B02", driver_name: "Angela Torres", allocated_kw: 7, soc_pct: 82 },
  { charger_id: "CH13", vehicle_name: "FR Van #C01", driver_name: "Miguel Santos", allocated_kw: 42, soc_pct: 55 },
  { charger_id: "CH15", vehicle_name: "FR Van #C02", driver_name: "Rachel Kim", allocated_kw: 7, soc_pct: 71 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(isoString: string | null): string {
  if (!isoString) return "Unknown";
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function statusConfig(status: ChargerStatus) {
  switch (status) {
    case "charging":
      return {
        label: "Charging",
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        dot: "bg-emerald-400",
        card: "border-slate-800/60 bg-slate-900/60",
        icon: <Zap className="h-3.5 w-3.5 text-emerald-400" />,
      };
    case "throttled":
      return {
        label: "Throttled",
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
        dot: "bg-amber-400 animate-pulse",
        card: "border-amber-500/30 bg-amber-500/5",
        icon: <Zap className="h-3.5 w-3.5 text-amber-400" />,
      };
    case "available":
      return {
        label: "Available",
        badge: "bg-slate-700/60 text-slate-300 border-slate-600/40",
        dot: "bg-slate-400",
        card: "border-slate-800/60 bg-slate-900/60",
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />,
      };
    case "faulted":
      return {
        label: "Faulted",
        badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
        dot: "bg-rose-500",
        card: "border-rose-500/40 bg-rose-500/5",
        icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />,
      };
  }
}

function formatLastUpdated(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChargerSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-4 w-20 rounded bg-slate-800" />
          <div className="h-3 w-32 rounded bg-slate-800" />
        </div>
        <div className="h-5 w-16 rounded-full bg-slate-800" />
      </div>
      <div className="h-3 w-28 rounded bg-slate-800" />
      <div className="h-1.5 w-full rounded-full bg-slate-800" />
      <div className="flex justify-between">
        <div className="h-3 w-20 rounded bg-slate-800" />
        <div className="h-3 w-16 rounded bg-slate-800" />
      </div>
    </div>
  );
}

// ── Site Summary Card ─────────────────────────────────────────────────────────

function SiteSummaryCard({ site, currentLoad }: { site: SiteData; currentLoad: number }) {
  const usagePct = Math.min(100, Math.round((currentLoad / site.demand_limit_kw) * 100));
  const barColor =
    usagePct >= 90 ? "bg-rose-500" : usagePct >= 75 ? "bg-amber-400" : "bg-emerald-500";
  const textColor =
    usagePct >= 90 ? "text-rose-400" : usagePct >= 75 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <Building2 className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">{site.name}</p>
            <p className="text-xs text-slate-500">{site.address}, {site.city}, {site.state}</p>
          </div>
        </div>
        {site.faulted_chargers > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300">
            <AlertTriangle className="h-3 w-3" />
            {site.faulted_chargers} fault
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-slate-800/40 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-slate-100">{site.charger_count}</p>
          <p className="text-xs text-slate-500">Chargers</p>
        </div>
        <div className="rounded-lg bg-slate-800/40 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-emerald-300">{site.active_sessions}</p>
          <p className="text-xs text-slate-500">Active</p>
        </div>
        <div className="rounded-lg bg-slate-800/40 px-3 py-2 text-center">
          <p className={cn("text-lg font-semibold", site.faulted_chargers > 0 ? "text-rose-400" : "text-slate-400")}>
            {site.faulted_chargers}
          </p>
          <p className="text-xs text-slate-500">Faulted</p>
        </div>
      </div>

      {/* Demand bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Demand Load</span>
          <span className={cn("font-medium", textColor)}>
            {currentLoad} / {site.demand_limit_kw} kW ({usagePct}%)
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Charger Card ──────────────────────────────────────────────────────────────

function ChargerCard({ charger }: { charger: ChargerData }) {
  const sc = statusConfig(charger.status);
  const assignment = VEHICLE_ASSIGNMENTS.find((a) => a.charger_id === charger.id);
  const isFaulted = charger.status === "faulted";
  const isThrottled = charger.status === "throttled";
  const isCharging = charger.status === "charging" || charger.status === "throttled";

  const heartbeatAge = charger.last_heartbeat
    ? Date.now() - new Date(charger.last_heartbeat).getTime()
    : Infinity;
  const heartbeatFresh = heartbeatAge < 60_000;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all flex flex-col gap-3",
        sc.card,
        isThrottled && "shadow-[0_0_20px_rgba(245,158,11,0.08)]",
        isFaulted && "shadow-[0_0_20px_rgba(244,63,94,0.08)]"
      )}
    >
      {/* Fault banner */}
      {isFaulted && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-rose-400" />
          <p className="text-xs text-rose-300">
            Fault detected 66h ago — GFCI trip. Service required.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border",
            isFaulted ? "bg-rose-500/10 border-rose-500/30" :
            isThrottled ? "bg-amber-500/10 border-amber-500/30" :
            charger.status === "charging" ? "bg-emerald-500/10 border-emerald-500/30" :
            "bg-slate-800/60 border-slate-700/50"
          )}>
            {sc.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-100">{charger.id}</p>
              <span className="text-slate-600 text-xs">·</span>
              <p className="text-xs font-medium text-slate-400">{charger.name}</p>
            </div>
            <p className="text-xs text-slate-600">{charger.vendor} {charger.model}</p>
          </div>
        </div>
        <span className={cn(
          "inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          sc.badge
        )}>
          <span className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
          {sc.label}
        </span>
      </div>

      {/* Specs row */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 rounded-md bg-slate-800/60 px-2 py-1 text-xs text-slate-400">
          <Zap className="h-3 w-3 text-cyan-500" />
          {charger.max_kw} kW max
        </span>
        <span className="rounded-md bg-slate-800/60 px-2 py-1 text-xs text-slate-400">
          {charger.connector_type}
        </span>
      </div>

      {/* Vehicle assignment (if active) */}
      {isCharging && assignment && (
        <div className={cn(
          "rounded-lg border px-3 py-2.5 space-y-2",
          isThrottled
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-slate-700/50 bg-slate-800/40"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Truck className="h-3 w-3 text-slate-500" />
              <p className="text-xs font-medium text-slate-200">{assignment.vehicle_name}</p>
            </div>
            <span className={cn(
              "text-xs font-bold",
              isThrottled ? "text-amber-300" : "text-emerald-300"
            )}>
              {assignment.allocated_kw} kW
            </span>
          </div>
          <p className="text-xs text-slate-500">{assignment.driver_name}</p>
          {/* SoC progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600">SoC</span>
              <span className={cn(
                "font-medium",
                assignment.soc_pct >= 80 ? "text-emerald-400" :
                assignment.soc_pct >= 40 ? "text-amber-400" : "text-rose-400"
              )}>
                {assignment.soc_pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  assignment.soc_pct >= 80 ? "bg-emerald-500" :
                  assignment.soc_pct >= 40 ? "bg-amber-400" : "bg-rose-500"
                )}
                style={{ width: `${assignment.soc_pct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-800/40">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          {heartbeatFresh ? (
            <Wifi className="h-3 w-3 text-emerald-600" />
          ) : (
            <WifiOff className="h-3 w-3 text-slate-600" />
          )}
          <span>{relativeTime(charger.last_heartbeat)}</span>
        </div>
        <span className="text-xs text-slate-600">{charger.city}</span>
      </div>
    </div>
  );
}

// ── Status Filter Bar ─────────────────────────────────────────────────────────

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "charging", label: "Charging" },
  { key: "available", label: "Available" },
  { key: "throttled", label: "Throttled" },
  { key: "faulted", label: "Faulted" },
];

// ── Site current loads (derived from assignments) ─────────────────────────────

const SITE_LOADS: Record<string, number> = {
  "site-oak": 332 + VEHICLE_ASSIGNMENTS.filter((a) =>
    ["CH01","CH02","CH03","CH04","CH05","CH07","CH08"].includes(a.charger_id)
  ).reduce((s, a) => s + a.allocated_kw, 0),
  "site-sj": 210 + VEHICLE_ASSIGNMENTS.filter((a) =>
    ["CH09","CH10","CH11","CH12"].includes(a.charger_id)
  ).reduce((s, a) => s + a.allocated_kw, 0),
  "site-frem": 160 + VEHICLE_ASSIGNMENTS.filter((a) =>
    ["CH13","CH14","CH15"].includes(a.charger_id)
  ).reduce((s, a) => s + a.allocated_kw, 0),
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChargersPage() {
  const [chargers, setChargers] = useState<ChargerData[]>([]);
  const [sites, setSites] = useState<SiteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [fleetRes, sitesRes] = await Promise.all([
        fetch("/api/fleet"),
        fetch("/api/sites"),
      ]);
      const fleetData = await fleetRes.json();
      const sitesData = await sitesRes.json();
      setChargers(fleetData.chargers ?? []);
      setSites(sitesData ?? []);
      setLastUpdated(new Date());
    } catch {
      // Keep stale data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(), 10_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const filteredChargers = chargers.filter((c) =>
    statusFilter === "all" || c.status === statusFilter
  );

  // Count by status
  const counts = {
    all: chargers.length,
    charging: chargers.filter((c) => c.status === "charging").length,
    available: chargers.filter((c) => c.status === "available").length,
    throttled: chargers.filter((c) => c.status === "throttled").length,
    faulted: chargers.filter((c) => c.status === "faulted").length,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Chargers &amp; Sites</h1>
          <p className="text-sm text-slate-500">
            {chargers.length} chargers across 3 sites · Pacific Coast Logistics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400 transition-all hover:border-slate-600 hover:text-slate-200",
              refreshing && "opacity-60 cursor-not-allowed"
            )}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Site Summary Cards */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Site Overview</h2>
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-xl border border-slate-800/60 bg-slate-900/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {sites.map((site) => (
              <SiteSummaryCard
                key={site.id}
                site={site}
                currentLoad={SITE_LOADS[site.id] ?? site.base_load_kw}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status Filter + Charger Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-xl border border-slate-800/60 bg-slate-900/40 p-1">
          <Filter className="ml-2 h-3 w-3 text-slate-600" />
          {STATUS_FILTERS.map(({ key, label }) => {
            const count = counts[key];
            const hasFault = key === "faulted" && count > 0;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                  statusFilter === key
                    ? key === "faulted"
                      ? "bg-rose-500/20 text-rose-300"
                      : key === "throttled"
                      ? "bg-amber-500/20 text-amber-300"
                      : key === "charging"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-700/60 text-slate-200"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  statusFilter === key ? "bg-white/10" : "bg-slate-800 text-slate-500",
                  hasFault && "text-rose-400"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <span className="text-xs text-slate-500">
          {filteredChargers.length} charger{filteredChargers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Charger Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <ChargerSkeleton key={i} />)}
        </div>
      ) : filteredChargers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/40 py-20">
          <CheckCircle2 className="h-8 w-8 text-slate-700" />
          <p className="text-sm text-slate-500">No chargers match this filter</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredChargers.map((charger) => (
            <ChargerCard key={charger.id} charger={charger} />
          ))}
        </div>
      )}

      {/* Live indicator footer */}
      {!loading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-slate-600">Live · auto-refreshes every 10 seconds</span>
        </div>
      )}
    </div>
  );
}
