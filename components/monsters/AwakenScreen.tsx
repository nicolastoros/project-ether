"use client";

import Image from "next/image";
import { X, ArrowRight, Sparkles } from "lucide-react";
import type { Creature } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { AWAKEN_COST, applyAwakenBump } from "@/lib/gameData";
import { consumeItemOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STAT_ROWS = [
  ["HP", "hp"],
  ["ATK", "atk"],
  ["DEF", "def"],
  ["SPD", "spd"],
] as const;

export function AwakenScreen({ creature, onClose }: { creature: Creature; onClose: () => void }) {
  const liveCreature = useGameStore((s) => s.creatures.find((c) => c.id === creature.id)) || creature;
  const ownedCoins = useGameStore((s) => s.ownedItems.find((o) => o.itemId === "it-awaken-coin")?.quantity ?? 0);
  const awakenCreature = useGameStore((s) => s.awakenCreature);

  const alreadyAwakened = (liveCreature.awakenLevel ?? 0) >= 1;
  const eligible = liveCreature.rarity === "SSR";
  const preview = applyAwakenBump(liveCreature.rarity, liveCreature.baseStats);
  const canAfford = ownedCoins >= AWAKEN_COST;

  const handleAwaken = () => {
    if (!awakenCreature(liveCreature.id)) {
      toast.error("Couldn't Awaken — check coins and eligibility.");
      return;
    }
    consumeItemOnServer("it-awaken-coin", AWAKEN_COST);
    syncProgressToServer();
    toast.success(`${liveCreature.name} has Awakened!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white sm:p-6 md:p-12">
      <div className="flex shrink-0 items-center justify-between border-b border-arcade-border/50 bg-arcade-panel/50 p-4 backdrop-blur-md sm:rounded-t-3xl sm:border">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-b", ELEMENT_GRADIENT[liveCreature.element])}>
            <CreatureSprite creature={liveCreature} className="h-8 w-8 drop-shadow-md" />
          </div>
          <div>
            <h2 className="font-arcade text-lg text-gold-bright">Awaken</h2>
            <p className="text-xs text-zinc-400">{liveCreature.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-zinc-400 transition-colors hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto p-4 sm:rounded-b-3xl sm:border sm:border-t-0 sm:border-arcade-border/50 sm:p-8">
        {!eligible ? (
          <div className="m-auto max-w-sm text-center text-sm text-zinc-400">
            {alreadyAwakened || liveCreature.rarity === "Mythic" || liveCreature.rarity === "LR"
              ? "This creature can't Awaken any further yet — Mythic to LR isn't available today."
              : "Only SSR creatures can Awaken right now."}
          </div>
        ) : (
          <div className="flex w-full max-w-md flex-col items-center gap-6">
            <div className="flex w-full items-center justify-center gap-4 sm:gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className={cn("flex h-24 w-24 items-center justify-center rounded-2xl border border-arcade-border/50 bg-gradient-to-b", ELEMENT_GRADIENT[liveCreature.element])}>
                  <CreatureSprite creature={liveCreature} className="h-16 w-16" />
                </div>
                <RarityBadge rarity={liveCreature.rarity} />
              </div>
              <ArrowRight className="h-6 w-6 shrink-0 text-gold-bright" />
              <div className="flex flex-col items-center gap-2">
                <div className={cn("relative flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-gold/60 bg-gradient-to-b shadow-[0_0_20px_-4px_rgba(255,184,77,0.7)]", ELEMENT_GRADIENT[liveCreature.element])}>
                  <Sparkles className="absolute -right-1.5 -top-1.5 h-5 w-5 text-gold-bright" />
                  <CreatureSprite creature={liveCreature} className="h-16 w-16" />
                </div>
                <RarityBadge rarity={preview.rarity} />
              </div>
            </div>

            <div className="grid w-full grid-cols-4 gap-2 text-center">
              {STAT_ROWS.map(([label, key]) => (
                <div key={key} className="rounded-xl border border-arcade-border/50 bg-arcade-panel-light/10 px-1 py-2">
                  <p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-400 line-through">{liveCreature.baseStats[key]}</p>
                  <p className="font-mono text-sm font-bold text-gold-bright">{preview.baseStats[key]}</p>
                </div>
              ))}
            </div>

            <div className="flex w-full items-center justify-between rounded-xl border border-arcade-border/50 bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <Image src="/assets/objects/awaken_coin.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                <span className="text-sm font-semibold">Awaken Coins</span>
              </div>
              <span className={cn("font-mono text-sm font-bold", canAfford ? "text-foreground" : "text-red-400")}>
                {ownedCoins} / {AWAKEN_COST}
              </span>
            </div>

            <PixelButton
              variant="gold"
              className="w-full bg-gradient-to-r from-amber-500 to-gold-bright"
              disabled={!canAfford}
              onClick={handleAwaken}
            >
              {canAfford ? `Awaken (${AWAKEN_COST} coins)` : "Not enough coins"}
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
