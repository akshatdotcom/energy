"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Activity, AlertTriangle, CheckCircle, XCircle, Clock, Battery, X } from "lucide-react";
import type { ChargerData, ChargerStatus } from "@/components/three/SiteScene";

// ── Dynamic import (no SSR for Three.js) ─────────────────────────────────────

const SiteScene = dynamic(() => import("@/components/three/SiteScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#030712]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
          <Zap className="h-6 w-6 text-emerald-400" />
        </div>
        <p className="text-sm text-slate-500 tracking-widest uppercase">Loading 3D Scene</p>
      </div>
    </div>
  ),
});

// ── Hardcoded initial state (matches DB seed) ─────────────────────────────────

const INITIAL_CHARGERS: ChargerData[] = [
  {
    id: "CH01", name: "Bay 1-A", vendor: "ABB", model: "Terra 184",
    max_kw: 180, status: "charging", position_x: -3.5, position_y: 2,
    current_kw: 142, vehicle_id: "EV-A01", vehicle_name: "Van #A01", soc_pct: 67, departure_time: "7:00 AM",
  },
  {
    id: "CH02", name: "Bay 1-B", vendor: "ChargePoint", model: "CP6000",
    max_kw: 62, status: "charging", position_x: -1.2, position_y: 2,
    current_kw: 48, vehicle_id: "EV-A02", vehicle_name: "Van #A02", soc_pct: 54, departure_time: "7:30 AM",
  },
  {
    id: "CH03", name: "Bay 2-A", vendor: "ABB", model: "Terra 184",
    max_kw: 180, status: "charging", position_x: 1.2, position_y: 2,
    current_kw: 158, vehicle_id: "EV-A05", vehicle_name: "Cargo #A05", soc_pct: 72, departure_time: "7:00 AM",
  },
  {
    id: "CH04", name: "Bay 2-B", vendor: "EVBox", model: "Troniq 100",
    max_kw: 100, status: "throttled", position_x: 3.5, position_y: 2,
    current_kw: 38, vehicle_id: "EV-A07", vehicle_name: "Truck #A07", soc_pct: 61, departure_time: "8:00 AM",
  },
  {
    id: "CH05", name: "Bay 3-A", vendor: "ChargePoint", model: "CP6000",
    max_kw: 62, status: "charging", position_x: -3.5, position_y: -2,
    current_kw: 55, vehicle_id: "EV-A03", vehicle_name: "Van #A03", soc_pct: 83, departure_time: "7:30 AM",
  },
  {
    id: "CH06", name: "Bay 3-B", vendor: "ABB", model: "Terra 184",
    max_kw: 180, status: "available", position_x: -1.2, position_y: -2,
    current_kw: 0, vehicle_id: null, vehicle_name: null, soc_pct: null, departure_time: null,
  },
  {
    id: "CH07", name: "Bay 4-A", vendor: "EVBox", model: "Troniq 100",
    max_kw: 100, status: "charging", position_x: 1.2, position_y: -2,
    current_kw: 88, vehicle_id: "EV-A09", vehicle_name: "Van #A09", soc_pct: 59, departure_time: "8:00 AM",
  },
  {
    id: "CH08", name: "Bay 4-B", vendor: "ChargePoint", model: "CP6000",
    max_kw: 62, status: "faulted", position_x: 3.5, position_y: -2,
    current_kw: 0, vehicle_id: null, vehicle_name: null, soc_pct: null, departure_time: null,
  },
];

const DEMAND_LIMIT_KW = 500;
const BASE_LOAD_KW = 320;

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ChargerStatus, string> = {
  charging: "Charging",
  throttled: "Throttled",
  faulted: "Faulted",
  available: "Available",
};

const STATUS_COLORS: Record<ChargerStatus, string> = {
  charging: "#10b981",
  throttled: "#f59e0b",
  faulted: "#ef4444",
  available: "#475569",
};

const STATUS_BG: Record<ChargerStatus, string> = {
  charging: "bg-emerald-500/10 border-emerald-500/20",
  throttled: "bg-amber-500/10 border-amber-500/20",
  faulted: "bg-red-500/10 border-red-500/20",
  available: "bg-slate-500/10 border-slate-500/20",
};

const STATUS_TEXT: Record<ChargerStatus, string> = {
  charging: "text-emerald-400",
  throttled: "text-amber-400",
  faulted: "text-red-400",
  available: "text-slate-500",
};

const StatusIcon = ({ status }: { status: ChargerStatus }) => {
  if (status === "charging") return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />;
  if (status === "throttled") return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  if (status === "faulted") return <XCircle className="h-3.5 w-3.5 text-red-400" />;
  return <Activity className="h-3.5 w-3.5 text-slate-500" />;
};

// ── Charger Popup ─────────────────────────────────────────────────────────────

function ChargerPopup({ charger, onClose }: { charger: ChargerData; onClose: () => void }) {
  const ratio = charger.current_kw / charger.max_kw;
  const statusBg = STATUS_BG[charger.status];
  const statusText = STATUS_TEXT[charger.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 w-80"
    >
      <div className={`rounded-xl border backdrop-blur-xl bg-slate-950/90 ${statusBg} p-4 shadow-2xl`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <StatusIcon status={charger.status} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${statusText}`}>
                {STATUS_LABELS[charger.status]}
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">{charger.name}</h3>
            <p className="text-xs text-slate-500">{charger.vendor} {charger.model}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Power bar */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500">Power Output</span>
            <span className={`text-xs font-mono font-semibold ${statusText}`}>
              {charger.current_kw} / {charger.max_kw} kW
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ratio * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: STATUS_COLORS[charger.status] }}
            />
          </div>
        </div>

        {/* Vehicle info */}
        {charger.vehicle_id ? (
          <div className="rounded-lg bg-slate-900/60 px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-slate-800 flex items-center justify-center">
                <Zap className="h-3 w-3 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-slate-200">{charger.vehicle_name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {charger.soc_pct !== null && (
                <div className="flex items-center gap-1.5">
                  <Battery className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">
                    <span className="text-emerald-400 font-semibold">{charger.soc_pct}%</span> SoC
                  </span>
                </div>
              )}
              {charger.departure_time && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">
                    Departs <span className="text-slate-300 font-medium">{charger.departure_time}</span>
                  </span>
                </div>
              )}
            </div>
            {/* SoC bar */}
            {charger.soc_pct !== null && (
              <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${charger.soc_pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-slate-900/60 px-3 py-2.5 text-xs text-slate-600 text-center">
            {charger.status === "faulted" ? "Unit offline — service required" : "No vehicle connected"}
          </div>
        )}

        {/* Charger ID */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600">
          <span>ID: <span className="font-mono text-slate-500">{charger.id}</span></span>
          <span className="font-mono text-slate-500">{charger.id}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Demand Gauge Card ─────────────────────────────────────────────────────────

function DemandGaugeCard({ demandKw, limitKw }: { demandKw: number; limitKw: number }) {
  const ratio = Math.min(demandKw / limitKw, 1);
  const isNear = ratio > 0.85;
  const isCritical = ratio > 0.92;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className={`rounded-xl border backdrop-blur-xl bg-slate-950/80 px-4 py-3 shadow-xl
        ${isCritical ? "border-red-500/40" : isNear ? "border-amber-500/30" : "border-slate-700/40"}`}
    >
      <div className="flex items-center gap-3">
        {/* Vertical bar */}
        <div className="relative h-16 w-3 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
          <motion.div
            className="absolute bottom-0 left-0 right-0 rounded-full"
            animate={{ height: `${ratio * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              backgroundColor: isCritical ? "#ef4444" : isNear ? "#f59e0b" : "#10b981",
              boxShadow: `0 0 8px ${isCritical ? "#ef4444" : isNear ? "#f59e0b" : "#10b981"}`,
            }}
          />
          {/* Danger threshold mark */}
          <div
            className="absolute left-0 right-0 h-px bg-red-500/50"
            style={{ bottom: "15%" }}
          />
        </div>

        {/* Numbers */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Site Load</div>
          <div className={`text-xl font-bold font-mono tabular-nums leading-none
            ${isCritical ? "text-red-400" : isNear ? "text-amber-400" : "text-emerald-400"}`}>
            {demandKw}
            <span className="text-sm font-normal text-slate-500 ml-1">kW</span>
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            / {limitKw} kW limit
          </div>
          {/* Mini progress */}
          <div className="mt-1.5 h-1 w-28 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              animate={{ width: `${ratio * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                backgroundColor: isCritical ? "#ef4444" : isNear ? "#f59e0b" : "#10b981",
              }}
            />
          </div>
        </div>
      </div>

      {isCritical && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 flex items-center gap-1.5 text-xs text-red-400"
        >
          <AlertTriangle className="h-3 w-3" />
          Near demand limit
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Stats Row ─────────────────────────────────────────────────────────────────

function StatsRow({ chargers }: { chargers: ChargerData[] }) {
  const counts = chargers.reduce(
    (acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; },
    {} as Record<string, number>
  );
  const totalKw = chargers.reduce((sum, c) => sum + c.current_kw, 0);
  const activeCount = (counts.charging || 0) + (counts.throttled || 0);

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-emerald-400 font-medium">{counts.charging || 0} Charging</span>
      </div>
      {counts.throttled > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-amber-400 font-medium">{counts.throttled} Throttled</span>
        </div>
      )}
      {counts.faulted > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span className="text-red-400 font-medium">{counts.faulted} Faulted</span>
        </div>
      )}
      {counts.available > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
          <span className="text-slate-500 font-medium">{counts.available} Available</span>
        </div>
      )}
      <div className="ml-1 text-slate-500">
        <span className="text-slate-300 font-mono font-semibold">{totalKw}</span> kW active
        <span className="mx-1.5 text-slate-700">·</span>
        <span className="text-slate-300 font-medium">{activeCount}</span> vehicles
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const items: Array<{ status: ChargerStatus; label: string; desc: string }> = [
    { status: "charging", label: "Charging", desc: "Active session" },
    { status: "throttled", label: "Throttled", desc: "AI-limited load" },
    { status: "faulted", label: "Faulted", desc: "Offline / error" },
    { status: "available", label: "Available", desc: "Ready to charge" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex items-center gap-4"
    >
      {items.map(({ status, label, desc }) => (
        <div key={status} className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: STATUS_COLORS[status],
              boxShadow: status !== "available" ? `0 0 6px ${STATUS_COLORS[status]}` : undefined,
            }}
          />
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-xs text-slate-600 hidden sm:inline">{desc}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 ml-2">
        <div className="h-1 w-5 rounded-full bg-emerald-500/60" />
        <span className="text-xs text-slate-500">Energy flow</span>
      </div>
    </motion.div>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function SitePage() {
  const [chargers, setChargers] = useState<ChargerData[]>(INITIAL_CHARGERS);
  const [selectedCharger, setSelectedCharger] = useState<ChargerData | null>(null);

  // Calculate demand (base load + all active charger kW)
  const chargingKw = chargers.reduce((sum, c) => sum + c.current_kw, 0);
  const demandKw = BASE_LOAD_KW + chargingKw;

  // Mini simulation — update charger kW every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setChargers((prev) =>
        prev.map((c) => {
          if (c.status === "available" || c.status === "faulted") return c;
          // Gently vary kW output ±8%
          const variance = 0.92 + Math.random() * 0.16;
          const base = c.status === "throttled" ? c.max_kw * 0.35 : c.max_kw * 0.75;
          const newKw = Math.round(base * variance);
          const newSoc = c.soc_pct !== null ? Math.min(99, c.soc_pct + Math.random() * 0.4) : null;
          return { ...c, current_kw: newKw, soc_pct: newSoc !== null ? Math.round(newSoc) : null };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Try to fetch from API (non-blocking, graceful fallback)
  useEffect(() => {
    fetch("/api/fleet")
      .then((r) => r.json())
      .then((data) => {
        if (!data.chargers) return;
        // Merge API statuses with our initial kW data
        const apiChargerMap = new Map(
          data.chargers
            .filter((c: { site_id: string }) => c.site_id === "site-oak")
            .map((c: { id: string; status: string }) => [c.id, c])
        );
        const apiVehicleMap = new Map(
          (data.vehicles || []).map((v: { charger_id: string | null; id: string; name: string; soc_pct: number; allocated_kw: number; departure_time: string }) => [
            v.charger_id,
            v,
          ])
        );

        setChargers((prev) =>
          prev.map((c) => {
            const apiC = apiChargerMap.get(c.id) as { status?: ChargerStatus } | undefined;
            const apiV = apiVehicleMap.get(c.id) as {
              id: string; name: string; soc_pct: number; allocated_kw: number; departure_time: string;
            } | undefined;
            return {
              ...c,
              status: (apiC?.status as ChargerStatus) ?? c.status,
              current_kw: apiV?.allocated_kw ?? c.current_kw,
              vehicle_id: apiV?.id ?? c.vehicle_id,
              vehicle_name: apiV?.name ?? c.vehicle_name,
              soc_pct: apiV?.soc_pct ?? c.soc_pct,
              departure_time: apiV?.departure_time ?? c.departure_time,
            };
          })
        );
      })
      .catch(() => {
        // Silently fall back to initial data
      });
  }, []);

  const handleChargerClick = useCallback((charger: ChargerData | null) => {
    setSelectedCharger(charger);
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="relative flex flex-col h-screen bg-[#030712] overflow-hidden">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl px-6 py-3"
      >
        {/* Left: site title + live indicator */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-white tracking-tight">
                Oakland Distribution Center
              </h1>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs text-emerald-400 font-medium">Live</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">2450 Maritime Dr, Oakland CA · 8 chargers · 6 vehicles active</p>
          </div>
        </div>

        {/* Right: stats + demand gauge */}
        <div className="flex items-center gap-4">
          <StatsRow chargers={chargers} />
          <DemandGaugeCard demandKw={demandKw} limitKw={DEMAND_LIMIT_KW} />
        </div>
      </motion.div>

      {/* ── 3D Canvas ─────────────────────────────────────────────────────── */}
      <div className="relative flex-1">
        <SiteScene
          chargers={chargers}
          demandKw={demandKw}
          demandLimitKw={DEMAND_LIMIT_KW}
          onChargerClick={handleChargerClick}
          selectedCharger={selectedCharger}
        />

        {/* ── Overlay: top-left corner label ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-4 left-4 z-20"
        >
          <div className="rounded-xl border border-slate-700/40 bg-slate-950/70 backdrop-blur-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">Oakland Distribution Center</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-emerald-400 font-medium">Live</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">{timeStr}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Overlay: hint text ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute top-4 right-4 z-20 text-xs text-slate-600 text-right pointer-events-none"
        >
          <p>Click a charger to inspect</p>
          <p>Drag to orbit · Scroll to zoom</p>
        </motion.div>

        {/* ── Charger Detail Popup ────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedCharger && (
            <ChargerPopup
              charger={selectedCharger}
              onClose={() => setSelectedCharger(null)}
            />
          )}
        </AnimatePresence>

        {/* ── Bottom Legend ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between border-t border-slate-800/40 bg-slate-950/60 backdrop-blur-xl px-6 py-3"
        >
          <Legend />
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>Demand limit: <span className="text-slate-400 font-mono font-semibold">500 kW</span></span>
            <span>Base load: <span className="text-slate-400 font-mono font-semibold">{BASE_LOAD_KW} kW</span></span>
            <span>EV charging: <span className="text-emerald-400 font-mono font-semibold">{chargingKw} kW</span></span>
            <span className="text-slate-700">·</span>
            <span>
              Headroom:{" "}
              <span
                className={`font-mono font-semibold ${
                  DEMAND_LIMIT_KW - demandKw < 30
                    ? "text-red-400"
                    : DEMAND_LIMIT_KW - demandKw < 80
                    ? "text-amber-400"
                    : "text-slate-400"
                }`}
              >
                {DEMAND_LIMIT_KW - demandKw} kW
              </span>
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
