"use client";

import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AreaChart } from "@tremor/react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type Severity = "critical" | "warning" | "info" | "success";
type FilterOption = "All" | "Critical" | "Warning" | "Info";

type AnomalyEvent = {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  timestamp: string;
  why: string;
  charger?: string;
};

type SavingsPoint = {
  day: string;
  "With AeroCharge ($)": number;
  "Without AeroCharge ($)": number;
};

// ── Static data ───────────────────────────────────────────────────────────────

const ANOMALY_EVENTS: AnomalyEvent[] = [
  {
    id: "evt-001",
    severity: "critical",
    title: "CH08 — GFCI Fault, Bay 4-B Offline",
    message: "CH08 (Bay 4-B) — GFCI trip detected. Unit offline 66h. Bay 4-B out of service.",
    timestamp: "Feb 17, 6:15 AM",
    charger: "CH08",
    why: "Ground Fault Circuit Interrupter tripped due to detected leakage current exceeding 5mA threshold. AI immediately reallocated Bay 4-B vehicle queue to CH07 and CH05. Service ticket auto-dispatched to ChargePoint support (ticket #CP-294871). No vehicles stranded.",
  },
  {
    id: "evt-004",
    severity: "warning",
    title: "CH02 — Degraded Cable, 22% Below Rated Capacity",
    message: "CH02 charging 22% below rated capacity. Cable degradation suspected on EV-A02.",
    timestamp: "Feb 18, 11:20 AM",
    charger: "CH02",
    why: "AI detected anomalous resistance increase in charging cable based on voltage-current ratio telemetry. Expected 62 kW delivery but measured 48.4 kW sustained. Pattern matches early-stage CCS connector pin oxidation. AI compensated by extending session window +18 min to ensure full SoC. Physical inspection recommended within 7 days.",
  },
  {
    id: "evt-003",
    severity: "warning",
    title: "Site Load Reached 491 kW — AI Intervened",
    message: "Site load reached 491 kW — 9 kW from penalty threshold. AI rebalanced fleet.",
    timestamp: "Feb 19, 10:15 AM",
    why: "Morning HVAC ramp coincided with peak EV charging window. AI detected load trajectory would breach 500 kW demand limit within 4 minutes. Throttled CH04 from 100 kW → 38 kW and CH07 from 100 kW → 72 kW. Total load reduced to 441 kW. Demand charge of ~$247 avoided. Both vehicles remained on schedule for departure.",
  },
  {
    id: "evt-006",
    severity: "info",
    title: "PG&E Demand Response — $58 Credit Earned",
    message: "PG&E demand response event: reduced fleet 120 kW for 45 min. $58 credit earned.",
    timestamp: "Feb 15, 3:00 PM",
    why: "PG&E issued a grid emergency signal at 2:58 PM requesting load curtailment. AeroCharge auto-curtailed EV fleet by 120 kW over 45 minutes. All vehicles had sufficient SoC buffer to absorb the pause. Demand response credit of $58 was earned and will appear on next billing statement. Program enrollment continues to auto-participate.",
  },
  {
    id: "evt-007",
    severity: "success",
    title: "All 6 Vehicles Charged 18 Min Early",
    message: "All 6 active vehicles fully charged 18 min before departure window. Zero stranded.",
    timestamp: "Feb 20, 6:42 AM",
    why: "AI overnight scheduling shifted 340 kWh of charging to the off-peak midnight–6 AM window. By pre-computing departure times and energy requirements at 11 PM, the AI was able to front-load charging when grid rates are lowest ($0.08/kWh vs $0.32/kWh peak). All vehicles reached target SoC by 6:42 AM, 18 minutes ahead of 7:00 AM earliest departure.",
  },
  {
    id: "evt-005",
    severity: "info",
    title: "AI Pre-Shifted 340 kWh to Off-Peak — Saved $126",
    message: "AI pre-shifted 340 kWh to off-peak window (midnight–6 AM). Estimated savings $126.",
    timestamp: "Feb 18, 2:00 AM",
    why: "Based on departure schedule loaded from fleet management system and weather forecast (cold morning expected — higher HVAC load), AI determined it was optimal to accelerate overnight charging. The $126 savings reflects the difference between off-peak rate ($0.08/kWh) and the on-peak rate ($0.45/kWh) that would have applied if charging had been deferred to morning.",
  },
];

const THROTTLE_STEPS = [
  { step: 1, text: "Building HVAC ramped to 187 kW (morning warmup cycle)", icon: "hvac" },
  { step: 2, text: "Total site load would have reached 503 kW — exceeding 500 kW demand limit by 3 kW", icon: "alert" },
  { step: 3, text: "AI identified CH04 (Truck #A07, departure 9:00 AM) as lowest-urgency active charger", icon: "search" },
  { step: 4, text: "Reduced allocation from 100 kW → 38 kW, bringing total site load to 441 kW", icon: "throttle" },
  { step: 5, text: "Vehicle will still reach 94% SoC by departure — no impact on operations ✓", icon: "check" },
];

function generateSavingsData(): SavingsPoint[] {
  const days = 20;
  const points: SavingsPoint[] = [];
  let withAC = 0;
  let withoutAC = 0;
  for (let d = 1; d <= days; d++) {
    const dailySavingWith = 180 + Math.random() * 80;
    const dailySavingWithout = 40 + Math.random() * 30;
    withAC += dailySavingWith;
    withoutAC += dailySavingWithout;
    points.push({
      day: `Feb ${d}`,
      "With AeroCharge ($)": Math.round(withAC),
      "Without AeroCharge ($)": Math.round(withoutAC),
    });
  }
  return points;
}

const SAVINGS_DATA = generateSavingsData();

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityIcon({ severity, size = "h-4 w-4" }: { severity: Severity; size?: string }) {
  if (severity === "critical") return <XCircle className={cn(size, "text-rose-400")} />;
  if (severity === "warning") return <AlertTriangle className={cn(size, "text-amber-400")} />;
  if (severity === "success") return <CheckCircle2 className={cn(size, "text-emerald-400")} />;
  return <Info className={cn(size, "text-cyan-400")} />;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    critical: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    warning: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    info: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", map[severity])}>
      {severity}
    </span>
  );
}

function AnomalyCard({ event }: { event: AnomalyEvent }) {
  const [expanded, setExpanded] = useState(false);
  const borderMap: Record<Severity, string> = {
    critical: "border-rose-500/30 bg-rose-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
    info: "border-slate-700/60 bg-slate-800/30",
  };
  return (
    <div className={cn("rounded-xl border p-4 transition-all", borderMap[event.severity])}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <SeverityIcon severity={event.severity} size="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <SeverityBadge severity={event.severity} />
            {event.charger && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                {event.charger}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-slate-500">
              <Clock className="h-3 w-3" />
              {event.timestamp}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200 mb-0.5">{event.title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{event.message}</p>
          {expanded && (
            <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-900/60 p-3">
              <p className="text-[10px] font-medium text-violet-400 uppercase tracking-wider mb-1.5">AI Reasoning</p>
              <p className="text-xs text-slate-300 leading-relaxed">{event.why}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-shrink-0 flex items-center gap-1 rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-all"
        >
          Why?
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIInsightsPage() {
  const [filter, setFilter] = useState<FilterOption>("All");
  const [savingsData] = useState<SavingsPoint[]>(SAVINGS_DATA);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => setLastRefresh(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const filteredEvents = ANOMALY_EVENTS.filter((e) => {
    if (filter === "All") return true;
    if (filter === "Critical") return e.severity === "critical";
    if (filter === "Warning") return e.severity === "warning";
    if (filter === "Info") return e.severity === "info" || e.severity === "success";
    return true;
  });

  const predictionCards = [
    {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
      title: "All vehicles ready by 7:15 AM",
      sub: "94% confidence — 6/6 on track",
      badge: "94% confidence",
      badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      glow: "border-emerald-500/20 bg-emerald-500/5",
    },
    {
      icon: <TrendingDown className="h-5 w-5 text-cyan-400" />,
      title: "Peak demand window: 2–4 PM",
      sub: "AI recommends shifting 180 kWh to overnight",
      badge: "Action recommended",
      badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
      glow: "border-cyan-500/20 bg-cyan-500/5",
    },
    {
      icon: <Zap className="h-5 w-5 text-emerald-400" />,
      title: "CH04 Truck #A07: 91% SoC at departure",
      sub: "On track — 9:00 AM departure window",
      badge: "On track",
      badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      glow: "border-slate-800/80 bg-slate-900/60",
    },
    {
      icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
      title: "CH02 Van #A02: degraded cable",
      sub: "78% charge efficiency — inspection needed",
      badge: "78% efficiency",
      badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      glow: "border-amber-500/20 bg-amber-500/5",
    },
  ];

  const perfMetrics = [
    { label: "Throttle events this month", value: "127", sub: "avg 4.2/day", color: "text-cyan-300" },
    { label: "Zero stranded vehicles", value: "30/30", sub: "days perfect", color: "text-emerald-300" },
    { label: "Avg. headroom maintained", value: "47 kW", sub: "above demand limit", color: "text-violet-300" },
    { label: "AI vs heuristic savings", value: "+34%", sub: "improvement", color: "text-amber-300" },
  ];

  const filterOptions: FilterOption[] = ["All", "Critical", "Warning", "Info"];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── A. Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-slate-100">AI Insights</h1>
            <span className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-300">
              <Sparkles className="h-3 w-3" />
              Powered by Gemini
            </span>
          </div>
          <p className="text-sm text-slate-500">Real-time predictions, anomaly detection &amp; load optimization reasoning</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live · refreshed {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* ── B. Prediction Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {predictionCards.map((card, i) => (
          <div
            key={i}
            className={cn("rounded-xl border p-4 transition-all", card.glow)}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex-shrink-0">{card.icon}</div>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", card.badgeColor)}>
                {card.badge}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-100 leading-snug mb-1">{card.title}</p>
            <p className="text-xs text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── C. Anomaly Detection Timeline ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-medium text-slate-200">Anomalies &amp; Detections</h2>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
              {ANOMALY_EVENTS.length} events
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 p-1">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all",
                  filter === opt
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <AnomalyCard key={event.id} event={event} />
          ))}
          {filteredEvents.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">No events match the selected filter.</p>
          )}
        </div>
      </div>

      {/* ── D. Throttle Explainer ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-900/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30">
              <Search className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">&ldquo;Why was I throttled?&rdquo;</p>
              <p className="text-xs text-slate-500">Forensic trace — CH04 · Bay 2-B · Today 5:32 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
              100 kW → 38 kW
            </span>
            <span className="rounded-full border border-slate-700/60 bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
              Throttled
            </span>
          </div>
        </div>

        <div className="p-5">
          {/* Vehicle summary */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Vehicle", value: "Truck #A07" },
              { label: "Charger", value: "CH04 (Bay 2-B)" },
              { label: "Departure", value: "9:00 AM" },
              { label: "Projected SoC", value: "94% ✓" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-medium text-slate-100 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Step-by-step reasoning */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">AI Decision Trace</p>
            <div className="relative space-y-0">
              {THROTTLE_STEPS.map((step, i) => {
                const isLast = i === THROTTLE_STEPS.length - 1;
                const iconColors: Record<string, string> = {
                  hvac: "bg-blue-500/15 border-blue-500/30 text-blue-400",
                  alert: "bg-rose-500/15 border-rose-500/30 text-rose-400",
                  search: "bg-violet-500/15 border-violet-500/30 text-violet-400",
                  throttle: "bg-amber-500/15 border-amber-500/30 text-amber-400",
                  check: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
                };
                const icons: Record<string, React.ReactNode> = {
                  hvac: <Zap className="h-3.5 w-3.5" />,
                  alert: <AlertTriangle className="h-3.5 w-3.5" />,
                  search: <Search className="h-3.5 w-3.5" />,
                  throttle: <TrendingDown className="h-3.5 w-3.5" />,
                  check: <CheckCircle2 className="h-3.5 w-3.5" />,
                };
                return (
                  <div key={step.step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border", iconColors[step.icon])}>
                        {icons[step.icon]}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-slate-700/60 my-1" />}
                    </div>
                    <div className={cn("pb-4 pt-0.5", isLast && "pb-0")}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                          Step {step.step}
                        </span>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outcome banner */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-300">
              <span className="font-medium">Outcome: </span>
              Site held at 441 kW — demand charge of ~$247 avoided. Truck #A07 on schedule for 9:00 AM departure at 94% SoC.
            </p>
          </div>
        </div>
      </div>

      {/* ── E. Monthly Savings Trajectory ─────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-medium text-slate-200">Monthly Savings Trajectory</h2>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-emerald-400 inline-block" />
              With AeroCharge
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-sm bg-slate-600 inline-block" />
              Without AeroCharge
            </span>
          </div>
        </div>
        <AreaChart
          className="h-52"
          data={savingsData}
          index="day"
          categories={["With AeroCharge ($)", "Without AeroCharge ($)"]}
          colors={["emerald", "slate"]}
          valueFormatter={(n) => `$${n.toLocaleString()}`}
          yAxisWidth={65}
          showAnimation
          showLegend={false}
          showGradient
          curveType="monotone"
        />
        <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
          <span className="text-xs text-slate-400">Cumulative savings gap (Feb 1–20)</span>
          <span className="text-sm font-semibold text-emerald-300">
            +${(savingsData[savingsData.length - 1]?.["With AeroCharge ($)"] - savingsData[savingsData.length - 1]?.["Without AeroCharge ($)"]).toLocaleString()} saved
          </span>
        </div>
      </div>

      {/* ── F. AI Performance Metrics ─────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-medium text-slate-400">AI Performance Metrics — February</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {perfMetrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500 mb-3 leading-snug">{m.label}</p>
              <p className={cn("text-2xl font-semibold", m.color)}>{m.value}</p>
              <p className="text-xs text-slate-500 mt-1">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
