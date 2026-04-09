"use client";

import { motion } from "framer-motion";

interface ChipVisualProps {
  wns: number | null;
  power: number | null;
  area: number | null;
  knobs: Record<string, number>;
}

const COLS = 8;
const ROWS = 8;
const CELL = 16;
const STEP = 19;
const GRID_X = 70;
const GRID_Y = 70;

const TOP_PINS    = [90, 117, 144, 171, 198];
const SIDE_PINS   = [100, 130, 160, 190];

export default function ChipVisual({ wns, power, area, knobs }: ChipVisualProps) {
  const timingMet   = wns != null && wns >= 0;
  const utilization = typeof knobs.utilization   === "number" ? Math.min(knobs.utilization, 1) : 0.5;
  const clockPeriod = typeof knobs.clock_period  === "number" ? knobs.clock_period : 3.5;
  const freqMHz     = Math.round(1000 / clockPeriod);

  const filledCells = Math.round(utilization * COLS * ROWS);
  // Power bar height: normalize against a rough max of 350 mW
  const powerBar    = power != null ? Math.min(power / 350, 1) : 0.5;

  const accent   = timingMet ? "#34d399" : "#f87171";   // emerald-400 / red-400
  const accentBg = timingMet ? "#34d39918" : "#f8717118";

  return (
    <div className="flex flex-col items-center gap-5">
      {/* ── Chip SVG ─────────────────────────────────────────── */}
      <div
        className="relative"
        style={{ filter: `drop-shadow(0 0 18px ${accent}55)` }}
      >
        <svg viewBox="0 0 280 280" className="w-64 h-64 sm:w-72 sm:h-72">
          <defs>
            <linearGradient id="dieGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={accent} stopOpacity="0.12" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="powerBar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* ── Package outline ──────────────────────────────── */}
          <rect x="22" y="22" width="236" height="236" rx="10"
            fill="none" stroke={accent} strokeWidth="1.5" strokeOpacity="0.22" />

          {/* Corner notch (IC convention) */}
          <path d="M 22 50 Q 22 22 50 22"
            fill="none" stroke={accent} strokeWidth="1.5" strokeOpacity="0.45" />

          {/* ── Pins & bond wires ────────────────────────────── */}
          {TOP_PINS.map((x, i) => (
            <g key={`tp${i}`}>
              <rect x={x - 5} y="13" width="10" height="13" rx="2"
                fill={accent} fillOpacity="0.35" />
              <line x1={x} y1="26" x2={x} y2="63"
                stroke={accent} strokeWidth="0.6" strokeOpacity="0.2" />
            </g>
          ))}
          {TOP_PINS.map((x, i) => (
            <g key={`bp${i}`}>
              <rect x={x - 5} y="254" width="10" height="13" rx="2"
                fill={accent} fillOpacity="0.35" />
              <line x1={x} y1="217" x2={x} y2="254"
                stroke={accent} strokeWidth="0.6" strokeOpacity="0.2" />
            </g>
          ))}
          {SIDE_PINS.map((y, i) => (
            <g key={`lp${i}`}>
              <rect x="13" y={y - 5} width="13" height="10" rx="2"
                fill={accent} fillOpacity="0.35" />
              <line x1="26" y1={y} x2="63" y2={y}
                stroke={accent} strokeWidth="0.6" strokeOpacity="0.2" />
            </g>
          ))}
          {SIDE_PINS.map((y, i) => (
            <g key={`rp${i}`}>
              <rect x="254" y={y - 5} width="13" height="10" rx="2"
                fill={accent} fillOpacity="0.35" />
              <line x1="217" y1={y} x2="254" y2={y}
                stroke={accent} strokeWidth="0.6" strokeOpacity="0.2" />
            </g>
          ))}

          {/* ── Die area ─────────────────────────────────────── */}
          <rect x="63" y="63" width="154" height="154" rx="5"
            fill="url(#dieGrad)" stroke={accent} strokeWidth="1.5" strokeOpacity="0.55" />

          {/* Animated die border pulse */}
          <motion.rect
            x="63" y="63" width="154" height="154" rx="5"
            fill="none" stroke={accent} strokeWidth="3" strokeOpacity="0"
            animate={{ strokeOpacity: [0, 0.35, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* ── Logic cell grid (8×8) ────────────────────────── */}
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const idx    = row * COLS + col;
              const filled = idx < filledCells;
              const cx     = GRID_X + col * STEP;
              const cy     = GRID_Y + row * STEP;
              return (
                <motion.rect
                  key={`cell-${idx}`}
                  x={cx} y={cy} width={CELL} height={CELL} rx="2"
                  fill={filled ? accent : "currentColor"}
                  fillOpacity={filled ? 0.38 : 0.07}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.012, duration: 0.25, ease: "easeOut" }}
                />
              );
            })
          )}

          {/* ── Clock distribution H-tree ─────────────────────── */}
          <line x1="140" y1="68" x2="140" y2="212"
            stroke={accent} strokeWidth="0.8" strokeOpacity="0.22" strokeDasharray="3,7" />
          <line x1="68"  y1="140" x2="212" y2="140"
            stroke={accent} strokeWidth="0.8" strokeOpacity="0.22" strokeDasharray="3,7" />
          <line x1="104" y1="68" x2="104" y2="140"
            stroke={accent} strokeWidth="0.5" strokeOpacity="0.12" strokeDasharray="2,9" />
          <line x1="176" y1="140" x2="176" y2="212"
            stroke={accent} strokeWidth="0.5" strokeOpacity="0.12" strokeDasharray="2,9" />

          {/* Animated clock pulse travelling down center line */}
          <motion.circle
            cx="140" cy="68" r="2.5"
            fill={accent} fillOpacity="0.8"
            animate={{ cy: [68, 212, 68] }}
            transition={{ duration: 3 / (freqMHz / 500), repeat: Infinity, ease: "linear" }}
          />

          {/* ── Center labels ──────────────────────────────────── */}
          <text x="140" y="134" textAnchor="middle"
            fill="currentColor" fontSize="13" fontWeight="700"
            fontFamily="var(--font-geist-mono, monospace)" opacity="0.75">
            {freqMHz} MHz
          </text>
          <text x="140" y="150" textAnchor="middle"
            fill="currentColor" fontSize="9" fontFamily="var(--font-geist-mono, monospace)"
            opacity="0.45">
            {Math.round(utilization * 100)}% utilization
          </text>

          {/* ── Timing badge (bottom-right of die) ─────────────── */}
          <circle cx="202" cy="202" r="10"
            fill={accentBg} stroke={accent} strokeWidth="1.5" strokeOpacity="0.7" />
          <text x="202" y="206" textAnchor="middle"
            fill={accent} fontSize="11" fontWeight="bold">
            {timingMet ? "✓" : "✗"}
          </text>

          {/* ── Power bar (right edge of die, amber) ─────────────── */}
          <rect x="222" y="78" width="7" height="124" rx="3"
            fill="currentColor" fillOpacity="0.1" />
          <motion.rect
            x="222"
            y={78 + 124 * (1 - powerBar)}
            width="7"
            height={124 * powerBar}
            rx="3"
            fill="url(#powerBar)"
            initial={{ scaleY: 0, originY: 1 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            style={{ transformOrigin: "222px 202px" }}
          />

          {/* Area label (bottom-left of die) */}
          {area != null && (
            <text x="73" y="210" fill="currentColor" fontSize="8"
              fontFamily="var(--font-geist-mono, monospace)" opacity="0.35">
              {Math.round(area)} μm²
            </text>
          )}
        </svg>
      </div>

      {/* ── Legend ──────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent, opacity: 0.65 }} />
          Logic cells ({Math.round(utilization * 100)}% filled)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/70" />
          Power ({power?.toFixed(1) ?? "—"} mW)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent, opacity: 0.7 }} />
          Timing {timingMet ? "met ✓" : "violated ✗"}
        </span>
      </div>
    </div>
  );
}
