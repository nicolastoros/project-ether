"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Flame, Droplet, Leaf, Loader2, Lock, User } from "lucide-react";
import Link from "next/link";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { loadAccountIntoStore } from "@/lib/loadAccount";
import { cn } from "@/lib/utils";

const PREVIEW_CREATURES = [
  { icon: Flame, gradient: ELEMENT_GRADIENT.Fire, delay: 0 },
  { icon: Droplet, gradient: ELEMENT_GRADIENT.Water, delay: 0.2 },
  { icon: Leaf, gradient: ELEMENT_GRADIENT.Nature, delay: 0.4 },
] as const;

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single source of truth for "authenticated -> load account, then go to /hub": covers both a
  // fresh sign-in below and a user who lands here already logged in (e.g. hits the back button).
  // Keeping this the ONLY place that navigates avoids racing loadAccountIntoStore() against a
  // navigation fired straight off the session flipping to authenticated.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      const loaded = await loadAccountIntoStore();
      if (!cancelled && loaded) router.replace("/hub");
    })();
    return () => {
      cancelled = true;
    };
  }, [status, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    const result = await signIn("credentials", { username, password, redirect: false });

    if (!result || result.error) {
      setError("Usuario o contraseña incorrectos.");
      setSubmitting(false);
      return;
    }
    // The effect above takes it from here once `status` flips to "authenticated".
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-arcade-bg bg-arcade-grid px-4 py-10">
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-arcade text-2xl leading-tight glow-text-gold sm:text-3xl"
        >
          MONSTER
          <br />
          GACHA
        </motion.h1>
        <p className="mt-3 text-xs text-zinc-500 sm:text-sm">
          Summon. Evolve. Conquer the dungeons.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          {PREVIEW_CREATURES.map(({ icon: Icon, gradient, delay }, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay }}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl border border-gold bg-gradient-to-b glow-border-gold sm:h-20 sm:w-20",
                gradient
              )}
            >
              <Icon className="h-8 w-8 text-gold-bright sm:h-9 sm:w-9" />
            </motion.div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-10 flex w-full flex-col gap-3 text-left">
          <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
            <User className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              autoComplete="username"
              required
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
            />
          </label>

          <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
            <Lock className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Contraseña"
              autoComplete="current-password"
              required
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
            />
          </label>

          {error && <p className="px-1 text-xs text-red-500">{error}</p>}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={submitting}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-gold-ink shadow-md transition-opacity disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Entrando..." : "Entrar"}
          </motion.button>
        </form>

        <p className="mt-5 text-xs text-zinc-500">
          ¿Todavía no tenés cuenta?{" "}
          <Link href="/register" className="font-semibold text-neon hover:underline">
            Creá tu personaje
          </Link>
        </p>
      </div>
    </div>
  );
}
