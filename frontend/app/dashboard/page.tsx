"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { api, RunSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import RunCard from "@/components/RunCard";
import ThemeToggle from "@/components/ThemeToggle";
import OnboardingModal from "@/components/OnboardingModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.listRuns()
      .then(setRuns)
      .catch((e) => toast.error(e.message))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  function toggleCompareMode() {
    setCompareMode((v) => !v);
    setSelectedIds([]);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="min-h-screen dot-grid">
      <OnboardingModal />
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-20 border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between"
      >
        <span className="text-xl font-bold bg-linear-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
          PrizeChips
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/teams"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Teams
          </Link>
          <span className="text-sm text-muted-foreground font-mono">@{user.username}</span>
          <ThemeToggle />
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
          >
            Sign out
          </Button>
        </div>
      </motion.header>

      <main className="mx-auto max-w-5xl px-6 py-12 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <p className="text-sm text-muted-foreground mb-1">Welcome back,</p>
            <h1 className="text-3xl font-bold">{user.username}</h1>
            <p className="text-muted-foreground text-sm mt-2">
              {runs.length > 0
                ? `${runs.length} optimization run${runs.length !== 1 ? "s" : ""} · Bayesian search over chip parameters`
                : "Start your first optimization run below"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {runs.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleCompareMode}
                className={`border-white/10 hover:border-white/20 transition-all text-sm ${
                  compareMode
                    ? "border-purple-500/40 bg-purple-500/10 text-purple-400 hover:border-purple-500/60"
                    : "hover:bg-white/5 text-muted-foreground"
                }`}
              >
                {compareMode ? "✕ Cancel" : "⊞ Compare"}
              </Button>
            )}
            <Button
              onClick={() => router.push("/runs/new")}
              className="bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 font-semibold px-6 transition-all duration-300"
            >
              + New Run
            </Button>
          </div>
        </motion.div>

        {fetching ? (
          <div className="flex items-center gap-3 text-muted-foreground py-16 justify-center">
            <div className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            Loading runs…
          </div>
        ) : runs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-16 text-center"
          >
            <div className="text-5xl mb-4">⚡</div>
            <p className="text-lg font-semibold mb-2">No runs yet</p>
            <p className="text-muted-foreground text-sm mb-8">
              Create a run to let the AI search for optimal chip configurations.
            </p>
            <Button
              onClick={() => router.push("/runs/new")}
              className="bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 font-semibold transition-all duration-300"
            >
              Create your first run
            </Button>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {runs.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                onClick={() => router.push(`/runs/${run.id}`)}
                compareMode={compareMode}
                selected={selectedIds.includes(run.id)}
                onSelect={toggleSelect}
              />
            ))}
          </motion.div>
        )}
      </main>

      {/* Compare sticky bottom bar */}
      <AnimatePresence>
        {compareMode && selectedIds.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="glass border border-white/15 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-2xl">
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} runs selected
              </span>
              <Button
                onClick={() => router.push(`/runs/compare?ids=${selectedIds.join(",")}`)}
                className="bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 font-semibold text-sm px-5 h-8 transition-all duration-300"
              >
                Compare {selectedIds.length} runs →
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
