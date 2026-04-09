"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

const DEV_ACCOUNTS = [
  { label: "Admin", email: "admin@blur.dev", password: "admin" },
  { label: "Test User", email: "test@blur.dev", password: "blurappwillwininnovationventure" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(devEmail: string, devPassword: string) {
    setLoading(true);
    try {
      await login(devEmail, devPassword);
    } catch {
      toast.error(`Dev account not found — register ${devEmail} first`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden dot-grid px-4">
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
      {/* Animated orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-1 absolute left-[15%] top-[20%] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="orb-2 absolute right-[15%] bottom-[20%] h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="orb-3 absolute left-[50%] top-[50%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/5 blur-2xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-glow bg-linear-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
            PrizeChips
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">by Blur</p>
        </motion.div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 glow-emerald">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="mb-1 text-xl font-semibold">Welcome back</h2>
            <p className="mb-6 text-sm text-muted-foreground">Sign in to your account</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { id: "email", label: "Email", type: "email", value: email, setter: setEmail, delay: 0.3 },
              { id: "password", label: "Password", type: "password", value: password, setter: setPassword, delay: 0.38 },
            ].map(({ id, label, type, value, setter, delay }) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay, duration: 0.4 }}
                className="flex flex-col gap-1.5"
              >
                <Label htmlFor={id} className="text-sm text-muted-foreground">{label}</Label>
                <Input
                  id={id}
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 focus:border-emerald-500/60 focus:ring-emerald-500/20 transition-colors"
                />
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.4 }}
              className="mt-2"
            >
              <Button
                type="submit"
                className="w-full bg-linear-to-r from-emerald-500 to-purple-500 hover:from-emerald-400 hover:to-purple-400 text-white border-0 font-semibold transition-all duration-300"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-center text-sm text-muted-foreground"
            >
              No account?{" "}
              <Link href="/register" className="text-emerald-600 dark:text-emerald-400 hover:text-cyan-300 underline-offset-4 hover:underline transition-colors">
                Register
              </Link>
            </motion.p>

            {/* Dev quick-login */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.62 }}
              className="border-t border-white/10 pt-4"
            >
              <p className="mb-2 text-xs text-muted-foreground text-center">Dev accounts</p>
              <div className="flex gap-2">
                {DEV_ACCOUNTS.map(({ label, email: devEmail, password: devPw }) => (
                  <Button
                    key={label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs border-white/10 bg-white/5 hover:bg-white/10"
                    disabled={loading}
                    onClick={() => quickLogin(devEmail, devPw)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
