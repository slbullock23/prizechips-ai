"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConstraintForm, { ConstraintRow } from "@/components/ConstraintForm";
import KnobForm, { KnobRow } from "@/components/KnobForm";
import { toast } from "sonner";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

const section = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
};

export default function NewRunPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxIterations, setMaxIterations] = useState(10);
  const [constraints, setConstraints] = useState<ConstraintRow[]>([]);
  const [knobs, setKnobs] = useState<KnobRow[]>([
    { name: "clock_period", min_val: 2.0, max_val: 5.0 },
    { name: "utilization",  min_val: 0.3, max_val: 0.8 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (knobs.length === 0) { toast.error("Add at least one knob."); return; }
    setSubmitting(true);
    try {
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
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center gap-4"
      >
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </Link>
        <span className="text-lg font-bold bg-linear-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
          New Run
        </span>
        <div className="ml-auto"><ThemeToggle /></div>
      </motion.header>

      <main className="mx-auto max-w-2xl px-6 py-10">
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

            {/* Glossary */}
            <motion.div variants={section} className="glass rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setGlossaryOpen((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>📖 What do these terms mean?</span>
                <span className={`transition-transform duration-200 ${glossaryOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              <AnimatePresence>
                {glossaryOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/8 pt-4">
                      {[
                        { icon: "⚡", term: "Clock Period", desc: "How fast the chip runs — shorter = faster, harder to achieve." },
                        { icon: "📦", term: "Utilization",  desc: "How tightly packed the logic is — higher = more crammed in, more power." },
                        { icon: "🕐", term: "WNS",          desc: "Worst Negative Slack — positive means timing is met, negative means missed." },
                        { icon: "📉", term: "TNS",          desc: "Total Negative Slack — sum of all timing misses; zero is perfect." },
                        { icon: "🔋", term: "Power",        desc: "Electricity the chip uses in milliwatts — lower is better." },
                        { icon: "📐", term: "Area",         desc: "Physical chip size in square micrometers — smaller chips cost less to make." },
                      ].map(({ icon, term, desc }) => (
                        <div key={term} className="flex gap-2.5">
                          <span className="text-xl shrink-0">{icon}</span>
                          <div>
                            <p className="text-xs font-semibold mb-0.5">{term}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                ) : "Start optimization →"}
              </Button>
            </motion.div>
          </motion.div>
        </form>
      </main>
    </div>
  );
}
