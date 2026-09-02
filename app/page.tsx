"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Loader2, Lock, User } from "lucide-react";
import Link from "next/link";
import { loadAccountIntoStore } from "@/lib/loadAccount";

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
      setError("Incorrect username or password.");
      setSubmitting(false);
      return;
    }
    // The effect above takes it from here once `status` flips to "authenticated".
  };

  return (
    // overflow-y-auto (not -hidden) is the safety net: the sizes below are tuned to fit without
    // scrolling on common ~900px-tall laptop screens, but a short+wide edge case (e.g. a 1536px-
    // wide, ~860px-tall display) should scroll to reach the form rather than have it clipped away
    // entirely, which is what -hidden would do.
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-arcade-bg bg-arcade-grid px-4 py-10">
      {/* Not capped at max-w-sm like the form below — the logo and hero art are free to keep
          growing on wide screens instead of sitting small in a sea of empty space, while the
          form itself (its own max-w-sm further down) stays a sane width for text inputs. */}
      <div className="relative flex w-full flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="/assets/digital_resonance_transparent.png"
            alt="Digital Resonance"
            width={1774}
            height={887}
            priority
            className="h-auto w-64 sm:w-80 lg:w-[22rem] xl:w-[25rem] 2xl:w-[30rem]"
          />
        </motion.div>
        <p className="-mt-1 text-xs text-zinc-500 sm:text-sm lg:text-base">
          Summon. Evolve. Conquer the dungeons.
        </p>

        {/* Group shot of the game's own creatures, in battle poses — gives the splash screen the
            "Digimon key art" feel the logo alone doesn't. public/assets/back_home_1.png already
            has a soft transparent vignette (no card/frame needed around it). */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-4 w-full max-w-[19rem] sm:max-w-sm lg:max-w-md xl:max-w-lg 2xl:max-w-2xl"
        >
          <Image
            src="/assets/back_home_1.png"
            alt=""
            width={1536}
            height={1024}
            priority
            className="h-auto w-full drop-shadow-[0_16px_28px_rgba(20,30,60,0.35)]"
          />
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-6 flex w-full max-w-sm flex-col gap-3 text-left">
          <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
            <User className="h-4 w-4 shrink-0 text-zinc-500" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
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
              placeholder="Password"
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
            {submitting ? "Logging in..." : "Log In"}
          </motion.button>
        </form>

        <p className="mt-5 max-w-sm text-xs text-zinc-500 lg:text-sm">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="font-semibold text-neon hover:underline">
            Create your character
          </Link>
        </p>
        <p className="mt-2 max-w-sm text-xs text-zinc-500 lg:text-sm">
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-semibold text-gold-bright hover:underline">
            Recover account
          </Link>
        </p>
      </div>
    </div>
  );
}
