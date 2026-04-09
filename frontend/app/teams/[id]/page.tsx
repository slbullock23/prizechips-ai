"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { teamApi, TeamDetailOut, ConfigReviewOut, ReviewVoteOut } from "@/lib/teamApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";

const ROLE_STYLES: Record<string, string> = {
  owner:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  board:  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  member: "bg-white/8 text-muted-foreground border-white/10",
};

const VOTE_STYLES = {
  approve: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  reject:  "bg-red-500/15 text-red-400 border-red-500/20",
};

function ReviewCard({
  review,
  myRole,
  myUserId,
  teamApprovalThreshold,
  onVote,
}: {
  review: ConfigReviewOut;
  myRole: string | null;
  myUserId: number;
  teamApprovalThreshold: number;
  onVote: (reviewId: number, vote: string, comment: string) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [voting, setVoting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [votes, setVotes] = useState<ReviewVoteOut[] | null>(null);
  const canVote = myRole === "board" || myRole === "owner";
  const isApproved = review.status === "approved";
  const isRejected = review.status === "rejected";

  async function loadVotes() {
    if (votes !== null) { setExpanded((v) => !v); return; }
    try {
      const detail = await teamApi.getReview(review.team_id, review.id);
      setVotes(detail.votes);
      setExpanded(true);
    } catch { /* ignore */ }
  }

  async function handleVote(vote: string) {
    setVoting(true);
    try {
      await onVote(review.id, vote, comment);
      setComment("");
    } finally {
      setVoting(false);
    }
  }

  const since = new Date(review.submitted_at).toLocaleDateString();

  return (
    <div className="glass rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">{review.run_name}</p>
          <p className="text-xs text-muted-foreground">Iteration {review.iteration} · by {review.submitted_by} · {since}</p>
        </div>
        {(isApproved || isRejected) && (
          <Badge className={`${isApproved ? VOTE_STYLES.approve : VOTE_STYLES.reject} border text-xs shrink-0`}>
            {isApproved ? "✓ Approved" : "✗ Rejected"}
          </Badge>
        )}
      </div>

      {/* Vote tally */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {Array.from({ length: teamApprovalThreshold }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${i < review.approve_count ? "bg-emerald-400" : "bg-white/15"}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {review.approve_count} / {teamApprovalThreshold} approvals · {review.vote_count} vote{review.vote_count !== 1 ? "s" : ""}
        </span>
        <button
          onClick={loadVotes}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "Hide votes ▴" : "See votes ▾"}
        </button>
      </div>

      {/* Votes list */}
      {expanded && votes && (
        <div className="border-t border-white/8 pt-3 flex flex-col gap-2">
          {votes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No votes yet</p>
          ) : (
            votes.map((v) => (
              <div key={v.voter_username} className="flex items-start gap-2 text-xs">
                <Badge className={`${VOTE_STYLES[v.vote]} border text-[10px] shrink-0`}>{v.vote}</Badge>
                <span className="font-medium">@{v.voter_username}</span>
                {v.comment && <span className="text-muted-foreground">— {v.comment}</span>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Voting UI */}
      {canVote && review.status === "pending" && (
        <div className="border-t border-white/8 pt-3 flex flex-col gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment…"
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
          <div className="flex gap-2">
            <button
              disabled={voting}
              onClick={() => handleVote("approve")}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              ✓ Approve
            </button>
            <button
              disabled={voting}
              onClick={() => handleVote("reject")}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              ✗ Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { id } = useParams<{ id: string }>();
  const teamId = Number(id);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [detail, setDetail] = useState<TeamDetailOut | null>(null);
  const [pendingReviews, setPendingReviews] = useState<ConfigReviewOut[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<ConfigReviewOut[]>([]);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      teamApi.getTeam(teamId),
      teamApi.listReviews(teamId, "pending"),
      teamApi.listReviews(teamId, "approved"),
    ])
      .then(([d, pending, approved]) => {
        setDetail(d);
        setPendingReviews(pending);
        setApprovedReviews(approved);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setFetching(false));
  }, [user, teamId]);

  if (loading || !user || !detail) {
    return fetching ? (
      <div className="min-h-screen dot-grid flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    ) : null;
  }

  const { team, members } = detail;
  const myMembership = members.find((m) => m.user_id === user.id);
  const myRole = myMembership?.role ?? null;
  const isOwner = myRole === "owner";

  function copyInviteCode() {
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleChangeRole(userId: number, role: string) {
    try {
      await teamApi.changeMemberRole(teamId, userId, role);
      setDetail((d) => d ? {
        ...d,
        members: d.members.map((m) =>
          m.user_id === userId ? { ...m, role: role as "owner" | "member" | "board" } : m
        ),
      } : d);
      toast.success("Role updated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!confirm("Remove this member?")) return;
    try {
      await teamApi.removeMember(teamId, userId);
      setDetail((d) => d ? { ...d, members: d.members.filter((m) => m.user_id !== userId) } : d);
      toast.success("Member removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleVote(reviewId: number, vote: string, comment: string) {
    try {
      const updated = await teamApi.castVote(teamId, reviewId, vote, comment || undefined);
      if (updated.status !== "pending") {
        // Moved to approved
        setPendingReviews((p) => p.filter((r) => r.id !== reviewId));
        setApprovedReviews((a) => [updated, ...a]);
        toast.success("Config approved! 🎉");
      } else {
        setPendingReviews((p) => p.map((r) => r.id === reviewId ? updated : r));
        toast.success(`Vote recorded: ${vote}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
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
          {team.name}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={copyInviteCode}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-500/30 text-muted-foreground hover:text-foreground transition-all font-mono"
            title="Copy invite code"
          >
            {copied ? "Copied!" : `🔗 ${team.invite_code}`}
          </button>
          <ThemeToggle />
        </div>
      </motion.header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Tabs defaultValue="reviews">
          <TabsList className="mb-6 bg-white/5 border border-white/10">
            <TabsTrigger value="reviews" className="data-[state=active]:bg-white/10">
              Pending Reviews {pendingReviews.length > 0 && `(${pendingReviews.length})`}
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-white/10">
              Approved {approvedReviews.length > 0 && `(${approvedReviews.length})`}
            </TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-white/10">
              Members ({members.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending reviews */}
          <TabsContent value="reviews">
            {pendingReviews.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-semibold mb-1">No pending reviews</p>
                <p className="text-xs text-muted-foreground">Submit a chip config for review from a run detail page.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    myRole={myRole}
                    myUserId={user.id}
                    teamApprovalThreshold={team.approval_threshold}
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Approved */}
          <TabsContent value="approved">
            {approvedReviews.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-semibold mb-1">No approved configs yet</p>
                <p className="text-xs text-muted-foreground">Board-approved configurations will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {approvedReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    myRole={myRole}
                    myUserId={user.id}
                    teamApprovalThreshold={team.approval_threshold}
                    onVote={handleVote}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Members */}
          <TabsContent value="members">
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-white/8">
                    <th className="text-left px-5 py-3 font-medium">Member</th>
                    <th className="text-left px-5 py-3 font-medium">Role</th>
                    <th className="text-right px-5 py-3 font-medium">Joined</th>
                    {isOwner && <th className="px-5 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {members.map((m) => (
                    <tr key={m.user_id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3">
                        <span className="font-mono text-sm">@{m.username}</span>
                        {m.user_id === user.id && (
                          <span className="ml-2 text-[10px] text-muted-foreground">(you)</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isOwner && m.user_id !== user.id ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleChangeRole(m.user_id, e.target.value)}
                            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500/60 transition-colors"
                          >
                            <option value="owner">owner</option>
                            <option value="board">board</option>
                            <option value="member">member</option>
                          </select>
                        ) : (
                          <Badge className={`${ROLE_STYLES[m.role]} border text-xs`}>{m.role}</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                        {new Date(m.joined_at).toLocaleDateString()}
                      </td>
                      {isOwner && (
                        <td className="px-5 py-3 text-right">
                          {m.user_id !== user.id && (
                            <button
                              onClick={() => handleRemoveMember(m.user_id)}
                              className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
