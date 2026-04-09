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

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, username, password);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden dot-grid px-4">
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-1 absolute left-[20%] top-[15%] h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="orb-2 absolute right-[20%] bottom-[15%] h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent">
            PrizeChips
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">by Blur</p>
        </motion.div>

        <div className="glass rounded-2xl p-8 glow-purple">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <h2 className="mb-1 text-xl font-semibold">Create account</h2>
            <p className="mb-6 text-sm text-muted-foreground">Start optimizing your chip designs</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { id: "email",    label: "Email",    type: "email",    value: email,    setter: setEmail,    delay: 0.3  },
              { id: "username", label: "Username", type: "text",     value: username, setter: setUsername, delay: 0.36 },
              { id: "password", label: "Password", type: "password", value: password, setter: setPassword, delay: 0.42 },
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
                  className="bg-white/5 border-white/10 focus:border-purple-500/60 transition-colors"
                />
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52, duration: 0.4 }}
              className="mt-2"
            >
              <Button
                type="submit"
                className="w-full bg-linear-to-r from-purple-500 to-emerald-500 hover:from-purple-400 hover:to-emerald-400 text-white border-0 font-semibold transition-all duration-300"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center text-sm text-muted-foreground"
            >
              Already have an account?{" "}
              <Link href="/login" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 hover:underline underline-offset-4 transition-colors">
                Sign in
              </Link>
            </motion.p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
