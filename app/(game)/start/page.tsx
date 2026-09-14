"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

// Dokkan-style mode-select hub — the sidebar's "Start" entry (lib/navigation.ts) lands here
// instead of linking straight into a mode, so new modes join this screen instead of piling up
// as more top-level sidebar items forever. Adventure/Survivor are real, already-built features
// (/campaign, /survival) just relocated behind this one door; Overclock/Infinite Tower are
// placeholders — their own build is a separate, later task, so they render locked here rather
// than linking anywhere yet.
interface GameMode {
  id: string;
  src: string;
  width: number;
  height: number;
  href: string | null;
  glow: string; // an rgba() used for both the ambient backdrop glow and the border/shadow tint
}

const GAME_MODES: GameMode[] = [
  { id: "adventure", src: "/assets/ui/adventure_mode.png", width: 1971, height: 798, href: "/campaign", glow: "rgba(255,184,77,0.55)" },
  { id: "survivor", src: "/assets/ui/survivor_mode.png", width: 2172, height: 724, href: "/survival", glow: "rgba(239,68,68,0.55)" },
  { id: "overclock", src: "/assets/ui/overclock_mode.png", width: 2172, height: 724, href: "/overclock", glow: "rgba(56,189,248,0.55)" },
  { id: "infinite-tower", src: "/assets/ui/infinite_tower_mode.png", width: 2160, height: 728, href: null, glow: "rgba(96,165,250,0.55)" },
];

function ModeCard({ mode, t }: { mode: GameMode; t: ReturnType<typeof useT> }) {
  const comingSoon = !mode.href;

  const card = (
    <motion.div
      whileHover={comingSoon ? undefined : { scale: 1.03 }}
      whileTap={comingSoon ? undefined : { scale: 0.98 }}
      className="relative h-full"
    >
      {/* Ambient color glow behind the banner, matching its own palette — static (not animated)
          so 4 of these sitting together stays calm rather than busy. */}
      <div
        className="absolute inset-6 -z-10 rounded-full blur-2xl opacity-40"
        style={{ background: mode.glow }}
        aria-hidden
      />
      {/* h-full + centered flex — the 4 banner PNGs don't share an aspect ratio (Adventure's is
          noticeably taller than Survivor's own wider crop), so without this each row's shorter
          banner would sit top-aligned in a CSS-grid-stretched row instead of vertically centered
          against its taller neighbor, reading as "misaligned" even though the grid row itself is
          the same height for both. */}
      <div className="relative flex h-full items-center justify-center overflow-hidden rounded-2xl p-2 sm:p-3">
        <Image
          src={mode.src}
          alt={mode.id}
          width={mode.width}
          height={mode.height}
          className={cn("h-auto w-full object-contain", comingSoon && "opacity-45 grayscale")}
        />
        {comingSoon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="flex items-center gap-1.5 rounded-full bg-black/80 px-4 py-2 font-arcade text-[10px] uppercase tracking-wide text-white sm:text-xs">
              <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t("common.coming_soon")}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );

  if (comingSoon) {
    return (
      <div aria-disabled className="cursor-not-allowed select-none">
        {card}
      </div>
    );
  }

  return (
    <Link href={mode.href!} className="block">
      {card}
    </Link>
  );
}

export default function StartPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">{t("nav.start")}</h1>
        <p className="mt-1 text-xs text-zinc-500">{t("start.subtitle")}</p>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
        {GAME_MODES.map((mode) => (
          <ModeCard key={mode.id} mode={mode} t={t} />
        ))}
      </div>
    </div>
  );
}
