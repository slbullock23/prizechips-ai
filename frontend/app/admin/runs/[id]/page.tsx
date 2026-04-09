"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { adminApi, getAdminToken } from "@/lib/adminApi";
import type { RunDetail, Configuration } from "@/lib/adminApi";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResultsTable from "@/components/ResultsTable";
import ChipVisual from "@/components/ChipVisual";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  running:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  failed:    "bg-red-500/15 text-red-400 border-red-500/20",
};

function MetricCard({ label, value, unit, delay }: { label: string; value?: number | null; unit: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass rounded-xl p-5"
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono">
        {value != null ? value.toFixed(4) : "—"}
        <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
      </p>
    </motion.div>
  );
}

export default function AdminRunDetailPage() {
  const router = useRouter();
  const params = useParams();
  const runId = Number(params.id);

  const [run, setRun] = useState<RunDetail | null>(null);
  const [configs, setConfigs] = useState<Configuration[]>([]);

  useEffect(() => {
    if (!getAdminToken()) router.replace("/admin/login");
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        adminApi.getAdminRun(runId),
        adminApi.getAdminConfigurations(runId),
      ]);
      setRun(r);
      setConfigs(c);
      return r.status;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load run");
      return "failed";
    }
  }, [runId]);

  useEffect(() => {
    if (!getAdminToken()) return;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const status = await fetchData();
      if (status === "running" || status === "pending") timer = setTimeout(poll, 3000);
    }
    poll();
    return () => clearTimeout(timer);
  }, [fetchData]);

  if (!run) return null;

  const bestConfig = configs
    .filter((c) => c.result?.wns !== null)
    .sort((a, b) => (b.result!.wns! - a.result!.wns!))
    .at(0);

  return (
    <div className="min-h-screen dot-grid">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center gap-3 flex-wrap"
      >
        <Link href="/admin/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Admin Dashboard
        </Link>
        <span className="text-lg font-semibold">{run.name}</span>
        <Badge className={`${STATUS_STYLES[run.status]} border text-xs`}>{run.status}</Badge>
        <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-mono">
          ADMIN VIEW
        </Badge>
        {run.status === "running" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            AI running…
          </span>
        )}
        <div className="ml-auto"><ThemeToggle /></div>
      </motion.header>

      <main className="mx-auto max-w-5xl px-6 py-10 flex flex-col gap-8">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-xl p-5"
          >
            <p className="text-xs text-muted-foreground mb-1">Progress</p>
            <p className="text-2xl font-bold font-mono">
              {configs.length}
              <span className="text-sm font-normal text-muted-foreground">/{run.max_iterations}</span>
            </p>
          </motion.div>
          <MetricCard label="Best WNS" value={bestConfig?.result?.wns} unit="ns" delay={0.1} />
          <MetricCard label="Best Power" value={bestConfig?.result?.power} unit="mW" delay={0.15} />
          <MetricCard label="Best Area" value={bestConfig?.result?.area} unit="um²" delay={0.2} />
        </div>

        {/* Constraints */}
        {run.constraints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-xl p-5"
          >
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Constraints</p>
            <div className="flex flex-wrap gap-2">
              {run.constraints.map((c) => (
                <Badge key={c.id} variant="outline" className="border-white/10 text-sm font-mono">
                  {c.metric}
                  {c.min_val != null && ` ≥ ${c.min_val}`}
                  {c.max_val != null && ` ≤ ${c.max_val}`}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Tabs defaultValue="iterations">
            <TabsList className="bg-white/5 border border-white/8">
              <TabsTrigger value="iterations">All Iterations</TabsTrigger>
              <TabsTrigger value="best">Best Result</TabsTrigger>
            </TabsList>

            <TabsContent value="iterations" className="mt-4">
              {configs.length === 0 ? (
                <div className="glass rounded-xl py-16 text-center flex flex-col items-center gap-3">
                  {run.status === "running" ? (
                    <>
                      <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      <p className="text-muted-foreground text-sm">AI is searching… results appear as each iteration completes.</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">No iterations recorded.</p>
                  )}
                </div>
              ) : (
                <ResultsTable configs={configs} />
              )}
            </TabsContent>

            <TabsContent value="best" className="mt-4">
              {!bestConfig ? (
                <div className="glass rounded-xl py-16 text-center text-muted-foreground">No results yet.</div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-6 flex flex-col gap-6"
                >
                  {/* Plain-language summary */}
                  {run.summary && (
                    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-5 py-4">
                      <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1.5 font-semibold">In plain English</p>
                      <p className="text-sm leading-relaxed">{run.summary}</p>
                    </div>
                  )}

                  {/* Chip diagram */}
                  <ChipVisual
                    wns={bestConfig.result?.wns ?? null}
                    power={bestConfig.result?.power ?? null}
                    area={bestConfig.result?.area ?? null}
                    knobs={bestConfig.knobs}
                  />

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                      Iteration {bestConfig.iteration} — Best Configuration
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {Object.entries(bestConfig.knobs).map(([k, v]) => (
                        <div key={k} className="bg-white/5 rounded-lg px-3 py-2">
                          <p className="text-xs text-muted-foreground">{k}</p>
                          <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-white/8 pt-4">
                    {[
                      { label: "WNS",   value: bestConfig.result?.wns,   unit: "ns",  positive: (v: number) => v >= 0 },
                      { label: "TNS",   value: bestConfig.result?.tns,   unit: "ns",  positive: (v: number) => v >= 0 },
                      { label: "Power", value: bestConfig.result?.power, unit: "mW",  positive: () => true },
                      { label: "Area",  value: bestConfig.result?.area,  unit: "um²", positive: () => true },
                    ].map(({ label, value, unit, positive }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className={`font-semibold font-mono ${value != null && positive(value) ? "text-emerald-400" : value != null ? "text-red-400" : ""}`}>
                          {value != null ? value.toFixed(4) : "—"}
                          <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {bestConfig.result?.ai_explanation && (
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                      <p className="text-xs text-violet-400 uppercase tracking-wide mb-2 font-semibold">
                        ✦ AI Explanation (gemma3:4b via Ollama)
                      </p>
                      <p className="text-sm leading-relaxed">{bestConfig.result.ai_explanation}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
