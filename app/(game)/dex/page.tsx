"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";
import { GACHA_CREATURE_POOL } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { BackButton } from "@/components/ui/BackButton";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { LegendaryCardAura } from "@/components/ui/MythicCardAura";
import { CreatureDetailModal } from "@/components/monsters/CreatureDetailModal";
import { cn } from "@/lib/utils";

// Full-art foil cards for a handful of standout creatures — each already has an ornate rainbow
// frame baked into the artwork itself; LegendaryCardAura (the same rotating-prism shimmer used
// for LR rarity elsewhere) is layered on top so the frame actually catches light instead of
// sitting static. Preview set for now — extend this map as more card art gets added.
const LEGENDARY_CARD_ART: Record<string, string> = {
  "cr-omega": "/assets/cards/omega.jpg",
  "cr-poseidon": "/assets/cards/poseidon.jpg",
  "cr-magnagold": "/assets/cards/magnagold.jpg",
  "cr-abaddo": "/assets/cards/abaddo.jpg",
  "cr-gallantknight": "/assets/cards/gallant_knight.jpg",
};

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
      <div className="flex items-center gap-2 lg:gap-4">
        <BackButton href="/formations" label="Back to Formation Menu" />
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
      </div>

      {Object.keys(LEGENDARY_CARD_ART).length > 0 && (
        <div>
          <p className="font-arcade text-xs uppercase tracking-wide text-zinc-500">Legendary Cards</p>
          <div className="mt-2 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 lg:grid-cols-5">
            {Object.entries(LEGENDARY_CARD_ART).map(([creatureId, art]) => {
              const entry = GACHA_CREATURE_POOL.find((c) => c.id === creatureId);
              if (!entry) return null;
              const isOwned = ownedById.has(creatureId);
              return (
                <button
                  key={creatureId}
                  type="button"
                  disabled={!isOwned}
                  onClick={() => isOwned && setSelectedId(creatureId)}
                  className={cn("relative shrink-0 w-36 overflow-hidden rounded-2xl sm:w-full", isOwned ? "cursor-pointer" : "cursor-default")}
                >
                  <Image
                    src={art}
                    alt={entry.name}
                    width={1024}
                    height={1024}
                    className={cn("aspect-square w-full rounded-2xl object-cover transition-all", !isOwned && "grayscale opacity-40")}
                  />
                  {isOwned && <LegendaryCardAura />}
                  {!isOwned && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Lock className="h-6 w-6 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
                    </span>
                  )}
                  <p
                    className={cn(
                      "absolute inset-x-0 bottom-0 truncate rounded-b-2xl bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-semibold text-white",
                      !isOwned && "opacity-70"
                    )}
                  >
                    {entry.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
