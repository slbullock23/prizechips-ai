"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminApi, getAdminToken, clearAdminToken, RunWithOwner, UserAdminOut } from "@/lib/adminApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  running:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  failed:    "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<RunWithOwner[]>([]);
  const [users, setUsers] = useState<UserAdminOut[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!getAdminToken()) router.replace("/admin/login");
  }, [router]);

  const fetchRuns = useCallback(() => {
    adminApi.listAllRuns()
      .then(setRuns)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingRuns(false));
  }, []);

  const fetchUsers = useCallback(() => {
    adminApi.listUsers()
      .then(setUsers)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    fetchRuns();
    fetchUsers();
  }, [fetchRuns, fetchUsers]);

  function handleLogout() {
    clearAdminToken();
    router.push("/admin/login");
  }

  async function handleDeleteUser(userId: number, username: string) {
    if (!confirm(`Delete user "${username}" and all their runs? This cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(userId);
      toast.success(`User "${username}" deleted`);
      fetchUsers();
      fetchRuns();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    }
  }

  return (
    <div className="min-h-screen dot-grid">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 border-b border-white/8 bg-background/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold bg-linear-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
            PrizeChips
          </span>
          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-mono">
            ADMIN
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => router.push("/runs/new")}
            className="bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 font-semibold text-xs"
          >
            + New Run
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Sign out
          </Button>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all users and optimization runs.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="runs">
            <TabsList className="bg-white/5 border border-white/8">
              <TabsTrigger value="runs">All Runs ({runs.length})</TabsTrigger>
              <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            </TabsList>

            {/* ── All Runs ── */}
            <TabsContent value="runs" className="mt-4">
              {loadingRuns ? (
                <div className="glass rounded-xl py-16 flex items-center justify-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading runs…</p>
                </div>
              ) : runs.length === 0 ? (
                <div className="glass rounded-xl py-16 text-center text-muted-foreground">
                  No runs yet.
                </div>
              ) : (
                <div className="glass rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8">
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-16">ID</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Run Name</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Owner</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Iterations</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run, i) => (
                        <motion.tr
                          key={run.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * i }}
                          className="border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => router.push(`/admin/runs/${run.id}`)}
                        >
                          <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{run.id}</td>
                          <td className="px-4 py-3 font-medium">{run.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-emerald-600 dark:text-emerald-400">@{run.owner_username}</td>
                          <td className="px-4 py-3">
                            <Badge className={`${STATUS_STYLES[run.status]} border text-xs`}>{run.status}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{run.max_iterations}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(run.created_at).toLocaleDateString()}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* ── Users ── */}
            <TabsContent value="users" className="mt-4">
              {loadingUsers ? (
                <div className="glass rounded-xl py-16 flex items-center justify-center gap-3">
                  <div className="h-5 w-5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <p className="text-muted-foreground text-sm">Loading users…</p>
                </div>
              ) : users.length === 0 ? (
                <div className="glass rounded-xl py-16 text-center text-muted-foreground">
                  No users.
                </div>
              ) : (
                <div className="glass rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8">
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-16">ID</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Username</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Email</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Runs</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Joined</th>
                        <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * i }}
                          className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-muted-foreground text-xs">{u.id}</td>
                          <td className="px-4 py-3 font-medium text-purple-500 dark:text-purple-300">@{u.username}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                          <td className="px-4 py-3 font-mono text-sm">{u.run_count}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {u.email !== "admin@blur.local" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-7 px-2"
                              >
                                Delete
                              </Button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
