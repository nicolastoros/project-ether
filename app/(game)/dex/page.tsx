"use client";

import { useMemo, useState } from "react";
import { GACHA_CREATURE_POOL } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureDetailModal } from "@/components/monsters/CreatureDetailModal";
import { cn } from "@/lib/utils";

export default function DexPage() {
  const ownedCreatures = useGameStore((s) => s.creatures);
  const activeCreatureId = useGameStore((s) => s.activeCreatureId);
  const setActiveCreature = useGameStore((s) => s.setActiveCreature);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const ownedById = useMemo(() => new Map(ownedCreatures.map((c) => [c.id, c])), [ownedCreatures]);
  const selectedOwned = selectedId ? ownedById.get(selectedId) ?? null : null;
  const ownedCount = GACHA_CREATURE_POOL.filter((c) => ownedById.has(c.id)).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Dex</h1>
        {/* One single string expression, not JSX text broken up by {expr} — some combination of
            this file's JSX text nodes and the em dash character was silently dropping the space
            immediately before it (confirmed via the rendered DOM, not just visually) when written
            as plain JSX children. */}
        <p className="mt-1 text-xs text-zinc-500">
          {`${ownedCount}/${GACHA_CREATURE_POOL.length} discovered — every creature in the Digital World, whether you've met them yet or not.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {GACHA_CREATURE_POOL.map((entry) => {
          const owned = ownedById.get(entry.id);
          const isOwned = !!owned;
          return (
            <button
              key={entry.id}
              type="button"
              disabled={!isOwned}
              onClick={() => isOwned && setSelectedId(entry.id)}
              className={cn("text-left", !isOwned && "cursor-default")}
            >
              <GlowPanel
                accent="none"
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2.5 transition-all duration-200 sm:p-3",
                  isOwned && "hover:border-gold hover:-translate-y-1 hover:shadow-lg"
                )}
              >
                <div
                  className={cn(
                    "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border pixel-frame",
                    isOwned
                      ? cn("border-gold bg-gradient-to-b", ELEMENT_GRADIENT[entry.element])
                      : "border-arcade-border bg-arcade-panel-light"
                  )}
                >
                  <CreatureSprite creature={entry} locked={!isOwned} className="h-4/5 w-4/5 text-zinc-500" />
                </div>
                <div className="min-w-0 text-center">
                  <p className={cn("truncate text-xs font-semibold sm:text-sm", isOwned ? "text-foreground" : "text-zinc-500")}>
                    {entry.name}
                  </p>
                  {isOwned ? (
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <RarityBadge rarity={entry.rarity} />
                      {owned.copies > 1 && (
                        <span className="rounded-full border border-gold/60 bg-gold/10 px-1.5 py-0.5 font-arcade text-[8px] font-semibold text-gold-bright">
                          ×{owned.copies}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-400">Not discovered</p>
                  )}
                </div>
              </GlowPanel>
            </button>
          );
        })}
      </div>

      {/* Buffs from Dex completion are intentionally not implemented yet — deferred until the Dex
          itself ships and a threshold/reward shape is decided. When that lands, "owned count" is
          just GACHA_CREATURE_POOL.filter(c => ownedById.has(c.id)).length, already computed above
          as ownedCount — no new schema needed to support it. */}

      <CreatureDetailModal
        creature={selectedOwned}
        isActive={selectedOwned?.id === activeCreatureId}
        onClose={() => setSelectedId(null)}
        onSetActive={(id) => {
          setActiveCreature(id);
          setSelectedId(null);
        }}
      />
    </div>
  );
}
