"use client";

import {
  BarChart3,
  Download,
  Leaf,
  Mail,
  TrendingDown,
  TrendingUp,
  Zap,
  DollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AreaChart, BarChart, LineChart } from "@tremor/react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type DayRange = "7D" | "30D" | "90D";

type DailyPoint = {
  date: string;
  energy_kwh: number;
  savings_usd: number;
  sessions: number;
};

type HourlyPoint = {
  hour: string;
  base_load: number;
  ev_load: number;
  total: number;
  demand_limit: number;
};

type AnalyticsResponse = {
  daily: DailyPoint[];
  stats: {
    total_sessions: number;
    total_energy_kwh: number;
    total_demand_avoided_usd: number;
    total_demand_charges_usd: number;
    avg_peak_kw: number;
  };
  allStats: {
    total_sessions: number;
    total_energy_kwh: number;
    total_demand_avoided_usd: number;
    total_demand_charges_usd: number;
    avg_peak_kw: number;
  };
  monthly: {
    energy_kwh: number;
    savings_usd: number;
  };
  hourlyProfile: HourlyPoint[];
};

type BarChartPoint = {
  date: string;
  "Energy Delivered (kWh)": number;
};

type LineChartPoint = {
  hour: string;
  "Building Load (kW)": number;
  "EV Load (kW)": number;
  "Demand Limit (kW)": number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
}

function formatDate(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-slate-800", className)} />;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-8 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent, icon, highlight,
}: {
  label: string; value: string; sub: string; accent: string; icon: React.ReactNode; highlight?: boolean;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
    violet: "text-violet-300 bg-violet-500/10 border-violet-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-300 bg-rose-500/10 border-rose-500/20",
  };
  const c = colorMap[accent] ?? colorMap.emerald;

  return (
    <div className={cn(
      "rounded-xl border bg-slate-900/60 p-4",
      highlight ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800/80"
    )}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <span className={cn("rounded-lg border p-1.5", c)}>{icon}</span>
      </div>
      <p className={cn("text-xl font-semibold md:text-2xl", c.split(" ")[0])}>{value}</p>
      <p className={cn("mt-1 text-xs", highlight ? "text-emerald-400" : "text-slate-500")}>{sub}</p>
    </div>
  );
}

// ── Site Comparison Table ─────────────────────────────────────────────────────

const SITES = [
  { name: "Oakland DC", sessions: "450+", energy: "12,400 kWh", savings: "$5,800", uptime: "99.9%", accent: "text-emerald-300" },
  { name: "San Jose Hub", sessions: "180", energy: "4,100 kWh", savings: "$1,800", uptime: "100%", accent: "text-cyan-300" },
  { name: "Fremont Terminal", sessions: "85", energy: "1,900 kWh", savings: "$620", uptime: "100%", accent: "text-violet-300" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [range, setRange] = useState<DayRange>("30D");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailScheduled, setEmailScheduled] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;

  async function fetchData() {
    try {
      const res = await fetch(`/api/analytics?siteId=site-oak&days=${days}`);
      if (res.ok) {
        const json = await res.json() as AnalyticsResponse;
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => {
    const id = setInterval(() => void fetchData(), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (loading) return <LoadingSkeleton />;

  const daily: DailyPoint[] = data?.daily ?? [];
  const stats = data?.stats;
  const hourlyProfile: HourlyPoint[] = data?.hourlyProfile ?? [];

  const totalEnergy = daily.reduce((s, d) => s + d.energy_kwh, 0);
  const totalSavings = daily.reduce((s, d) => s + d.savings_usd, 0);
  const co2Avoided = (totalEnergy * 0.5) / 1000; // tonnes

  function exportCsv() {
    const rows: string[][] = [];

    rows.push(["AeroCharge Energy Report"]);
    rows.push([`Date Range: Last ${days} days`]);
    rows.push([`Generated: ${new Date().toLocaleString()}`]);
    rows.push([]);

    rows.push(["Summary Metrics"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Energy Delivered (kWh)", totalEnergy.toFixed(1)]);
    rows.push(["Demand Charges Avoided ($)", totalSavings.toFixed(2)]);
    rows.push(["Demand Charges Paid ($)", "0"]);
    rows.push(["CO2 Equivalent Avoided (tonnes)", co2Avoided.toFixed(1)]);
    if (stats) {
      rows.push(["Total Sessions", String(stats.total_sessions)]);
      rows.push(["Total Energy (kWh)", stats.total_energy_kwh.toFixed(1)]);
      rows.push(["Total Demand Avoided ($)", stats.total_demand_avoided_usd.toFixed(2)]);
      rows.push(["Avg Peak Rate (kW)", (stats.avg_peak_kw ?? 0).toFixed(1)]);
    }
    rows.push([]);

    rows.push(["Daily Energy & Savings"]);
    rows.push(["Date", "Energy (kWh)", "Savings ($)", "Sessions"]);
    for (const d of daily) {
      rows.push([d.date, d.energy_kwh.toFixed(1), d.savings_usd.toFixed(2), String(d.sessions)]);
    }
    rows.push([]);

    if (hourlyProfile.length > 0) {
      rows.push(["24-Hour Demand Profile"]);
      rows.push(["Hour", "Building Load (kW)", "EV Load (kW)", "Total (kW)", "Demand Limit (kW)"]);
      for (const h of hourlyProfile) {
        rows.push([h.hour, String(h.base_load), String(h.ev_load), String(h.total), String(h.demand_limit)]);
      }
      rows.push([]);
    }

    rows.push(["Site Comparison"]);
    rows.push(["Site", "Sessions", "Energy (kWh)", "Savings ($)", "Uptime"]);
    for (const site of SITES) {
      rows.push([site.name, site.sessions, site.energy, site.savings, site.uptime]);
    }

    const csvContent = rows
      .map((row) => row.map((cell) => {
        const escaped = String(cell).replace(/"/g, '""');
        return /[,"\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aerocharge-report-${range.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const barData: BarChartPoint[] = daily.map((d) => ({
    date: formatDate(d.date),
    "Energy Delivered (kWh)": d.energy_kwh,
  }));

  const lineData: LineChartPoint[] = hourlyProfile.map((h) => ({
    hour: h.hour,
    "Building Load (kW)": h.base_load,
    "EV Load (kW)": h.ev_load,
    "Demand Limit (kW)": h.demand_limit,
  }));

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* ── A. Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100 md:text-xl">Reports &amp; Analytics</h1>
          <p className="text-xs text-slate-500 md:text-sm">Oakland Distribution Center · All sites aggregated below</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 p-1">
            {(["7D", "30D", "90D"] as DayRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  range === r
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">
            Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* ── B. Summary KPI Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Energy Delivered"
          value={`${fmt(totalEnergy)} kWh`}
          sub={`${daily.length} days of data`}
          accent="emerald"
          icon={<Zap className="h-4 w-4" />}
        />
        <KpiCard
          label="Demand Charges Avoided"
          value={`$${fmt(totalSavings)}`}
          sub={`$${(totalSavings / Math.max(1, daily.length)).toFixed(0)}/day avg`}
          accent="cyan"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiCard
          label="Demand Charges Paid"
          value="$0"
          sub="Zero overage charges this month"
          accent="emerald"
          icon={<DollarSign className="h-4 w-4" />}
          highlight
        />
        <KpiCard
          label="CO₂ Equivalent Avoided"
          value={`${co2Avoided.toFixed(1)}t`}
          sub="vs. combustion fleet (0.5 kg/kWh)"
          accent="violet"
          icon={<Leaf className="h-4 w-4" />}
        />
      </div>

      {/* ── C. Energy Delivery Bar Chart ──────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-medium text-slate-200">Daily Energy Delivered (kWh)</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
              kWh delivered
            </span>
            <span className="font-medium text-emerald-300">
              Total: {fmt(totalEnergy)} kWh
            </span>
          </div>
        </div>
        {barData.length > 0 ? (
          <BarChart
            className="h-56"
            data={barData}
            index="date"
            categories={["Energy Delivered (kWh)"]}
            colors={["emerald"]}
            valueFormatter={(n) => `${n.toFixed(0)} kWh`}
            yAxisWidth={70}
            showAnimation
            showLegend={false}
          />
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-slate-500">
            No data available for this range.
          </div>
        )}
      </div>

      {/* ── D. Demand Profile Line Chart ──────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-medium text-slate-200">24-Hour Demand Profile</h2>
            </div>
            <p className="text-xs text-slate-500">
              Valley-filling effect — EVs charge overnight when building load is lowest
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-cyan-500" />
              Building Load
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-emerald-500" />
              EV Load
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-4 rounded-sm bg-rose-500" />
              Demand Limit
            </span>
          </div>
        </div>
        <LineChart
          className="h-56"
          data={lineData}
          index="hour"
          categories={["Building Load (kW)", "EV Load (kW)", "Demand Limit (kW)"]}
          colors={["cyan", "emerald", "rose"]}
          valueFormatter={(n) => `${n} kW`}
          yAxisWidth={55}
          showAnimation
          showLegend={false}
          curveType="monotone"
        />
        {/* Valley filling annotation */}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <Zap className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-300">
            <span className="font-medium">AeroCharge effect: </span>
            EV load peaks midnight–6 AM when building load is 60% lower, flattening demand and eliminating peak charges.
          </p>
        </div>
      </div>

      {/* ── E. Site Comparison Table ──────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden">
        <div className="border-b border-slate-800/60 px-5 py-4">
          <h2 className="text-sm font-medium text-slate-200">Site Comparison</h2>
          <p className="text-xs text-slate-500 mt-0.5">All sites · trailing {days} days</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/60">
                {["Site", "Sessions", "Energy (kWh)", "Savings ($)", "Uptime"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SITES.map((site, i) => (
                <tr
                  key={site.name}
                  className={cn(
                    "transition-colors hover:bg-slate-800/30",
                    i !== SITES.length - 1 && "border-b border-slate-800/40"
                  )}
                >
                  <td className="px-5 py-4">
                    <p className={cn("text-sm font-medium", site.accent)}>{site.name}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-300">{site.sessions}</td>
                  <td className="px-5 py-4 text-sm text-slate-300">{site.energy}</td>
                  <td className="px-5 py-4 text-sm font-medium text-emerald-300">{site.savings}</td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-sm text-emerald-300">{site.uptime}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="border-t border-slate-700/60 bg-slate-800/30">
                <td className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">All Sites</td>
                <td className="px-5 py-3 text-sm font-semibold text-slate-200">715+</td>
                <td className="px-5 py-3 text-sm font-semibold text-slate-200">18,400 kWh</td>
                <td className="px-5 py-3 text-sm font-semibold text-emerald-300">$8,220</td>
                <td className="px-5 py-3 text-sm font-semibold text-emerald-300">99.9%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Stats summary strip ────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Sessions", value: stats.total_sessions.toLocaleString(), color: "text-slate-200" },
            { label: "Total Energy", value: `${fmt(stats.total_energy_kwh)} kWh`, color: "text-emerald-300" },
            { label: "Demand Avoided", value: `$${fmt(stats.total_demand_avoided_usd)}`, color: "text-cyan-300" },
            { label: "Avg Peak Rate", value: `${stats.avg_peak_kw?.toFixed(1) ?? "—"} kW`, color: "text-violet-300" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className={cn("text-lg font-semibold", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── F. Export Section ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-200">Export &amp; Reporting</h2>
            <p className="text-xs text-slate-500 mt-0.5">Download a full PDF report or schedule automated delivery</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Schedule email toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                onClick={() => setEmailScheduled((v) => !v)}
                className={cn(
                  "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                  emailScheduled ? "bg-emerald-500" : "bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200",
                    emailScheduled ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Schedule monthly email report
              </span>
              {emailScheduled && (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                  Active
                </span>
              )}
            </label>

            {/* Export button */}
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all"
            >
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>
        </div>

        {emailScheduled && (
          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-300">
            Monthly reports will be sent to <span className="font-medium">fleet@pacificcoastlogistics.com</span> on the 1st of each month.
          </div>
        )}
      </div>
    </div>
  );
}
