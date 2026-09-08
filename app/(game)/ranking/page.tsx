"use client";

import { useEffect, useState } from "react";
import { Crown, Gauge, Medal, PawPrint, Trophy, UserCircle2 } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { applyAwakenBump, RARITY_BORDER_CLASS, STARTER_CREATURES } from "@/lib/gameData";
import type { Creature } from "@/types/game";
import { cn, formatNumber } from "@/lib/utils";

interface TopCreature {
  creatureId: string;
  level: number;
  awakenLevel: number;
  power: number;
}

interface RankingEntry {
  userId: string;
  username: string;
  displayName: string;
  tamerLevel: number;
  totalPower: number;
  creaturesUnlocked: number;
  topCreatures: TopCreature[];
}

// Gold/silver/bronze accents for #1-3 on top of the shared rainbow-border treatment — so even
// within the top 3, first place still reads as a clear step above second and third.
const RANK_ACCENT: Record<number, { icon: typeof Crown; className: string }> = {
  1: { icon: Crown, className: "text-amber-400" },
  2: { icon: Medal, className: "text-zinc-300" },
  3: { icon: Medal, className: "text-orange-500" },
};

const CATALOG_BY_ID = new Map(STARTER_CREATURES.map((c) => [c.id, c]));

// CreatureSprite only actually reads name/element/rarity/spriteFolder/animationFrames/
// potentialNodes off a Creature — level/exp/baseStats etc are along for the ride to satisfy the
// type, not shown. Rarity re-derives the Awaken bump (SSR -> Mythic) the same way every other
// creature card in the app does, so an awakened Digimon shows its real aura here too.
function displayCreature(tc: TopCreature): Creature | null {
  const base = CATALOG_BY_ID.get(tc.creatureId);
  if (!base) return null;
  const rarity = tc.awakenLevel >= 1 ? applyAwakenBump(base.rarity, base.baseStats).rarity : base.rarity;
  return { ...base, level: tc.level, rarity, potentialNodes: [] };
}

export default function RankingPage() {
  const myUserId = useGameStore((s) => s.profile.id);
  const isAdmin = useGameStore((s) => s.profile.isAdmin);
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/ranking");
      const data = res.ok ? await res.json() : null;
      setRanking(data?.ranking ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 font-arcade text-lg glow-text-gold sm:text-xl lg:text-2xl">
          <Trophy className="h-5 w-5 sm:h-6 sm:w-6" /> Global Ranking
        </h1>
        <p className="mt-1 text-sm text-zinc-600 sm:text-base">
          Every Tamer ranked by total power — climb the board by leveling, awakening, and
          collecting more creatures.
        </p>
        {isAdmin && (
          <p className="mt-1 text-xs text-zinc-500">
            Admin accounts aren&apos;t included in the ranking (they start with every creature).
          </p>
        )}
      </div>

      {loading ? (
        <GlowPanel accent="none" className="flex h-40 items-center justify-center text-sm text-zinc-500">
          Loading ranking...
        </GlowPanel>
      ) : !ranking || ranking.length === 0 ? (
        <GlowPanel accent="none" className="flex h-40 items-center justify-center text-sm text-zinc-500">
          No ranked Tamers yet.
        </GlowPanel>
      ) : (
        <div className="space-y-2.5">
          {ranking.map((entry, i) => {
            const rank = i + 1;
            const isTop3 = rank <= 3;
            const isMe = entry.userId === myUserId;
            const accent = RANK_ACCENT[rank];

            const row = (
              <GlowPanel
                accent="none"
                className={cn(
                  "flex flex-col gap-2.5 p-3 sm:p-4",
                  isMe && !isTop3 && "border-neon shadow-[0_0_0_2px_rgba(13,148,136,0.2)]"
                )}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center font-arcade text-sm font-bold text-zinc-500 sm:h-10 sm:w-10 sm:text-base">
                    {accent ? <accent.icon className={cn("h-6 w-6 sm:h-7 sm:w-7", accent.className)} /> : `#${rank}`}
                  </div>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light sm:h-11 sm:w-11">
                    <UserCircle2 className="h-5 w-5 text-zinc-400 sm:h-6 sm:w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground sm:text-base">
                      {entry.displayName}
                      {isMe && (
                        <span className="shrink-0 rounded-full bg-neon/15 px-1.5 py-0.5 font-arcade text-[9px] text-neon-ink">
                          YOU
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500 sm:text-xs">Tamer Lv.{entry.tamerLevel}</p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="inline-flex items-center gap-1 font-mono text-sm font-bold text-gold-bright sm:text-base">
                      <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {formatNumber(entry.totalPower)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 sm:text-[11px]">
                      <PawPrint className="h-3 w-3" />
                      {entry.creaturesUnlocked} unlocked
                    </span>
                  </div>
                </div>

                {isTop3 && entry.topCreatures.length > 0 && (
                  <div className="flex items-center gap-2 border-t border-arcade-border/60 pt-2.5 sm:gap-3">
                    <span className="shrink-0 font-arcade text-[9px] uppercase tracking-wide text-zinc-500 sm:text-[10px]">
                      Strongest
                    </span>
                    {entry.topCreatures.map((tc) => {
                      const creature = displayCreature(tc);
                      if (!creature) return null;
                      return (
                        <div
                          key={tc.creatureId}
                          className={cn(
                            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 bg-arcade-panel-light sm:h-12 sm:w-12",
                            RARITY_BORDER_CLASS[creature.rarity]
                          )}
                          title={`${creature.name} · Lv.${tc.level}`}
                        >
                          <CreatureSprite creature={creature} className="h-8 w-8 sm:h-9 sm:w-9" />
                          <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-black/80 px-1 font-mono text-[8px] font-bold text-white">
                            {tc.level}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlowPanel>
            );

            if (!isTop3) return <div key={entry.userId}>{row}</div>;

            return (
              <div key={entry.userId} className="rainbow-border rounded-[1.25rem] p-[3px]">
                {row}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
