"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { teamApi, TeamOut } from "@/lib/teamApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";

const ROLE_STYLES: Record<string, string> = {
  owner:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  board:  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  member: "bg-white/8 text-muted-foreground border-white/10",
};

export default function TeamsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<TeamOut[]>([]);
  const [fetching, setFetching] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    teamApi.listMyTeams()
      .then(setTeams)
      .catch((e) => toast.error(e.message))
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const team = await teamApi.joinTeam(inviteCode.trim());
      setTeams((prev) => [...prev, team]);
      setInviteCode("");
      toast.success(`Joined "${team.name}"!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to join team");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen dot-grid">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-20 border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center gap-4"
      >
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </Link>
        <span className="text-lg font-bold bg-linear-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
          Teams
        </span>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Button
            size="sm"
            onClick={() => router.push("/teams/new")}
            className="bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 transition-all duration-300"
          >
            + New Team
          </Button>
        </div>
      </motion.header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-6">

          {/* Team list */}
          {fetching ? (
            <div className="flex items-center gap-3 text-muted-foreground py-12 justify-center">
              <div className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              Loading teams…
            </div>
          ) : teams.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-semibold mb-2">No teams yet</p>
              <p className="text-muted-foreground text-sm mb-6">Create a team or join one with an invite code.</p>
              <Button
                onClick={() => router.push("/teams/new")}
                className="bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 transition-all"
              >
                Create your first team
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {teams.map((team) => (
                <motion.div
                  key={team.id}
                  whileHover={{ scale: 1.01, y: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="glass rounded-xl p-5 cursor-pointer hover:border-emerald-500/30 transition-colors"
                  onClick={() => router.push(`/teams/${team.id}`)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-semibold text-sm">{team.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {team.pending_review_count > 0 && (
                        <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/20 border text-xs">
                          {team.pending_review_count} pending
                        </Badge>
                      )}
                      <Badge className={`${ROLE_STYLES[team.my_role ?? "member"]} border text-xs`}>
                        {team.my_role ?? "member"}
                      </Badge>
                    </div>
                  </div>
                  {team.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{team.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {team.member_count} member{team.member_count !== 1 ? "s" : ""} · {team.approval_threshold} approval{team.approval_threshold !== 1 ? "s" : ""} required
                  </p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Join by invite code */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold mb-4">Join a team</h3>
            <form onSubmit={handleJoin} className="flex gap-3">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code…"
                className="bg-white/5 border-white/10 focus:border-emerald-500/60 transition-colors flex-1"
              />
              <Button type="submit" disabled={joining || !inviteCode.trim()} variant="outline" className="border-white/10 hover:border-emerald-500/30 transition-all">
                {joining ? "Joining…" : "Join"}
              </Button>
            </form>
          </div>

        </motion.div>
      </main>
    </div>
  );
}
