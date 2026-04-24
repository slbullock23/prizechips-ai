"use client";

import { useState } from "react";
import { Configuration } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

function validExplanation(s: string | null | undefined): string | null {
  if (!s) return null;
  if (s.startsWith("Ollama is not running") || s.startsWith("AI explanation unavailable")) return null;
  return s;
}

export default function ResultsTable({ configs }: { configs: Configuration[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-12">#</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Knobs</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">WNS (ns)</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">TNS (ns)</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Power (mW)</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Area (um2)</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <>
                <tr
                  key={c.id}
                  className="border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{c.iteration}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(c.knobs).map(([k, v]) => (
                        <Badge key={k} variant="outline" className="font-mono text-xs border-white/10 text-emerald-600 dark:text-emerald-300">
                          {k}={String(v)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-mono font-semibold ${c.result?.wns != null && c.result.wns >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {c.result?.wns?.toFixed(4) ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{c.result?.tns?.toFixed(4) ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{c.result?.power?.toFixed(1) ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{c.result?.area?.toFixed(0) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        c.result?.status === "success"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs"
                          : "bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/20 text-xs"
                      }
                    >
                      {c.result?.status ?? "pending"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {validExplanation(c.result?.ai_explanation) ? (expanded === c.id ? "▲" : "▼") : ""}
                  </td>
                </tr>

                {expanded === c.id && validExplanation(c.result?.ai_explanation) && (
                  <motion.tr
                    key={`${c.id}-exp`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={8} className="px-4 pb-3">
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 mt-1">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2 font-semibold">
                          AI Explanation
                        </p>
                        <p className="text-sm leading-relaxed">{validExplanation(c.result?.ai_explanation)}</p>
                      </div>
                    </td>
                  </motion.tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
