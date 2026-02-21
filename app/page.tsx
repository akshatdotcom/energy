"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Zap,
  Menu,
  X,
  ArrowRight,
  Brain,
  Cpu,
  ShieldAlert,
  DollarSign,
  LayoutDashboard,
  Plug,
  Building2,
  Truck,
  Home,
  Coffee,
  ChevronRight,
  TrendingDown,
  Activity,
  Globe,
  Check,
} from "lucide-react";
import { AnimatedChart } from "@/components/landing/AnimatedChart";

// ─── Utility ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function Counter({
  target,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: 2200, bounce: 0 });

  useEffect(() => {
    if (inView) motionVal.set(target);
  }, [inView, motionVal, target]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent =
          prefix + v.toFixed(decimals) + suffix;
      }
    });
  }, [spring, prefix, suffix, decimals]);

  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

// ─── Animated grid background ─────────────────────────────────────────────────

function GridBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 64 0 L 0 0 0 64"
              fill="none"
              stroke="rgba(148,163,184,0.045)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Radial glow spots */}
      <div className="absolute left-[10%] top-[15%] h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute right-[5%] top-[5%] h-80 w-80 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="absolute bottom-[10%] right-[20%] h-72 w-72 rounded-full bg-violet-500/8 blur-3xl" />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Product", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#" },
  { label: "Company", href: "#" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-slate-800/80 bg-[#030712]/90 backdrop-blur-xl shadow-lg shadow-black/20"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30 group-hover:bg-emerald-500/25 transition-colors">
            <Zap className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-100">
            AeroCharge
          </span>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-100"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-100 px-3 py-2 rounded-md hover:bg-slate-800/60"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-400 active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            Book a Demo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800/60 md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-slate-800/80 bg-[#030712]/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-slate-800/60">
              <Link
                href="/login"
                className="rounded-md px-4 py-2.5 text-sm font-medium text-slate-300 text-center hover:bg-slate-800/60"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
                onClick={() => setMobileOpen(false)}
              >
                Book a Demo
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── Hero section ─────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
      <GridBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 md:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-12 items-center">
          {/* Left: copy */}
          <div className="flex flex-col items-start gap-6">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Link
                href="#features"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/8 px-3.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Now with AI Anomaly Detection
                <ChevronRight className="h-3.5 w-3.5 opacity-70" />
              </Link>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="text-3xl font-bold leading-[1.08] tracking-tight text-slate-50 sm:text-5xl md:text-6xl lg:text-7xl"
            >
              Stop paying{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  for peaks.
                </span>
                <span
                  className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-emerald-400/60 to-cyan-400/60"
                  aria-hidden="true"
                />
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="max-w-xl text-lg leading-relaxed text-slate-400 md:text-xl"
            >
              AeroCharge AI monitors your fleet 24/7, dynamically allocating
              charge across every vehicle to{" "}
              <span className="text-slate-200 font-medium">
                eliminate demand spikes before they hit your bill.
              </span>
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className="flex flex-wrap items-center gap-3"
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-xl shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30 active:scale-[0.98]"
              >
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-800/50 px-6 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition-all hover:border-slate-600 hover:bg-slate-700/50 active:scale-[0.98]"
              >
                See Live Dashboard
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </motion.div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
              className="text-xs text-slate-500 leading-relaxed"
            >
              No setup required{" "}
              <span className="mx-1.5 text-slate-700">·</span> Works with any
              OCPP charger{" "}
              <span className="mx-1.5 text-slate-700">·</span> 99.94% uptime
            </motion.p>
          </div>

          {/* Right: animated chart */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            {/* Glow behind chart */}
            <div className="absolute -inset-4 rounded-3xl bg-emerald-500/5 blur-2xl" aria-hidden="true" />
            <AnimatedChart />

            {/* Floating stat chips */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="absolute -right-2 -top-4 rounded-xl border border-emerald-500/30 bg-slate-900/90 px-3 py-2 backdrop-blur-sm shadow-xl"
            >
              <p className="text-xs text-slate-400">Demand avoided</p>
              <p className="text-lg font-bold text-emerald-400">- $18,400</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 1.0 }}
              className="absolute -bottom-4 -left-2 rounded-xl border border-cyan-500/30 bg-slate-900/90 px-3 py-2 backdrop-blur-sm shadow-xl"
            >
              <p className="text-xs text-slate-400">Allocation cycle</p>
              <p className="text-lg font-bold text-cyan-400">5 sec</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#030712] to-transparent"
        aria-hidden="true"
      />
    </section>
  );
}

// ─── Logo strip ───────────────────────────────────────────────────────────────

const CUSTOMERS = [
  "Republic Services",
  "Purolator",
  "City of Seattle",
  "ABM Industries",
  "Swift Transportation",
  "Loblaws",
];

function LogoStrip() {
  return (
    <section className="border-y border-slate-800/60 bg-slate-900/30 py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
          Trusted by fleet operators across North America
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {CUSTOMERS.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold tracking-wide text-slate-600 transition-colors hover:text-slate-400"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Problem section ──────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    stat: "30–50%",
    label: "of your electricity bill is demand charges",
    detail:
      "Most commercial operators are shocked to discover demand charges — not energy consumption — dominate their utility bills.",
  },
  {
    stat: "1 spike",
    label: "is all it takes to reset your monthly peak",
    detail:
      "Each unmanaged charger pulling full power simultaneously creates a load spike that sets the highest demand reading for the entire billing month.",
  },
  {
    stat: "15 min",
    label: "is your riskiest window every morning",
    detail:
      "Utilities penalize the single highest 15-minute interval of the month. Fleet plug-in time is when you're most exposed.",
  },
];

function ProblemBars() {
  // Simple bar chart showing naive vs managed peak
  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 backdrop-blur">
      <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Peak Demand — 6:00 AM Morning Charge Cycle
      </p>
      <div className="space-y-5">
        {/* Naive bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Without AeroCharge</span>
            <span className="font-bold text-rose-400">847 kW</span>
          </div>
          <div className="h-10 overflow-hidden rounded-lg bg-slate-800/70">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
              className="h-full rounded-lg bg-gradient-to-r from-rose-600 to-rose-400 flex items-center justify-end pr-3"
            >
              <span className="text-xs font-bold text-rose-100">+347 kW OVER LIMIT</span>
            </motion.div>
          </div>
        </div>

        {/* Threshold indicator */}
        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 border-t border-dashed border-rose-500/50" />
          <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            500 kW Demand Limit
          </span>
          <div className="h-px flex-1 border-t border-dashed border-rose-500/50" />
        </div>

        {/* AeroCharge bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">With AeroCharge</span>
            <span className="font-bold text-emerald-400">467 kW</span>
          </div>
          <div className="h-10 overflow-hidden rounded-lg bg-slate-800/70">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "55.2%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
              className="h-full rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-400 flex items-center justify-end pr-3"
            >
              <span className="text-xs font-bold text-emerald-100">UNDER LIMIT</span>
            </motion.div>
          </div>
        </div>

        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
          <span className="font-bold">$6,237 saved</span> on this single
          morning. Across 22 charge cycles a month, that compounds fast.
        </p>
      </div>
    </div>
  );
}

function ProblemSection() {
  return (
    <section id="problem" className="relative py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            The problem
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
            The hidden cost of EV fleets
          </h2>
          <p className="text-lg text-slate-400">
            Adding EVs to your fleet is good for the planet. But without smart
            load management, every charger you add puts your electricity bill at
            risk.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {/* Problem cards */}
          <div className="space-y-4">
            {PROBLEMS.map((item, i) => (
              <motion.div
                key={item.stat}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-xl border border-slate-800/70 bg-slate-900/60 p-5 backdrop-blur transition-all hover:border-slate-700/80 hover:bg-slate-900/80"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex-shrink-0 rounded-lg border border-rose-500/20 bg-rose-500/8 px-2.5 py-1">
                    <span className="text-lg font-bold text-rose-400">
                      {item.stat}
                    </span>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-slate-100">
                      {item.label}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5"
            >
              <p className="text-sm leading-relaxed text-violet-300">
                <span className="font-bold text-violet-200">The math is brutal:</span>{" "}
                A 10-charger fleet where each charger pulls 150 kW simultaneously
                generates a 1,500 kW peak. At $15/kW demand charge that is{" "}
                <span className="font-bold">$22,500 per month</span> — before a
                single kWh of energy is billed.
              </p>
            </motion.div>
          </div>

          {/* Visual comparison */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <ProblemBars />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Features section ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    title: "AI Load Allocation",
    description:
      "Predicts departure times and allocates power with millisecond precision. Handles partial states of charge, priority overrides, and real-time grid events.",
    accent: "emerald",
  },
  {
    icon: Cpu,
    title: "Onsite Controller",
    description:
      "Real software runs at your site, talking directly to chargers via OCPP. No cloud dependency for real-time decisions — keeps working even if the internet drops.",
    accent: "cyan",
  },
  {
    icon: ShieldAlert,
    title: "Anomaly Detection",
    description:
      "Spots degraded cables, stuck chargers, and unusual draw before they cost you. Alerts surface in the dashboard and can trigger automated throttling.",
    accent: "violet",
  },
  {
    icon: DollarSign,
    title: "Rebate Management",
    description:
      "Tracks every utility incentive and demand-response program you qualify for. Automatically signals availability windows so you capture every dollar.",
    accent: "amber",
  },
  {
    icon: LayoutDashboard,
    title: "Multi-Site Dashboard",
    description:
      "Unified view across all depots, sites, and charger networks. Drill down from portfolio to charger level in seconds. Role-based access for ops teams.",
    accent: "cyan",
  },
  {
    icon: Plug,
    title: "API & Integrations",
    description:
      "REST API, webhooks, and native integrations with fleet management systems including Samsara, Geotab, and Fleetio. Your data, your workflow.",
    accent: "emerald",
  },
];

const accentMap: Record<string, string> = {
  emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

const accentHover: Record<string, string> = {
  emerald: "group-hover:border-emerald-500/40 group-hover:shadow-emerald-500/10",
  cyan: "group-hover:border-cyan-500/40 group-hover:shadow-cyan-500/10",
  violet: "group-hover:border-violet-500/40 group-hover:shadow-violet-500/10",
  amber: "group-hover:border-amber-500/40 group-hover:shadow-amber-500/10",
};

function FeaturesSection() {
  return (
    <section id="features" className="relative py-28">
      {/* Section glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Platform
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
            Everything you need to run
            <br className="hidden md:block" />
            a smarter fleet
          </h2>
          <p className="mx-auto max-w-xl text-lg text-slate-400">
            Built for commercial fleet operators who cannot afford downtime,
            surprise bills, or another tool that requires a PhD to configure.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
                className={cn(
                  "group relative rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 backdrop-blur",
                  "transition-all duration-300 hover:bg-slate-900/80 hover:shadow-xl",
                  accentHover[feature.accent]
                )}
              >
                {/* Gradient border top accent on hover */}
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-px rounded-t-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                    feature.accent === "emerald" && "bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent",
                    feature.accent === "cyan" && "bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent",
                    feature.accent === "violet" && "bg-gradient-to-r from-transparent via-violet-500/60 to-transparent",
                    feature.accent === "amber" && "bg-gradient-to-r from-transparent via-amber-500/60 to-transparent",
                  )}
                  aria-hidden="true"
                />

                <div
                  className={cn(
                    "mb-4 inline-flex rounded-xl border p-2.5",
                    accentMap[feature.accent]
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>

                <h3 className="mb-2 font-semibold tracking-tight text-slate-100">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Stats section ────────────────────────────────────────────────────────────

const STATS = [
  { prefix: "$", target: 2.3, suffix: "M+", label: "Demand charges avoided", decimals: 1 },
  { prefix: "", target: 340, suffix: "+", label: "Commercial sites", decimals: 0 },
  { prefix: "", target: 4800, suffix: "+", label: "Chargers managed", decimals: 0 },
  { prefix: "", target: 99.94, suffix: "%", label: "Platform uptime", decimals: 2 },
];

function StatsSection() {
  return (
    <section className="relative overflow-hidden border-y border-slate-800/60 bg-slate-900/40 py-20">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute left-[15%] top-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute right-[15%] top-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-cyan-500/8 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="mb-1 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
                <Counter
                  target={stat.target}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  decimals={stat.decimals}
                />
              </div>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    icon: Plug,
    title: "Connect your chargers",
    detail:
      "OCPP or vendor API — we support all major networks. Takes less than 1 hour from sign-up to data flowing.",
    accent: "emerald",
  },
  {
    number: "02",
    icon: Activity,
    title: "Set your demand limit",
    detail:
      "One number from your utility bill. That is it. AeroCharge handles the rest — no complex tariff configuration required.",
    accent: "cyan",
  },
  {
    number: "03",
    icon: Brain,
    title: "AI handles the rest",
    detail:
      "Real-time allocation every 5 seconds. Departures, battery states, and building load all factor in automatically.",
    accent: "violet",
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Getting started
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
            Up and running in an afternoon
          </h2>
          <p className="mx-auto max-w-xl text-lg text-slate-400">
            No hardware. No electrician visit. No six-week onboarding.
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Connector line (desktop) */}
          <div
            className="pointer-events-none absolute left-0 right-0 top-[2.75rem] hidden h-px md:block"
            style={{
              background:
                "linear-gradient(to right, transparent, rgba(16,185,129,0.3) 20%, rgba(6,182,212,0.3) 50%, rgba(139,92,246,0.3) 80%, transparent)",
            }}
            aria-hidden="true"
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step circle */}
                <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-slate-700 bg-slate-900 shadow-lg">
                  <Icon
                    className={cn(
                      "h-6 w-6",
                      step.accent === "emerald" && "text-emerald-400",
                      step.accent === "cyan" && "text-cyan-400",
                      step.accent === "violet" && "text-violet-400"
                    )}
                    strokeWidth={1.75}
                  />
                  {/* Step number badge */}
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 ring-1 ring-slate-700">
                    {i + 1}
                  </span>
                </div>

                <h3 className="mb-3 text-lg font-semibold tracking-tight text-slate-100">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-400 max-w-xs">
                  {step.detail}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Solutions grid ───────────────────────────────────────────────────────────

const SOLUTIONS = [
  {
    icon: Truck,
    title: "Fleet Depots",
    subtitle: "For commercial & municipal fleets",
    bullets: [
      "Manage 10–500+ chargers from one dashboard",
      "Departure-time-aware allocation engine",
      "Automated utility rebate tracking",
    ],
    accent: "emerald",
  },
  {
    icon: Building2,
    title: "Multifamily Properties",
    subtitle: "For apartment & condo operators",
    bullets: [
      "Per-unit billing and allocation controls",
      "Shared infrastructure peak shaving",
      "Resident mobile app integration",
    ],
    accent: "cyan",
  },
  {
    icon: Home,
    title: "Workplace Charging",
    subtitle: "For office & campus operators",
    bullets: [
      "Employee priority scheduling",
      "Cost-allocation reporting by employee or department",
      "Integrates with HR & fleet systems",
    ],
    accent: "violet",
  },
  {
    icon: Coffee,
    title: "Hospitality & Retail",
    subtitle: "For hotels, malls & destinations",
    bullets: [
      "Guest experience with seamless check-in/out",
      "Revenue-positive pricing controls",
      "Branded customer-facing app",
    ],
    accent: "amber",
  },
];

function SolutionsSection() {
  return (
    <section id="solutions" className="relative py-28">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-400">
            Solutions
          </p>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
            Built for every use case
          </h2>
          <p className="mx-auto max-w-xl text-lg text-slate-400">
            Whether you run ten vans or five hundred chargers across a national
            network, AeroCharge scales to your operation.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {SOLUTIONS.map((sol, i) => {
            const Icon = sol.icon;
            return (
              <motion.div
                key={sol.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={cn(
                  "group rounded-2xl border border-slate-800/70 bg-slate-900/50 p-6 backdrop-blur",
                  "transition-all duration-300 hover:bg-slate-900/80 hover:shadow-xl",
                  accentHover[sol.accent]
                )}
              >
                <div
                  className={cn(
                    "mb-4 inline-flex rounded-xl border p-2.5",
                    accentMap[sol.accent]
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="mb-1 font-semibold tracking-tight text-slate-100">
                  {sol.title}
                </h3>
                <p className="mb-4 text-xs text-slate-500">{sol.subtitle}</p>
                <ul className="space-y-2">
                  {sol.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-400">
                      <Check
                        className={cn(
                          "mt-0.5 h-3.5 w-3.5 flex-shrink-0",
                          sol.accent === "emerald" && "text-emerald-400",
                          sol.accent === "cyan" && "text-cyan-400",
                          sol.accent === "violet" && "text-violet-400",
                          sol.accent === "amber" && "text-amber-400"
                        )}
                        strokeWidth={2.5}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

function TestimonialSection() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-4xl px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.65 }}
          className="relative rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 backdrop-blur sm:p-10 md:p-14"
        >
          {/* Background glow */}
          <div
            className="pointer-events-none absolute -inset-px rounded-3xl opacity-30"
            style={{
              background:
                "radial-gradient(circle at 30% 50%, rgba(16,185,129,0.12), transparent 60%), radial-gradient(circle at 70% 50%, rgba(6,182,212,0.1), transparent 60%)",
            }}
            aria-hidden="true"
          />

          {/* Quote mark */}
          <div
            className="mb-6 text-7xl font-serif leading-none text-emerald-500/25 select-none"
            aria-hidden="true"
          >
            &ldquo;
          </div>

          <blockquote className="relative mb-8 text-base font-medium leading-relaxed text-slate-100 sm:text-xl md:text-2xl md:leading-relaxed">
            We were paying $18,000/month in demand charges at our Oakland depot.
            AeroCharge brought it down to{" "}
            <span className="text-emerald-400 font-semibold">
              $2,400 in the first month
            </span>
            — without changing how we operate the fleet.
          </blockquote>

          <div className="flex items-center gap-4">
            {/* Avatar placeholder */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-500/20 text-lg font-bold text-emerald-300">
              MT
            </div>
            <div>
              <p className="font-semibold text-slate-100">Marcus Thompson</p>
              <p className="text-sm text-slate-400">
                Director of Fleet Operations, Pacific Coast Logistics
              </p>
            </div>

            {/* Savings chip */}
            <div className="ml-auto hidden items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-2 md:flex">
              <TrendingDown className="h-5 w-5 text-emerald-400" />
              <div className="text-right">
                <p className="text-xs text-slate-400">Monthly savings</p>
                <p className="text-lg font-bold text-emerald-400">$15,600</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.18) 0%, rgba(6,182,212,0.08) 50%, transparent 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto max-w-4xl px-4 text-center md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl md:text-5xl">
            Ready to eliminate demand charges?
          </h2>
          <p className="mb-10 text-lg text-slate-400">
            Join 340+ operators saving an average of $8,400/month.
            Get started in under an hour.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-8 py-3.5 text-base font-semibold text-emerald-950 shadow-2xl shadow-emerald-500/30 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/40 active:scale-[0.98]"
            >
              Book a Demo
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-800/50 px-8 py-3.5 text-base font-semibold text-slate-200 backdrop-blur transition-all hover:border-slate-600 hover:bg-slate-700/50 active:scale-[0.98]"
            >
              View Live Dashboard
              <Globe className="h-5 w-5 text-slate-400" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      "Overview",
      "Fleet",
      "Multifamily",
      "Workplace",
      "AI Insights",
    ],
  },
  {
    title: "Resources",
    links: [
      "Documentation",
      "API Reference",
      "Status Page",
      "Blog",
    ],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Press", "Contact"],
  },
  {
    title: "Legal",
    links: [
      "Privacy Policy",
      "Terms of Service",
      "Security",
    ],
  },
];

function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        {/* Top: logo + columns */}
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <Zap className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-slate-100">AeroCharge</span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-500 max-w-[180px]">
              AI-powered EV fleet load management. Built for operators who
              cannot afford surprises.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800/60 pt-8 text-xs text-slate-500 md:flex-row">
          <p>2026 AeroCharge. All rights reserved.</p>
          <p>Backed by CRV, Accel, Comma Capital</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      <Navbar />
      <HeroSection />
      <LogoStrip />
      <ProblemSection />
      <FeaturesSection />
      <StatsSection />
      <HowItWorksSection />
      <SolutionsSection />
      <TestimonialSection />
      <CtaBanner />
      <Footer />
    </div>
  );
}
