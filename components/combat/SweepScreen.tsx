"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Sparkles } from "lucide-react";
import type { Creature, DungeonStage } from "@/types/game";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import { DUNGEON_STAGES, ITEM_CATALOG, pickWeightedTrainingItemId } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { grantItemOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { addGuildExpAction } from "@/app/actions/guild";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { CreatureSprite } from "@/components/ui/CreatureSprite";

interface SweepScreenProps {
  stage: DungeonStage;
  playerCreatures: Creature[];
  onExit: () => void;
  onResweep?: () => void;
}

export function SweepScreen({ stage, playerCreatures, onExit, onResweep }: SweepScreenProps) {
  const addGold = useGameStore((s) => s.addGold);
  const gainCreatureExp = useGameStore((s) => s.gainCreatureExp);
  const gainProfileExp = useGameStore((s) => s.gainProfileExp);
  const addSealCoins = useGameStore((s) => s.addSealCoins);
  const grantItem = useGameStore((s) => s.grantItem);
  const guild = useGameStore((s) => s.guild);

  const [sealCoinsDropped, setSealCoinsDropped] = useState(0);
  const [itemsDropped, setItemsDropped] = useState<{ itemId: string; quantity: number }[]>([]);
  const [expMultiplier, setExpMultiplier] = useState(1);

  useEffect(() => {
    const isExpEventStage = stage.id === getDailyExpEventStageId(stage.world, DUNGEON_STAGES);
    const multiplier = isExpEventStage ? 2 : 1;
    setExpMultiplier(multiplier);

    addGold(stage.rewardGold);
    playerCreatures.forEach((c) => gainCreatureExp(c.id, stage.rewardExp * multiplier));
    gainProfileExp(stage.rewardExp * multiplier);

    if (guild) {
      addGuildExpAction(guild.id, stage.rewardExp * multiplier).catch(() => {});
    }

    let sealCoins = 0;
    if (Math.random() * 100 < stage.equipmentDropChance) {
      sealCoins = 1;
      addSealCoins(1);
    }
    setSealCoinsDropped(sealCoins);

    const drops: { itemId: string; quantity: number }[] = [];
    const drop = (itemId: string, chance: number) => {
      if (Math.random() * 100 < chance) {
        grantItem(itemId, 1);
        grantItemOnServer(itemId, 1);
        const existing = drops.find((d) => d.itemId === itemId);
        if (existing) existing.quantity += 1;
        else drops.push({ itemId, quantity: 1 });
      }
    };

    drop("it-rotten-egg", 15);
    drop("it-chicken", 15);
    drop(pickWeightedTrainingItemId(), stage.equipmentDropChance);

    setItemsDropped(drops);
    syncProgressToServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center p-4">
      <GlowPanel accent="gold" className="w-full max-w-lg p-6 text-center lg:p-10">
        <Sparkles className="mx-auto mb-4 h-12 w-12 text-gold" />
        <h1 className="font-arcade text-2xl text-gold-bright lg:text-4xl">Auto-Clear Success!</h1>
        <p className="mt-2 text-sm text-zinc-400">Sector {stage.world}-{stage.worldStageNumber}: {stage.name}</p>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-arcade-border bg-arcade-panel-light p-4">
            <GoldCoinIcon className="mx-auto h-8 w-8" />
            <p className="mt-2 font-arcade text-lg text-foreground">+{stage.rewardGold}</p>
            <p className="text-[10px] uppercase text-zinc-500">Gold Earned</p>
          </div>
          <div className="rounded-xl border border-arcade-border bg-arcade-panel-light p-4">
            <Zap className="mx-auto h-8 w-8 text-sky-400" />
            <p className="mt-2 font-arcade text-lg text-foreground">+{stage.rewardExp * expMultiplier}</p>
            <p className="text-[10px] uppercase text-zinc-500">EXP Earned</p>
          </div>
        </div>

        <div className="mt-6 text-left">
          <p className="font-arcade text-xs uppercase text-zinc-500">Drops Received</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {sealCoinsDropped > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-arcade-border bg-arcade-panel-light p-2 pr-4">
                <SealCoinIcon className="h-6 w-6" />
                <span className="font-bold text-foreground">x{sealCoinsDropped}</span>
              </div>
            )}
            {itemsDropped.map((drop) => {
              const itemDef = ITEM_CATALOG.find((it) => it.id === drop.itemId);
              if (!itemDef) return null;
              return (
                <div key={drop.itemId} className="flex items-center gap-2 rounded-lg border border-arcade-border bg-arcade-panel-light p-2 pr-4">
                  <ItemIcon item={itemDef} className="h-6 w-6" />
                  <span className="font-bold text-foreground">x{drop.quantity}</span>
                </div>
              );
            })}
            {sealCoinsDropped === 0 && itemsDropped.length === 0 && (
              <p className="text-sm text-zinc-500 italic">No extra drops this time.</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-left">
          <p className="font-arcade text-xs uppercase text-zinc-500">Team Progress</p>
          <div className="mt-3 flex gap-4">
            {playerCreatures.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-arcade-border bg-arcade-panel-light p-3 flex-1">
                <CreatureSprite creature={c} className="h-10 w-10" />
                <div>
                  <p className="font-bold text-sm text-foreground">{c.name}</p>
                  <p className="text-xs text-sky-400">+{stage.rewardExp * expMultiplier} EXP</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {onResweep && (
            <PixelButton variant="neon" className="w-full py-4 text-lg" onClick={onResweep}>
              Re-Sweep
            </PixelButton>
          )}
          <PixelButton variant="gold" className="w-full py-4 text-lg" onClick={onExit}>
            Continue
          </PixelButton>
        </div>
      </GlowPanel>
    </div>
  );
}
