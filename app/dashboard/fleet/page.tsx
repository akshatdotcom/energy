"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Truck,
  Battery,
  Clock,
  User,
  Building2,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type VehicleRow = {
  id: string;
  site_id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  battery_kwh: number;
  driver_name: string;
  license_plate: string;
  site_name: string;
  city: string;
  soc_pct: number;
  status: "charging" | "throttled" | "ready" | "idle";
  charger_id: string | null;
  allocated_kw: number;
  departure_time: string;
  minutes_to_departure: number;
  kwh_remaining: number;
};

type SiteTab = "all" | string;

// ── Helpers ───────────────────────────────────────────────────────────────────

function socColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-400";
  return "bg-rose-500";
}

function socTrackColor(pct: number) {
  if (pct >= 80) return "shadow-[0_0_6px_rgba(16,185,129,0.35)]";
  if (pct >= 40) return "shadow-[0_0_6px_rgba(245,158,11,0.35)]";
  return "shadow-[0_0_6px_rgba(244,63,94,0.35)]";
}

function statusConfig(status: VehicleRow["status"]) {
  switch (status) {
    case "charging":
      return {
        label: "Charging",
        dot: "bg-emerald-400",
        badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      };
    case "throttled":
      return {
        label: "Throttled",
        dot: "bg-amber-400 animate-pulse",
        badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    case "ready":
      return {
        label: "Ready",
        dot: "bg-slate-400",
        badge: "bg-slate-700/60 text-slate-300 border-slate-600/40",
      };
    default:
      return {
        label: "Idle",
        dot: "bg-slate-600",
        badge: "bg-slate-800/60 text-slate-500 border-slate-700/30",
      };
  }
}

function relativeMinutes(mins: number) {
  if (mins <= 0) return "Departed";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatLastUpdated(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="grid min-w-[900px] grid-cols-[2fr_1fr_1fr_1.5fr_1fr_0.8fr_1fr_0.8fr] items-center gap-4 px-4 py-3.5 border-b border-slate-800/50">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-4 rounded-md bg-slate-800 animate-pulse" style={{ width: i === 3 ? "100%" : `${60 + (i * 17) % 40}%` }} />
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  accent: "emerald" | "cyan" | "amber" | "slate";
}) {
  const accentMap = {
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    slate: "text-slate-300 bg-slate-700/40 border-slate-600/30",
  };
  const textColor = accentMap[accent].split(" ")[0];
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <span className={cn("rounded-lg border p-1.5", accentMap[accent])}>{icon}</span>
      </div>
      <p className={cn("text-xl font-semibold md:text-2xl", textColor)}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

// ── Column Header ─────────────────────────────────────────────────────────────

type SortKey = "name" | "driver_name" | "site_name" | "soc_pct" | "status" | "allocated_kw" | "minutes_to_departure";

function ColHeader({
  label,
  sortKey,
  currentSort,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  direction: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = currentSort === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors",
        active ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
      )}
    >
      {label}
      {active ? (
        direction === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const SITE_TABS = [
  { key: "all", label: "All Sites" },
  { key: "site-oak", label: "Oakland DC" },
  { key: "site-sj", label: "San Jose Hub" },
  { key: "site-frem", label: "Fremont Terminal" },
];

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SiteTab>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/fleet");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setVehicles(data.vehicles ?? []);
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = vehicles.filter((v) => activeTab === "all" || v.site_id === activeTab);

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  // KPIs
  const total = vehicles.length;
  const charging = vehicles.filter((v) => v.status === "charging").length;
  const throttled = vehicles.filter((v) => v.status === "throttled").length;
  const ready = vehicles.filter((v) => v.status === "ready").length;

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 md:text-xl">Fleet Management</h1>
          <p className="text-xs text-slate-500 md:text-sm">All vehicles across all sites · Pacific Coast Logistics</p>
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

      {/* Site Filter Tabs */}
      <div className="flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-900/40 p-1 sm:w-fit">
        {SITE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-shrink-0 whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-emerald-500/20 text-emerald-300 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Vehicles"
          value={total}
          sub="Across all sites"
          icon={<Truck className="h-4 w-4" />}
          accent="cyan"
        />
        <KpiCard
          label="Currently Charging"
          value={charging}
          sub={`${Math.round((charging / Math.max(total, 1)) * 100)}% of fleet active`}
          icon={<Zap className="h-4 w-4" />}
          accent="emerald"
        />
        <KpiCard
          label="Throttled"
          value={throttled}
          sub={throttled > 0 ? "AI demand management active" : "No throttling active"}
          icon={<Battery className="h-4 w-4" />}
          accent={throttled > 0 ? "amber" : "slate"}
        />
        <KpiCard
          label="Fully Charged / Ready"
          value={ready}
          sub="Available for dispatch"
          icon={<Building2 className="h-4 w-4" />}
          accent="slate"
        />
      </div>

      {/* Vehicle Table */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
        {/* Table Header */}
        <div className="grid min-w-[900px] grid-cols-[2fr_1fr_1fr_1.5fr_1fr_0.8fr_1fr_0.8fr] items-center gap-4 border-b border-slate-800/70 bg-slate-900/80 px-4 py-2.5">
          <ColHeader label="Vehicle" sortKey="name" currentSort={sortKey} direction={sortDir} onSort={handleSort} />
          <ColHeader label="Driver" sortKey="driver_name" currentSort={sortKey} direction={sortDir} onSort={handleSort} />
          <ColHeader label="Site" sortKey="site_name" currentSort={sortKey} direction={sortDir} onSort={handleSort} />
          <ColHeader label="Battery / SoC" sortKey="soc_pct" currentSort={sortKey} direction={sortDir} onSort={handleSort} />
          <ColHeader label="Status" sortKey="status" currentSort={sortKey} direction={sortDir} onSort={handleSort} />
          <ColHeader label="Rate" sortKey="allocated_kw" currentSort={sortKey} direction={sortDir} onSort={handleSort} />
          <ColHeader label="Departure" sortKey="minutes_to_departure" currentSort={sortKey} direction={sortDir} onSort={handleSort} />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">VIN</span>
        </div>

        {/* Table Body */}
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Truck className="h-8 w-8 text-slate-700" />
            <p className="text-sm text-slate-500">No vehicles found for this site</p>
          </div>
        ) : (
          sorted.map((v, idx) => {
            const sc = statusConfig(v.status);
            return (
              <div
                key={v.id}
                className={cn(
                  "group grid min-w-[900px] grid-cols-[2fr_1fr_1fr_1.5fr_1fr_0.8fr_1fr_0.8fr] items-center gap-4 px-4 py-3.5 transition-all cursor-default",
                  idx < sorted.length - 1 && "border-b border-slate-800/50",
                  "hover:bg-slate-800/40"
                )}
              >
                {/* Vehicle */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn("mt-0.5 h-2 w-2 flex-shrink-0 rounded-full", sc.dot)} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{v.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {v.make} {v.model} · {v.year}
                    </p>
                  </div>
                </div>

                {/* Driver */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="h-3 w-3 flex-shrink-0 text-slate-600" />
                  <p className="truncate text-xs text-slate-400">{v.driver_name}</p>
                </div>

                {/* Site */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="h-3 w-3 flex-shrink-0 text-slate-600" />
                  <p className="truncate text-xs text-slate-400">{v.city}</p>
                </div>

                {/* Battery / SoC */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn(
                      "font-semibold",
                      v.soc_pct >= 80 ? "text-emerald-400" : v.soc_pct >= 40 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {v.soc_pct}%
                    </span>
                    <span className="text-slate-600">{v.kwh_remaining} kWh left</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        socColor(v.soc_pct),
                        socTrackColor(v.soc_pct)
                      )}
                      style={{ width: `${v.soc_pct}%` }}
                    />
                  </div>
                </div>

                {/* Status badge */}
                <div>
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    sc.badge
                  )}>
                    {sc.label}
                  </span>
                </div>

                {/* Rate */}
                <div>
                  {v.allocated_kw > 0 ? (
                    <div className="flex items-center gap-1">
                      <Zap className={cn(
                        "h-3 w-3",
                        v.status === "throttled" ? "text-amber-400" : "text-emerald-400"
                      )} />
                      <span className={cn(
                        "text-sm font-semibold",
                        v.status === "throttled" ? "text-amber-300" : "text-emerald-300"
                      )}>
                        {v.allocated_kw}
                      </span>
                      <span className="text-xs text-slate-600">kW</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </div>

                {/* Departure */}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 flex-shrink-0 text-slate-600" />
                  <div>
                    <p className="text-xs text-slate-300">{v.departure_time}</p>
                    <p className={cn(
                      "text-xs",
                      v.minutes_to_departure <= 30 ? "text-rose-400" :
                      v.minutes_to_departure <= 60 ? "text-amber-400" : "text-slate-500"
                    )}>
                      {relativeMinutes(v.minutes_to_departure)}
                    </p>
                  </div>
                </div>

                {/* VIN */}
                <div>
                  <span className="font-mono text-[10px] text-slate-600 group-hover:text-slate-500 transition-colors">
                    ···{v.vin.slice(-6)}
                  </span>
                </div>
              </div>
            );
          })
        )}

        </div>{/* end overflow-x-auto */}

        {/* Table Footer */}
        {!loading && sorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-800/50 bg-slate-900/40 px-4 py-2">
            <span className="text-xs text-slate-600">
              Showing {sorted.length} of {vehicles.length} vehicles
            </span>
            <div className="flex items-center gap-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs text-emerald-500">Live · auto-refresh 10s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
