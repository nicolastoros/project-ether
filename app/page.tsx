"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Flame, Droplet, Leaf, Loader2 } from "lucide-react";
import { useGameStore, type AuthProvider } from "@/lib/store";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { DiscordIcon } from "@/components/icons/DiscordIcon";
import { cn } from "@/lib/utils";

const PREVIEW_CREATURES = [
  { icon: Flame, gradient: ELEMENT_GRADIENT.Fire, delay: 0 },
  { icon: Droplet, gradient: ELEMENT_GRADIENT.Water, delay: 0.2 },
  { icon: Leaf, gradient: ELEMENT_GRADIENT.Nature, delay: 0.4 },
] as const;

export default function LandingPage() {
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const isAuthenticated = useGameStore((s) => s.auth.isAuthenticated);
  const login = useGameStore((s) => s.login);
  const router = useRouter();
  const [connecting, setConnecting] = useState<AuthProvider | null>(null);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/hub");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const handleConnect = (provider: AuthProvider) => {
    if (connecting) return;
    setConnecting(provider);
    setTimeout(() => {
      login(provider);
      router.replace("/hub");
    }, 1100);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-arcade-bg bg-arcade-grid px-4 py-10">
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

        <div className="mt-10 flex w-full flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={connecting !== null}
            onClick={() => handleConnect("google")}
            className="rounded-full flex items-center justify-center gap-3 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-md border border-arcade-border transition-opacity disabled:opacity-60"
          >
            {connecting === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            {connecting === "google" ? "Connecting to Google..." : "Continue with Google"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            disabled={connecting !== null}
            onClick={() => handleConnect("discord")}
            className="rounded-full flex items-center justify-center gap-3 bg-[#5865F2] px-5 py-3 text-sm font-semibold text-white shadow-md transition-opacity disabled:opacity-60"
          >
            {connecting === "discord" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <DiscordIcon className="h-4 w-4" />
            )}
            {connecting === "discord" ? "Connecting to Discord..." : "Continue with Discord"}
          </motion.button>
        </div>

        <p className="mt-6 text-[10px] leading-relaxed text-zinc-600">
          Prototype build — mock authentication only, no real account is created.
        </p>
      </div>
    </div>
  );
}
