"use client";

import { motion } from "framer-motion";

interface Props {
  current: number;
  total: number;
}

export default function OptimizationLoader({ current, total }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="glass rounded-2xl py-16 px-8 flex flex-col items-center gap-8">
      {/* Concentric animated rings */}
      <div className="relative flex items-center justify-center w-40 h-40">
        {/* Outermost ring */}
        <motion.div
          className="absolute rounded-full border-2 border-emerald-500/20"
          style={{ width: 160, height: 160 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        {/* Middle ring */}
        <motion.div
          className="absolute rounded-full border-2 border-dashed border-purple-400/30"
          style={{ width: 120, height: 120 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner ring */}
        <motion.div
          className="absolute rounded-full border-2 border-emerald-400/50"
          style={{ width: 80, height: 80 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        {/* Spinning arc — outermost */}
        <motion.div
          className="absolute rounded-full border-2 border-transparent border-t-emerald-400"
          style={{ width: 160, height: 160 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        {/* Spinning arc — middle */}
        <motion.div
          className="absolute rounded-full border-2 border-transparent border-t-purple-400"
          style={{ width: 120, height: 120 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />

        {/* Center chip icon */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg
            width="28" height="28" viewBox="0 0 24 24" fill="none"
            className="text-emerald-400"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <rect x="7" y="7" width="10" height="10" rx="1" />
            <path d="M9 2v3M12 2v3M15 2v3M9 19v3M12 19v3M15 19v3M2 9h3M2 12h3M2 15h3M19 9h3M19 12h3M19 15h3" />
          </svg>
        </motion.div>

        {/* Orbiting dot */}
        <motion.div
          className="absolute"
          style={{ width: 160, height: 160 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_oklch(0.72_0.2_155/60%)]" />
        </motion.div>

        {/* Second orbiting dot */}
        <motion.div
          className="absolute"
          style={{ width: 120, height: 120 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear", delay: 0.5 }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_2px_oklch(0.65_0.18_305/60%)]" />
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Iteration {current} of {total}</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10 dark:bg-white/8 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-emerald-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Status text */}
      <div className="text-center flex flex-col gap-1">
        <p className="text-sm font-semibold">AI optimizing chip parameters…</p>
        <p className="text-xs text-muted-foreground">
          Bayesian search · gemma3:4b via Ollama
        </p>
      </div>

      {/* Pulsing dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}
