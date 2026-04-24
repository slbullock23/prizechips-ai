"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, useParams } from "next/navigation";
import { api, getToken, RunDetail, Configuration } from "@/lib/api";
import { teamApi, TeamOut } from "@/lib/teamApi";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResultsTable from "@/components/ResultsTable";
import OptimizationLoader from "@/components/OptimizationLoader";
import ChipVisual from "@/components/ChipVisual";
import WhatIfPanel from "@/components/WhatIfPanel";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

function toUtc(ts: string): Date {
  // Backend returns naive UTC strings without 'Z' — force UTC parsing
  return new Date(ts.endsWith("Z") ? ts : ts + "Z");
}

function formatRuntime(startedAt: string | null, completedAt: string | null, currentTime?: Date): string {
  if (!startedAt) return "—";
  const start = toUtc(startedAt);
  const end = completedAt ? toUtc(completedAt) : (currentTime || new Date());
  const ms = end.getTime() - start.getTime();
  if (ms < 0) return "—";

  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const totalSec = ms / 1000;
  const minutes = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(2);
  return `${minutes}m ${secs}s`;
}

function validExplanation(s: string | null | undefined): string | null {
  if (!s) return null;
  if (s.startsWith("Ollama is not running") || s.startsWith("AI explanation unavailable")) return null;
  return s;
}

function calculatePPADelta(configs: Configuration[]): { power: number | null; wns: number | null; area: number | null } {
  const firstResult = configs[0]?.result;
  const bestConfig = configs
    .filter((c) => c.result?.wns !== null)
    .sort((a, b) => (b.result!.wns! - a.result!.wns!))
    .at(0);

  if (!firstResult || !bestConfig?.result) {
    return { power: null, wns: null, area: null };
  }

  const powerDelta = bestConfig.result.power && firstResult.power
    ? ((firstResult.power - bestConfig.result.power) / firstResult.power) * 100
    : null;

  const wnsDelta = bestConfig.result.wns && firstResult.wns
    ? ((bestConfig.result.wns - firstResult.wns) / Math.abs(firstResult.wns)) * 100
    : null;

  const areaDelta = bestConfig.result.area && firstResult.area
    ? ((firstResult.area - bestConfig.result.area) / firstResult.area) * 100
    : null;

  return { power: powerDelta, wns: wnsDelta, area: areaDelta };
}

export default function RunDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const runId = Number(params.id);

  const [run, setRun] = useState<RunDetail | null>(null);
  const [configs, setConfigs] = useState<Configuration[]>([]);
  const [myTeams, setMyTeams] = useState<TeamOut[]>([]);
  const [submitTeamId, setSubmitTeamId] = useState<number | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewDropdownOpen, setReviewDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!loading && !user && !getToken()) router.replace("/login");
  }, [user, loading, router]);

  const fetchData = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([api.getRun(runId), api.getConfigurations(runId)]);
      setRun(r);
      setConfigs(c);
      return r.status;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load run");
      return "failed";
    }
  }, [runId]);

  useEffect(() => {
    if (!user && !getToken()) return;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const status = await fetchData();
      if (status === "running" || status === "pending") timer = setTimeout(poll, 3000);
    }
    poll();
    return () => clearTimeout(timer);
  }, [user, fetchData]);

  // Update current time for live runtime display during running
  useEffect(() => {
    if (!run || run.status !== "running") return;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [run]);

  // Load user's teams for "Submit for Review"
  useEffect(() => {
    if (!user) return;
    teamApi.listMyTeams().then(setMyTeams).catch(() => {});
  }, [user]);

  if (loading || (!user && !getToken()) || !run) return null;

  const bestConfig = configs
    .filter((c) => c.result?.wns !== null)
    .sort((a, b) => (b.result!.wns! - a.result!.wns!))
    .at(0);

  const engineName = configs.find((c) => c.result?.engine_name)?.result?.engine_name;
  const runtime = formatRuntime(run.started_at, run.completed_at, currentTime);
  const iterationCount = configs.length;
  const ppaDelta = calculatePPADelta(configs);

  async function handleSubmitForReview() {
    if (!bestConfig || !submitTeamId) return;
    setSubmittingReview(true);
    try {
      await teamApi.submitReview(submitTeamId, bestConfig.id);
      toast.success("Submitted for team review!");
      setReviewDropdownOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="min-h-screen dot-grid">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center gap-3 flex-wrap"
      >
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </Link>
        <span className="text-lg font-semibold">{run.name}</span>
        <Badge className={`${STATUS_STYLES[run.status]} border text-xs`}>{run.status}</Badge>
        {engineName && (
          <Badge className="bg-white/8 border border-white/10 text-xs text-muted-foreground">
            {engineName}
          </Badge>
        )}
        {run.status === "running" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            AI running…
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
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
              {iterationCount}
              <span className="text-sm font-normal text-muted-foreground">/{run.max_iterations}</span>
            </p>
          </motion.div>
          <MetricCard label="Best WNS" value={bestConfig?.result?.wns} unit="ns" delay={0.1} />
          <MetricCard label="Best Power" value={bestConfig?.result?.power} unit="mW" delay={0.15} />
          <MetricCard label="Best Area" value={bestConfig?.result?.area} unit="um2" delay={0.2} />
        </div>

        {/* Runtime and PPA Delta cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Runtime</p>
            <p className="text-2xl font-bold font-mono">{runtime}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Power Δ</p>
            <p className={`text-2xl font-bold font-mono ${ppaDelta.power != null && ppaDelta.power > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
              {ppaDelta.power != null ? `${ppaDelta.power > 0 ? "+" : ""}${ppaDelta.power.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Timing Δ</p>
            <p className={`text-2xl font-bold font-mono ${ppaDelta.wns != null && ppaDelta.wns > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
              {ppaDelta.wns != null ? `${ppaDelta.wns > 0 ? "+" : ""}${ppaDelta.wns.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-1">Area Δ</p>
            <p className={`text-2xl font-bold font-mono ${ppaDelta.area != null && ppaDelta.area > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
              {ppaDelta.area != null ? `${ppaDelta.area > 0 ? "+" : ""}${ppaDelta.area.toFixed(1)}%` : "—"}
            </p>
          </div>
        </motion.div>

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
                  {c.min_val != null && ` >= ${c.min_val}`}
                  {c.max_val != null && ` <= ${c.max_val}`}
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
                run.status === "running" || run.status === "pending" ? (
                  <OptimizationLoader current={configs.length} total={run.max_iterations} />
                ) : (
                  <div className="glass rounded-xl py-16 text-center text-muted-foreground">
                    No iterations recorded.
                  </div>
                )
              ) : (
                <>
                  {(run.status === "running" || run.status === "pending") && (
                    <div className="mb-4">
                      <OptimizationLoader current={configs.length} total={run.max_iterations} />
                    </div>
                  )}
                  <ResultsTable configs={configs} />
                </>
              )}
            </TabsContent>

            <TabsContent value="best" className="mt-4">
              {!bestConfig ? (
                <div className="glass rounded-xl py-16 text-center text-muted-foreground">No results yet.</div>
              ) : (
                <div className="flex flex-col gap-5">
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
                        { label: "Area",  value: bestConfig.result?.area,  unit: "um2", positive: () => true },
                      ].map(({ label, value, unit, positive }) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <p className={`font-semibold font-mono ${value != null && positive(value) ? "text-emerald-600 dark:text-emerald-400" : value != null ? "text-red-500 dark:text-red-400" : ""}`}>
                            {value != null ? value.toFixed(4) : "—"}
                            <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
                          </p>
                        </div>
                      ))}
                    </div>

                    {validExplanation(bestConfig.result?.ai_explanation) && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2 font-semibold">
                          AI Explanation (llama3.2 via Ollama)
                        </p>
                        <p className="text-sm leading-relaxed">{validExplanation(bestConfig.result?.ai_explanation)}</p>
                      </div>
                    )}

                    {/* Submit for team review */}
                    {run.status === "completed" && myTeams.length > 0 && (
                      <div className="border-t border-white/8 pt-4">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setReviewDropdownOpen((v) => !v)}
                            className="text-sm px-4 py-2 rounded-lg border border-white/10 hover:border-purple-500/30 text-muted-foreground hover:text-foreground transition-all"
                          >
                            📋 Submit for Team Review ▾
                          </button>
                          <AnimatePresence>
                            {reviewDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                                className="absolute top-full left-0 mt-2 z-20 glass rounded-xl border border-white/10 shadow-xl min-w-55"
                              >
                                {myTeams.map((t) => (
                                  <button
                                    key={t.id}
                                    onClick={() => { setSubmitTeamId(t.id); setReviewDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                  >
                                    {t.name}
                                    <span className="ml-2 text-xs text-muted-foreground">{t.member_count} members</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {submitTeamId !== null && (
                          <div className="mt-3 flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              Submit to: <b>{myTeams.find(t => t.id === submitTeamId)?.name}</b>
                            </span>
                            <button
                              disabled={submittingReview}
                              onClick={handleSubmitForReview}
                              className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25 hover:bg-purple-500/25 transition-colors disabled:opacity-50"
                            >
                              {submittingReview ? "Submitting…" : "Confirm submission"}
                            </button>
                            <button
                              onClick={() => setSubmitTeamId(null)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>

                  {/* What-If panel */}
                  {run.status === "completed" &&
                    run.knob_specs &&
                    run.knob_specs.length > 0 &&
                    configs.filter((c) => c.result?.wns != null).length >= 3 && (
                    <WhatIfPanel
                      runId={runId}
                      knobSpecs={run.knob_specs}
                      currentKnobs={bestConfig.knobs}
                    />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
