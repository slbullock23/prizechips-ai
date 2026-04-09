"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/api";
import { motion } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

// Decorative floating chip SVG
function MiniChip({ x, y, size, accent, delay }: { x: string; y: string; size: number; accent: string; delay: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
      transition={{ delay, duration: 4 + delay, repeat: Infinity, ease: "easeInOut", opacity: { duration: 0.6 } }}
    >
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
        {/* Package */}
        <rect x="8" y="8" width="64" height="64" rx="6"
          fill="none" stroke={accent} strokeWidth="1.5" strokeOpacity="0.3" />
        {/* Die */}
        <rect x="20" y="20" width="40" height="40" rx="3"
          fill={accent} fillOpacity="0.07" stroke={accent} strokeWidth="1" strokeOpacity="0.4" />
        {/* Cells */}
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <rect key={i}
            x={22 + (i % 3) * 12} y={22 + Math.floor(i / 3) * 12}
            width="9" height="9" rx="1"
            fill={accent} fillOpacity={0.1 + (i % 3) * 0.1}
          />
        ))}
        {/* Pins top */}
        {[24, 40, 56].map((px, i) => (
          <rect key={i} x={px - 3} y="3" width="6" height="7" rx="1" fill={accent} fillOpacity="0.4" />
        ))}
        {/* Pins bottom */}
        {[24, 40, 56].map((px, i) => (
          <rect key={i} x={px - 3} y="70" width="6" height="7" rx="1" fill={accent} fillOpacity="0.4" />
        ))}
        {/* Pins left */}
        {[24, 40, 56].map((py, i) => (
          <rect key={i} x="3" y={py - 3} width="7" height="6" rx="1" fill={accent} fillOpacity="0.4" />
        ))}
        {/* Pins right */}
        {[24, 40, 56].map((py, i) => (
          <rect key={i} x="70" y={py - 3} width="7" height="6" rx="1" fill={accent} fillOpacity="0.4" />
        ))}
      </svg>
    </motion.div>
  );
}

const CHIPS = [
  { x: "5%",  y: "10%", size: 90,  accent: "#34d399", delay: 0 },
  { x: "80%", y: "8%",  size: 70,  accent: "#a855f7", delay: 0.4 },
  { x: "88%", y: "55%", size: 100, accent: "#34d399", delay: 0.8 },
  { x: "3%",  y: "60%", size: 80,  accent: "#a855f7", delay: 1.2 },
  { x: "45%", y: "82%", size: 65,  accent: "#34d399", delay: 0.6 },
  { x: "65%", y: "75%", size: 55,  accent: "#a855f7", delay: 1.0 },
  { x: "20%", y: "80%", size: 60,  accent: "#34d399", delay: 1.4 },
];

export default function SplashPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return (
    <div className="relative min-h-screen dot-grid flex flex-col items-center justify-center overflow-hidden">
      {/* Decorative chips */}
      {CHIPS.map((c, i) => <MiniChip key={i} {...c} />)}

      {/* Theme toggle top-right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Sign in link top-left */}
      <div className="absolute top-4 left-4 z-10">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </Link>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl"
      >
        {/* Logo / wordmark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-6"
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto mb-4">
            <rect x="4" y="4" width="56" height="56" rx="10"
              fill="none" stroke="url(#splash-grad)" strokeWidth="2" strokeOpacity="0.6" />
            <rect x="16" y="16" width="32" height="32" rx="4"
              fill="url(#splash-grad)" fillOpacity="0.15" stroke="url(#splash-grad)" strokeWidth="1.5" strokeOpacity="0.7" />
            {[0,1,2,3,4,5,6,7,8].map(i => (
              <rect key={i}
                x={18 + (i % 3) * 9} y={18 + Math.floor(i / 3) * 9}
                width="7" height="7" rx="1.5"
                fill="url(#splash-grad)" fillOpacity={0.2 + (i % 4) * 0.15}
              />
            ))}
            <defs>
              <linearGradient id="splash-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-5xl sm:text-6xl font-extrabold bg-linear-to-r from-emerald-400 via-teal-300 to-purple-400 bg-clip-text text-transparent mb-4 leading-tight"
        >
          PrizeChips
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-lg text-muted-foreground mb-2"
        >
          AI-powered chip design optimization.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="text-sm text-muted-foreground mb-10"
        >
          Let Bayesian search find the fastest, most efficient configuration — no engineering PhD required.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm"
        >
          <button
            onClick={() => router.push("/demo")}
            className="w-full sm:w-auto flex-1 px-8 py-4 rounded-xl font-bold text-base text-white
              bg-linear-to-r from-emerald-500 to-purple-500
              hover:from-emerald-400 hover:to-purple-400
              transition-all duration-300 shadow-lg shadow-emerald-500/20
              hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Innovating →
          </button>
          <Link
            href="/register"
            className="w-full sm:w-auto text-center px-6 py-4 rounded-xl font-medium text-sm
              border border-white/10 hover:border-emerald-500/30 hover:bg-white/5
              transition-all duration-200 text-muted-foreground hover:text-foreground"
          >
            Create account
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="mt-5 text-xs text-muted-foreground"
        >
          Try 3 free runs — no account needed.
        </motion.p>
      </motion.div>

      {/* Bottom brand line */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-6 text-xs text-muted-foreground/50"
      >
        by team Blur
      </motion.p>
    </div>
  );
}
