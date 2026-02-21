"use client";

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Leaf,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type RebateStatus = "claimed" | "active" | "pending" | "eligible";
type RebateType = "utility" | "vehicle" | "infrastructure" | "carbon" | "rate";

type Rebate = {
  id: string;
  program_name: string;
  provider: string;
  amount_usd: number;
  status: RebateStatus;
  type: RebateType;
  description: string;
  deadline: string | null;
  applied_at: string | null;
  site_name?: string;
};

type RebateSummary = {
  totalClaimed: number;
  totalActive: number;
  totalEligible: number;
  totalPending: number;
};

type ApiResponse = {
  rebates: Rebate[];
  summary: RebateSummary;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number, suffix?: string) {
  return `$${n.toLocaleString()}${suffix ?? ""}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Config maps ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RebateStatus, { badge: string; dot: string; label: string }> = {
  claimed: { badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400", label: "Claimed" },
  active: { badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30", dot: "bg-cyan-400", label: "Active" },
  pending: { badge: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400", label: "Pending Review" },
  eligible: { badge: "bg-violet-500/15 text-violet-300 border-violet-500/30", dot: "bg-violet-400", label: "Eligible" },
};

const TYPE_STYLES: Record<RebateType, { bg: string; text: string; label: string }> = {
  utility: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "Utility" },
  vehicle: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Vehicle" },
  infrastructure: { bg: "bg-violet-500/10", text: "text-violet-400", label: "Infrastructure" },
  carbon: { bg: "bg-teal-500/10", text: "text-teal-400", label: "Carbon Credits" },
  rate: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Rate Program" },
};

const TYPE_ICON: Record<RebateType, React.ReactNode> = {
  utility: <Zap className="h-3 w-3" />,
  vehicle: <ArrowRight className="h-3 w-3" />,
  infrastructure: <ExternalLink className="h-3 w-3" />,
  carbon: <Leaf className="h-3 w-3" />,
  rate: <DollarSign className="h-3 w-3" />,
};

const AMOUNT_COLOR: Record<RebateStatus, string> = {
  claimed: "text-emerald-300",
  active: "text-cyan-300",
  pending: "text-amber-300",
  eligible: "text-violet-300",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-slate-800", className)} />;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Rebate Card ───────────────────────────────────────────────────────────────

function RebateCard({ rebate }: { rebate: Rebate }) {
  const st = STATUS_STYLES[rebate.status];
  const ty = TYPE_STYLES[rebate.type as RebateType] ?? TYPE_STYLES.infrastructure;
  const amtColor = AMOUNT_COLOR[rebate.status];
  const isRecurring = rebate.status === "active";

  const cardBorder =
    rebate.status === "claimed" ? "border-emerald-500/15" :
    rebate.status === "active" ? "border-cyan-500/15" :
    rebate.status === "pending" ? "border-amber-500/15" :
    "border-violet-500/15";

  return (
    <div className={cn("rounded-xl border bg-slate-900/60 p-5 flex flex-col gap-3 transition-all hover:bg-slate-900/90", cardBorder)}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 leading-snug">{rebate.program_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn("flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", ty.bg, ty.text)}>
              {TYPE_ICON[rebate.type as RebateType]}
              {ty.label}
            </span>
            <span className="text-[10px] text-slate-500">{rebate.provider}</span>
          </div>
        </div>
        <span className={cn("flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium flex items-center gap-1", st.badge)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
          {st.label}
        </span>
      </div>

      {/* Amount */}
      <div>
        <p className={cn("text-2xl font-semibold", amtColor)}>
          {formatCurrency(rebate.amount_usd, isRecurring ? "/year" : "")}
        </p>
        {isRecurring && (
          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <RefreshCw className="h-2.5 w-2.5" />
            Ongoing annual benefit
          </p>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{rebate.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-slate-800/60">
        <div className="text-xs text-slate-500">
          {rebate.status === "claimed" && rebate.applied_at && (
            <span className="flex items-center gap-1 text-emerald-400/80">
              <CheckCircle2 className="h-3 w-3" />
              Claimed {formatDate(rebate.applied_at)}
            </span>
          )}
          {rebate.status === "active" && rebate.applied_at && (
            <span className="flex items-center gap-1 text-cyan-400/80">
              <Clock className="h-3 w-3" />
              Active since {formatDate(rebate.applied_at)}
            </span>
          )}
          {rebate.status === "pending" && (
            <span className="flex items-center gap-1 text-amber-400/80">
              <AlertTriangle className="h-3 w-3" />
              Under review
            </span>
          )}
          {rebate.deadline && rebate.status === "eligible" && (
            <span className="flex items-center gap-1 text-violet-400/80">
              <Calendar className="h-3 w-3" />
              Deadline {formatDate(rebate.deadline)}
            </span>
          )}
        </div>
        {rebate.status === "eligible" ? (
          <button className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300 hover:bg-violet-500/20 transition-colors">
            Apply Now
          </button>
        ) : (
          <button className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            View Details
          </button>
        )}
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, accent, icon,
}: {
  label: string; value: string; sub: string; accent: string; icon: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    cyan: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20",
    amber: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    violet: "text-violet-300 bg-violet-500/10 border-violet-500/20",
  };
  const c = colorMap[accent];
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">{label}</p>
        <span className={cn("rounded-lg border p-1.5", c)}>{icon}</span>
      </div>
      <p className={cn("text-2xl font-semibold", c.split(" ")[0])}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RebatesPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function fetchData() {
    try {
      const res = await fetch("/api/rebates");
      if (res.ok) {
        const json = await res.json() as ApiResponse;
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
    void fetchData();
    const id = setInterval(() => void fetchData(), 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <LoadingSkeleton />;

  const rebates: Rebate[] = data?.rebates ?? [];
  const summary = data?.summary ?? { totalClaimed: 79000, totalActive: 50400, totalPending: 25000, totalEligible: 23500 };

  const eligibleRebates = rebates.filter((r) => r.status === "eligible");

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── A. Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Rebates &amp; Incentives</h1>
          <p className="text-sm text-slate-500">Track, claim, and optimize your incentive portfolio</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* ── B. Summary KPI Banner ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Claimed"
          value={formatCurrency(summary.totalClaimed)}
          sub="Successfully received"
          accent="emerald"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <KpiCard
          label="Active (Annual)"
          value={formatCurrency(summary.totalActive) + "/yr"}
          sub="Ongoing programs"
          accent="cyan"
          icon={<RefreshCw className="h-4 w-4" />}
        />
        <KpiCard
          label="Pending Review"
          value={formatCurrency(summary.totalPending)}
          sub="Awaiting approval"
          accent="amber"
          icon={<Clock className="h-4 w-4" />}
        />
        <KpiCard
          label="Eligible — Not Applied"
          value={formatCurrency(summary.totalEligible)}
          sub="Potential uncaptured value"
          accent="violet"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* ── C. Rebate Cards Grid ──────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-400">All Programs ({rebates.length})</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {rebates.map((r) => (
            <RebateCard key={r.id} rebate={r} />
          ))}
        </div>
      </div>

      {/* ── D. Demand Response Section ────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-medium text-slate-200">Demand Response Programs</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Enrollment status */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-200">PG&amp;E Demand Response</p>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Enrolled
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Auto-curtailment enabled — AeroCharge automatically participates in grid events and earns credits on your behalf.</p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-medium">$412 earned since enrollment</span>
            </div>
          </div>

          {/* Recent events */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Recent Events</p>
            {[
              {
                date: "Feb 15, 3:00 PM",
                action: "Curtailed 120 kW for 45 min",
                credit: "$58 credit",
                color: "border-cyan-500/20 bg-cyan-500/5",
                textColor: "text-cyan-300",
              },
              {
                date: "Jan 28, 4:15 PM",
                action: "Curtailed 95 kW for 30 min",
                credit: "$41 credit",
                color: "border-slate-700/60 bg-slate-800/30",
                textColor: "text-slate-300",
              },
              {
                date: "Jan 14, 5:00 PM",
                action: "Curtailed 140 kW for 60 min",
                credit: "$89 credit",
                color: "border-slate-700/60 bg-slate-800/30",
                textColor: "text-slate-300",
              },
            ].map((ev, i) => (
              <div key={i} className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5", ev.color)}>
                <div>
                  <p className="text-xs font-medium text-slate-200">{ev.action}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {ev.date}
                  </p>
                </div>
                <span className={cn("text-xs font-semibold", ev.textColor)}>{ev.credit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── E. Uncaptured Value Callout ───────────────────────────────────── */}
      {eligibleRebates.length > 0 && (
        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-violet-600/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/15">
                <DollarSign className="h-4 w-4 text-violet-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Uncaptured Value Detected</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  You qualify for {eligibleRebates.length} program{eligibleRebates.length !== 1 ? "s" : ""} you have not applied for yet —{" "}
                  <span className="font-medium text-violet-300">{formatCurrency(summary.totalEligible)} potential</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {eligibleRebates.map((r) => (
                    <span key={r.id} className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-300">
                      {r.program_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button className="flex-shrink-0 flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/30 transition-all">
              Start Application Process
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
