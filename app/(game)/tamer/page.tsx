"use client";

import { useState } from "react";
import Image from "next/image";
import { Lock, Check } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { TAMER_EQUIPMENT_CATALOG, DUNGEON_STAGES } from "@/lib/gameData";
import { grantTamerEquipmentOnServer, syncProgressToServer } from "@/lib/syncProgress";
import type { TamerSlotType } from "@/types/game";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { cn } from "@/lib/utils";

// Head-to-toe, with the two cosmetic-only slots (no gear exists for them yet) trailing at the end.
const SLOT_ORDER: TamerSlotType[] = ["Hat", "Shoulders", "Chest", "Gloves", "Legs", "Shoes", "Aura", "Wings"];

function campaignClearLabel(stageId: string): string {
  const stage = DUNGEON_STAGES.find((s) => s.id === stageId);
  if (!stage) return "Clear a Campaign stage";
  return `Clear World ${stage.world}-${stage.worldStageNumber}`;
}

export default function TamerPage() {
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const sealCoins = useGameStore((s) => s.currencies.sealCoins);
  const craftTamerEquipment = useGameStore((s) => s.craftTamerEquipment);
  const [craftingId, setCraftingId] = useState<string | null>(null);

  const ownedBySlot = new Map(tamerInventory.map((t) => [t.slot, t]));

  function handleCraft(itemId: string) {
    setCraftingId(itemId);
    const crafted = craftTamerEquipment(itemId);
    if (crafted) {
      // Two separate server calls: the new owned piece (insert-if-missing) and the Seal Coin
      // balance that paid for it (covered by the generic progress sync).
      grantTamerEquipmentOnServer(itemId);
      syncProgressToServer();
    }
    setCraftingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Tamer</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Your own gear — separate from your Digimon&apos;s equipment.
          </p>
        </div>
        <CurrencyPill icon={<SealCoinIcon className="h-3.5 w-3.5" />} value={sealCoins} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SLOT_ORDER.map((slot) => {
          const owned = ownedBySlot.get(slot);
          const catalogItem = TAMER_EQUIPMENT_CATALOG.find((t) => t.slot === slot);

          if (owned) {
            return (
              <GlowPanel key={slot} accent="gold" className="flex flex-col items-center gap-2 p-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame">
                  <Image src={owned.icon} alt="" width={48} height={48} className="h-11 w-11 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="font-arcade text-xs font-bold text-foreground">{slot}</p>
                  <p className="truncate text-[9px] text-zinc-500">
                    {owned.name} · {owned.setName}
                  </p>
                </div>
                <RarityBadge rarity={owned.rarity} />
                <span className="inline-flex items-center gap-1 font-arcade text-[8px] uppercase text-emerald-600">
                  <Check className="h-2.5 w-2.5" /> Equipped
                </span>
              </GlowPanel>
            );
          }

          if (!catalogItem) {
            return (
              <GlowPanel
                key={slot}
                accent="none"
                className="flex flex-col items-center justify-center gap-2 p-3 text-center opacity-60"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-arcade-border">
                  <Lock className="h-5 w-5 text-zinc-400" />
                </div>
                <p className="font-arcade text-xs font-bold text-zinc-500">{slot}</p>
                <p className="text-[8px] text-zinc-400">No gear yet</p>
              </GlowPanel>
            );
          }

          const canCraft = catalogItem.source.kind === "craft";
          const cost = catalogItem.source.kind === "craft" ? catalogItem.source.sealCoinCost : null;
          const affordable = cost !== null && sealCoins >= cost;

          return (
            <GlowPanel
              key={slot}
              accent="none"
              className="flex flex-col items-center gap-2 p-3 text-center"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light pixel-frame">
                <Image
                  src={catalogItem.icon}
                  alt=""
                  width={48}
                  height={48}
                  className="h-11 w-11 object-contain opacity-40 grayscale"
                />
                <Lock className="absolute h-5 w-5 text-zinc-500" />
              </div>
              <div className="min-w-0">
                <p className="font-arcade text-xs font-bold text-zinc-500">{slot}</p>
                <p className="truncate text-[9px] text-zinc-400">
                  {catalogItem.name} · {catalogItem.setName}
                </p>
              </div>
              {canCraft ? (
                <>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-mono text-[10px] font-semibold",
                      affordable ? "text-foreground" : "text-red-500"
                    )}
                  >
                    <SealCoinIcon className="h-3 w-3" /> {cost}
                  </span>
                  <PixelButton
                    size="sm"
                    variant="gold"
                    disabled={!affordable || craftingId === catalogItem.id}
                    onClick={() => handleCraft(catalogItem.id)}
                    className="w-full"
                  >
                    Craft
                  </PixelButton>
                </>
              ) : catalogItem.source.kind === "campaign-clear" ? (
                <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500">
                  {campaignClearLabel(catalogItem.source.stageId)}
                </p>
              ) : null}
            </GlowPanel>
          );
        })}
      </div>
    </div>
  );
}
