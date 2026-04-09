"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { teamApi } from "@/lib/teamApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";

export default function NewTeamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  if (loading || !user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const team = await teamApi.createTeam({
        name,
        description: description || undefined,
        approval_threshold: threshold,
      });
      toast.success(`Team "${team.name}" created!`);
      router.push(`/teams/${team.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create team");
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
        <Link href="/teams" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Teams
        </Link>
        <span className="text-lg font-bold bg-linear-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
          New Team
        </span>
        <div className="ml-auto"><ThemeToggle /></div>
      </motion.header>

      <main className="mx-auto max-w-xl px-6 py-10">
        <form onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass rounded-2xl p-8 flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-sm text-muted-foreground">Team name</Label>
              <Input
                id="name" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Core Architecture Team" required
                className="bg-white/5 border-white/10 focus:border-emerald-500/60 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desc" className="text-sm text-muted-foreground">Description (optional)</Label>
              <Input
                id="desc" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this team work on?"
                className="bg-white/5 border-white/10 focus:border-emerald-500/60 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="threshold" className="text-sm text-muted-foreground">
                Board approval threshold
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="threshold" type="number" min={1} max={20}
                  value={threshold} onChange={(e) => setThreshold(Math.max(1, Number(e.target.value)))}
                  className="bg-white/5 border-white/10 focus:border-emerald-500/60 transition-colors w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Number of board-member approvals needed to mark a config as approved
                </p>
              </div>
            </div>

            <Button
              type="submit" disabled={submitting || !name.trim()}
              className="w-full bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 font-semibold py-5 transition-all duration-300"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Creating…
                </span>
              ) : "Create team →"}
            </Button>
          </motion.div>
        </form>
      </main>
    </div>
  );
}
