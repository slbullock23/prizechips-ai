"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConstraintForm, { ConstraintRow } from "@/components/ConstraintForm";
import KnobForm, { KnobRow } from "@/components/KnobForm";
import OnboardingModal from "@/components/OnboardingModal";
import { toast } from "sonner";
import Link from "next/link";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

const DEMO_COUNT_KEY = "prizechips_demo_count";
const MAX_FREE_RUNS = 3;

function getDemoCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(DEMO_COUNT_KEY) ?? "0", 10);
}

function incrementDemoCount() {
  const next = getDemoCount() + 1;
  localStorage.setItem(DEMO_COUNT_KEY, String(next));
  return next;
}

const section = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

// ── Upgrade prompt ────────────────────────────────────────────────────────────
function UpgradePrompt() {
  const router = useRouter();
  return (
    <div className="min-h-screen dot-grid flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl p-10 max-w-md w-full text-center"
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">You've used all 3 free runs!</h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Create a free account to keep exploring, save your designs, and run as many optimizations as you want.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.push("/register")}
            className="bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 font-semibold py-5 transition-all duration-300"
          >
            Create free account →
          </Button>
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main demo page ────────────────────────────────────────────────────────────
export default function DemoPage() {
  const router = useRouter();
  const [demoCount, setDemoCount] = useState(0);
  const [ready, setReady] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxIterations, setMaxIterations] = useState(10);
  const [constraints, setConstraints] = useState<ConstraintRow[]>([]);
  const [knobs, setKnobs] = useState<KnobRow[]>([
    { name: "clock_period", min_val: 2.0, max_val: 5.0 },
    { name: "utilization",  min_val: 0.3, max_val: 0.8 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Redirect to dashboard if already fully logged in (non-demo)
    // We allow demo tokens through since they also live in blur_token
    const count = getDemoCount();
    setDemoCount(count);
    setReady(true);
  }, []);

  if (!ready) return null;
  if (demoCount >= MAX_FREE_RUNS) return <UpgradePrompt />;

  const runsLeft = MAX_FREE_RUNS - demoCount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (knobs.length === 0) { toast.error("Add at least one knob."); return; }
    setSubmitting(true);
    try {
      // Get or reuse demo token
      if (!getToken()) {
        const { access_token } = await api.demo();
        setToken(access_token);
      }

      const run = await api.createRun({
        name,
        description: description || undefined,
        max_iterations: maxIterations,
        constraints: constraints.map((c) => ({
          metric: c.metric,
          min_val: c.min_val ?? undefined,
          max_val: c.max_val ?? undefined,
        })),
      });
      await api.startOptimize(run.id, knobs);

      const newCount = incrementDemoCount();
      setDemoCount(newCount);
      toast.success("Optimization started!");
      router.push(`/runs/${run.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen dot-grid">
      <OnboardingModal />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center gap-4"
      >
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Home
        </Link>
        <span className="text-lg font-bold bg-linear-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
          Try PrizeChips
        </span>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/register"
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-500/30 text-muted-foreground hover:text-foreground transition-all"
          >
            Create account
          </Link>
        </div>
      </motion.header>

      {/* Demo banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-auto max-w-2xl px-6 pt-6"
      >
        <div className="flex items-center gap-3 rounded-xl border border-purple-500/25 bg-purple-500/8 px-4 py-3">
          <span className="text-purple-400 font-semibold text-sm">Demo mode</span>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-sm text-muted-foreground">
            {runsLeft} free run{runsLeft !== 1 ? "s" : ""} remaining
          </span>
          <div className="ml-auto flex gap-1">
            {Array.from({ length: MAX_FREE_RUNS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < demoCount ? "bg-emerald-400" : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Form — same as /runs/new */}
      <main className="mx-auto max-w-2xl px-6 py-8">
        <form onSubmit={handleSubmit}>
          <motion.div
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
            initial="hidden" animate="show"
            className="flex flex-col gap-6"
          >
            {/* Run details */}
            <motion.div variants={section} className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-5 text-emerald-600 dark:text-emerald-400">Run Details</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name" className="text-sm text-muted-foreground">Run name</Label>
                  <Input
                    id="name" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Timing closure pass 1" required
                    className="bg-white/5 border-white/10 focus:border-emerald-500/60 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="desc" className="text-sm text-muted-foreground">Description (optional)</Label>
                  <Input
                    id="desc" value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="What are you trying to achieve?"
                    className="bg-white/5 border-white/10 focus:border-emerald-500/60 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="iters" className="text-sm text-muted-foreground">Max iterations</Label>
                  <Input
                    id="iters" type="number" min={1} max={100}
                    value={maxIterations} onChange={(e) => setMaxIterations(Number(e.target.value))} required
                    className="bg-white/5 border-white/10 focus:border-emerald-500/60 transition-colors w-32"
                  />
                </div>
              </div>
            </motion.div>

            {/* Constraints */}
            <motion.div variants={section} className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-1 text-purple-500 dark:text-purple-400">Constraints</h2>
              <p className="text-xs text-muted-foreground mb-5">
                Hard limits on power, timing, and area. Violations are penalized by the optimizer.
              </p>
              <ConstraintForm rows={constraints} onChange={setConstraints} />
            </motion.div>

            {/* Knobs */}
            <motion.div variants={section} className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold mb-1 text-emerald-600 dark:text-emerald-400">Knobs (Search Space)</h2>
              <p className="text-xs text-muted-foreground mb-5">
                Define which parameters to tune and their allowed range.
              </p>
              <KnobForm rows={knobs} onChange={setKnobs} />
            </motion.div>

            <motion.div variants={section}>
              <Button
                type="submit" size="lg" disabled={submitting}
                className="w-full bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 font-semibold text-base py-6 transition-all duration-300"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Starting optimization…
                  </span>
                ) : `Start optimization → (${runsLeft} free run${runsLeft !== 1 ? "s" : ""} left)`}
              </Button>
            </motion.div>

            <motion.div variants={section} className="text-center">
              <p className="text-xs text-muted-foreground">
                Want unlimited runs?{" "}
                <Link href="/register" className="text-emerald-500 hover:text-emerald-400 transition-colors">
                  Create a free account
                </Link>
              </p>
            </motion.div>
          </motion.div>
        </form>
      </main>
    </div>
  );
}
