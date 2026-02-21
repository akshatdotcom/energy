"use client";

import { useEffect, useRef, useState } from "react";

// Animated SVG demand chart showing AI load management in action
// Phase 1 (0-40%): load climbs toward the threshold
// Phase 2 (40-60%): AI kicks in, load stabilizes then drops
// Phase 3 (60-100%): load stays safely under threshold
export function AnimatedChart() {
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const DURATION = 6000; // 6 seconds per cycle

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const t = (elapsed % DURATION) / DURATION;
      setProgress(t);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Chart dimensions
  const W = 560;
  const H = 220;
  const PAD = { top: 20, right: 20, bottom: 36, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Y domain: 0 kW to 700 kW
  const yMin = 0;
  const yMax = 700;
  const thresholdKw = 500;

  // X: 12 data points across time
  const N = 60; // number of path points

  function yToSvg(kw: number) {
    return PAD.top + chartH - ((kw - yMin) / (yMax - yMin)) * chartH;
  }
  function xToSvg(i: number) {
    return PAD.left + (i / (N - 1)) * chartW;
  }

  // Generate the demand curve based on progress
  // We build the full "story" path:
  //   Points 0-24: climbing from ~320 toward ~550 (exceeding threshold)
  //   Points 25-35: AI kicks in, drops from ~550 toward ~420
  //   Points 36-59: stabilizes around 380-450, stays under threshold
  function getFullPath(): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < N; i++) {
      const frac = i / (N - 1);
      let kw: number;
      if (frac < 0.42) {
        // Climbing phase with noise
        const base = 300 + frac * (580 - 300) / 0.42;
        const noise = Math.sin(i * 1.7) * 12 + Math.sin(i * 3.1) * 6;
        kw = base + noise;
      } else if (frac < 0.62) {
        // AI intervention — sharp drop
        const localT = (frac - 0.42) / 0.2;
        const eased = 1 - Math.pow(1 - localT, 2);
        const base = 580 - eased * (580 - 390);
        const noise = Math.sin(i * 2.3) * 8 + Math.sin(i * 4.1) * 4;
        kw = base + noise;
      } else {
        // Stable under threshold
        const localT = (frac - 0.62) / 0.38;
        const base = 390 + Math.sin(localT * Math.PI * 2.4) * 25 + localT * 15;
        const noise = Math.sin(i * 1.9) * 10 + Math.sin(i * 3.7) * 5;
        kw = base + noise;
      }
      pts.push({ x: xToSvg(i), y: yToSvg(Math.max(yMin, Math.min(yMax, kw))) });
    }
    return pts;
  }

  const fullPath = getFullPath();

  // Animate: show only up to progress fraction of points
  const visibleCount = Math.max(2, Math.floor(progress * N));
  const visiblePts = fullPath.slice(0, visibleCount);

  function pointsToPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
    }
    return d;
  }

  // Area fill path (close below)
  function areaPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return "";
    const linePath = pointsToPath(pts);
    const lastPt = pts[pts.length - 1];
    const firstPt = pts[0];
    const bottom = PAD.top + chartH;
    return `${linePath} L ${lastPt.x.toFixed(1)},${bottom} L ${firstPt.x.toFixed(1)},${bottom} Z`;
  }

  const thresholdY = yToSvg(thresholdKw);
  const linePath = pointsToPath(visiblePts);
  const fillPath = areaPath(visiblePts);

  // Current load point
  const currentPt = visiblePts[visiblePts.length - 1];
  const currentKw = currentPt
    ? Math.round(
        (yMax - ((currentPt.y - PAD.top) / chartH) * (yMax - yMin))
      )
    : 300;

  // Is the current point above threshold?
  const isAboveThreshold = currentPt ? currentPt.y < thresholdY : false;
  const isAiActive = progress > 0.42;

  // Y-axis labels
  const yTicks = [0, 200, 400, 500, 600];

  return (
    <div className="relative w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 backdrop-blur-sm">
      {/* Status badge */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium tracking-widest text-slate-400 uppercase">
          Building Load — Live Simulation
        </span>
        <div className="flex items-center gap-2">
          {isAiActive ? (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              AI Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              Unmanaged
            </span>
          )}
          <span
            className={`text-sm font-semibold tabular-nums ${
              isAboveThreshold
                ? "text-rose-400"
                : "text-emerald-400"
            }`}
          >
            {currentKw} kW
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: "180px" }}
        aria-label="Demand charge simulation chart"
      >
        <defs>
          {/* Area gradient — green below threshold */}
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          {/* Red area gradient — above threshold warning */}
          <linearGradient id="areaGradientRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.04" />
          </linearGradient>
          {/* Line gradient — shifts from amber to emerald when AI kicks in */}
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="42%" stopColor="#f43f5e" />
            <stop offset="62%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          {/* Glow filter for line */}
          <filter id="lineGlow" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="chartClip">
            <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        {yTicks.map((kw) => {
          const gy = yToSvg(kw);
          return (
            <g key={kw}>
              <line
                x1={PAD.left}
                y1={gy}
                x2={PAD.left + chartW}
                y2={gy}
                stroke={kw === thresholdKw ? "rgba(244,63,94,0.3)" : "rgba(148,163,184,0.08)"}
                strokeWidth={kw === thresholdKw ? 1.5 : 1}
                strokeDasharray={kw === thresholdKw ? "4 3" : undefined}
              />
              <text
                x={PAD.left - 6}
                y={gy + 4}
                textAnchor="end"
                fontSize="10"
                fill={kw === thresholdKw ? "rgba(244,63,94,0.8)" : "rgba(148,163,184,0.5)"}
                fontFamily="Space Grotesk, sans-serif"
              >
                {kw}
              </text>
            </g>
          );
        })}

        {/* Threshold label */}
        <text
          x={PAD.left + chartW - 4}
          y={thresholdY - 5}
          textAnchor="end"
          fontSize="9"
          fill="rgba(244,63,94,0.7)"
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="600"
          letterSpacing="0.05em"
        >
          DEMAND LIMIT
        </text>

        {/* Clip group for chart content */}
        <g clipPath="url(#chartClip)">
          {/* Red "danger zone" above threshold */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={chartW}
            height={thresholdY - PAD.top}
            fill="rgba(244,63,94,0.04)"
          />

          {/* Area fill */}
          {fillPath && (
            <path
              d={fillPath}
              fill={isAboveThreshold ? "url(#areaGradientRed)" : "url(#areaGradient)"}
              style={{ transition: "fill 0.6s ease" }}
            />
          )}

          {/* Main line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lineGlow)"
            />
          )}
        </g>

        {/* AI intervention annotation */}
        {progress > 0.44 && (
          <g>
            {/* Vertical line at intervention point */}
            <line
              x1={xToSvg(Math.floor(0.42 * (N - 1)))}
              y1={PAD.top}
              x2={xToSvg(Math.floor(0.42 * (N - 1)))}
              y2={PAD.top + chartH}
              stroke="rgba(16,185,129,0.5)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={xToSvg(Math.floor(0.42 * (N - 1))) + 6}
              y={PAD.top + 14}
              fontSize="9"
              fill="rgba(16,185,129,0.85)"
              fontFamily="Space Grotesk, sans-serif"
              fontWeight="600"
              letterSpacing="0.05em"
            >
              AI INTERVENED
            </text>
          </g>
        )}

        {/* Current value dot */}
        {currentPt && (
          <g>
            {/* Outer ping ring — animated via CSS transform+opacity on the group */}
            <circle
              cx={currentPt.x}
              cy={currentPt.y}
              r="12"
              fill="none"
              stroke={isAboveThreshold ? "#f43f5e" : "#10b981"}
              strokeWidth="1"
              className="dot-ping"
            />
            <circle
              cx={currentPt.x}
              cy={currentPt.y}
              r="5"
              fill={isAboveThreshold ? "#f43f5e" : "#10b981"}
              opacity="0.9"
            />
          </g>
        )}

        {/* X-axis labels */}
        {["12:00", "12:15", "12:30", "12:45", "1:00"].map((label, idx) => (
          <text
            key={label}
            x={PAD.left + (idx / 4) * chartW}
            y={H - 6}
            textAnchor="middle"
            fontSize="9"
            fill="rgba(148,163,184,0.45)"
            fontFamily="Space Grotesk, sans-serif"
          >
            {label}
          </text>
        ))}

        {/* Y axis label */}
        <text
          x={10}
          y={PAD.top + chartH / 2}
          textAnchor="middle"
          fontSize="9"
          fill="rgba(148,163,184,0.4)"
          fontFamily="Space Grotesk, sans-serif"
          transform={`rotate(-90, 10, ${PAD.top + chartH / 2})`}
        >
          kW
        </text>
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-amber-400" />
          Unmanaged load
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-emerald-400" />
          AI-managed load
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-rose-500/70" style={{ border: "1px dashed rgba(244,63,94,0.7)" }} />
          Demand limit
        </span>
      </div>

      <style>{`
        @keyframes dot-ping {
          0% { opacity: 0.5; transform: scale(0.6); }
          100% { opacity: 0; transform: scale(2.2); }
        }
        .dot-ping {
          transform-box: fill-box;
          transform-origin: center;
          animation: dot-ping 1.8s ease-out infinite;
        }
      `}</style>
    </div>
  );
}
