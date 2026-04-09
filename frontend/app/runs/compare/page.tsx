"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, RunDetail, Configuration } from "@/lib/api";
import { motion } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

const RUN_COLORS = ["#34d399", "#a855f7", "#f59e0b", "#60a5fa"];

type RunData = {
  run: RunDetail;
  configs: Configuration[];
  bestWns: number | null;
  bestPower: number | null;
  bestArea: number | null;
};

function Delta({ val, ref: refVal, higherBetter = true }: { val: number | null; ref: number | null; higherBetter?: boolean }) {
  if (val === null || refVal === null) return <span className="text-muted-foreground">—</span>;
  const diff = val - refVal;
  if (Math.abs(diff) < 0.001) return <span className="text-muted-foreground">—</span>;
  const positive = higherBetter ? diff > 0 : diff < 0;
  return (
    <span className={`text-xs font-mono ${positive ? "text-emerald-400" : "text-red-400"}`}>
      {diff > 0 ? "+" : ""}{diff.toFixed(3)}
    </span>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ids = searchParams.get("ids")?.split(",").map(Number).filter(Boolean) ?? [];

  const [runs, setRuns] = useState<RunData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length < 2) {
      setError("Select at least 2 runs to compare.");
      setLoading(false);
      return;
    }

    Promise.all(
      ids.map(async (id) => {
        const [run, configs] = await Promise.all([api.getRun(id), api.getConfigurations(id)]);
        const completed = configs.filter((c) => c.result?.wns != null);
        const bestWns   = completed.length ? Math.max(...completed.map((c) => c.result!.wns!)) : null;
        const bestPower = completed.length ? Math.min(...completed.map((c) => c.result!.power!)) : null;
        const bestArea  = completed.length ? Math.min(...completed.map((c) => c.result!.area!)) : null;
        return { run, configs, bestWns, bestPower, bestArea };
      })
    )
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ref = runs[0];

  // Build scatter data per run
  const scatterDatasets = runs.map((rd, i) => ({
    name: rd.run.name,
    color: RUN_COLORS[i] ?? "#888",
    data: rd.configs
      .filter((c) => c.result?.power != null && c.result?.wns != null)
      .map((c) => ({
        power: c.result!.power!,
        wns: c.result!.wns!,
        area: c.result!.area ?? 0,
      })),
  }));

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
          Run Comparison
        </span>
        <div className="ml-auto"><ThemeToggle /></div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {loading && (
          <div className="flex items-center gap-3 text-muted-foreground py-20 justify-center">
            <div className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            Loading runs…
          </div>
        )}

        {error && (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to dashboard
            </button>
          </div>
        )}

        {!loading && !error && runs.length >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-8"
          >
            {/* PPA summary table */}
            <div className="glass rounded-2xl p-6 overflow-x-auto">
              <h2 className="text-sm font-semibold mb-5 text-emerald-600 dark:text-emerald-400">PPA Summary</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-white/8">
                    <th className="text-left py-2 pr-4 font-medium">Metric</th>
                    {runs.map((rd, i) => (
                      <th key={rd.run.id} className="text-right py-2 px-3 font-medium">
                        <span style={{ color: RUN_COLORS[i] }}>{rd.run.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { label: "Best WNS (ns)", key: "bestWns" as const, higherBetter: true },
                    { label: "Best Power (mW)", key: "bestPower" as const, higherBetter: false },
                    { label: "Best Area (μm²)", key: "bestArea" as const, higherBetter: false },
                    { label: "Iterations", key: null, higherBetter: false },
                  ].map(({ label, key, higherBetter }) => (
                    <tr key={label} className="hover:bg-white/2 transition-colors">
                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">{label}</td>
                      {runs.map((rd, i) => {
                        const val = key ? rd[key] : rd.configs.filter(c => c.result?.wns != null).length;
                        const refVal = key ? ref[key] : ref.configs.filter(c => c.result?.wns != null).length;
                        return (
                          <td key={rd.run.id} className="py-2.5 px-3 text-right font-mono text-sm">
                            <span>{val !== null ? (typeof val === "number" ? val.toFixed(key === "bestArea" ? 0 : 3) : val) : "—"}</span>
                            {i > 0 && key && (
                              <span className="ml-2">
                                <Delta val={val as number | null} ref={refVal as number | null} higherBetter={higherBetter} />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Scatter chart */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold mb-1 text-purple-500 dark:text-purple-400">Power vs. Timing — All Iterations</h2>
              <p className="text-xs text-muted-foreground mb-5">Points above the dashed line meet timing closure (WNS ≥ 0)</p>
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="#ffffff10" />
                  <XAxis
                    dataKey="power"
                    name="Power (mW)"
                    type="number"
                    label={{ value: "Power (mW)", position: "insideBottom", offset: -10, style: { fontSize: 11, fill: "#888" } }}
                    tick={{ fontSize: 10, fill: "#888" }}
                  />
                  <YAxis
                    dataKey="wns"
                    name="WNS (ns)"
                    type="number"
                    label={{ value: "WNS (ns)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "#888" } }}
                    tick={{ fontSize: 10, fill: "#888" }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="glass rounded-lg p-3 text-xs border border-white/10">
                          <p>Power: <b>{d.power?.toFixed(1)} mW</b></p>
                          <p>WNS: <b className={d.wns >= 0 ? "text-emerald-400" : "text-red-400"}>{d.wns?.toFixed(3)} ns</b></p>
                          <p>Area: <b>{Math.round(d.area)} μm²</b></p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="#34d39955" strokeDasharray="4 4" label={{ value: "Timing closure", position: "right", style: { fontSize: 10, fill: "#34d399aa" } }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {scatterDatasets.map((ds) => (
                    <Scatter key={ds.name} name={ds.name} data={ds.data} fill={ds.color} fillOpacity={0.7} r={4} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Knob ranges table */}
            <div className="glass rounded-2xl p-6 overflow-x-auto">
              <h2 className="text-sm font-semibold mb-5 text-emerald-600 dark:text-emerald-400">Knob Search Ranges</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-white/8">
                    <th className="text-left py-2 pr-4 font-medium">Knob</th>
                    {runs.map((rd, i) => (
                      <th key={rd.run.id} className="text-right py-2 px-3 font-medium">
                        <span style={{ color: RUN_COLORS[i] }}>{rd.run.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {Array.from(
                    new Set(runs.flatMap((rd) => (rd.run.knob_specs ?? []).map((k) => k.name)))
                  ).map((knobName) => (
                    <tr key={knobName}>
                      <td className="py-2.5 pr-4 text-xs text-muted-foreground capitalize">
                        {knobName.replace(/_/g, " ")}
                      </td>
                      {runs.map((rd) => {
                        const spec = (rd.run.knob_specs ?? []).find((k) => k.name === knobName);
                        return (
                          <td key={rd.run.id} className="py-2.5 px-3 text-right font-mono text-xs">
                            {spec ? `${spec.min_val} – ${spec.max_val}` : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}
