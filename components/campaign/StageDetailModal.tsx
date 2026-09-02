"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { X, Lock, Zap } from "lucide-react";
import type { DifficultyTier, DungeonStage, DungeonDifficulty } from "@/types/game";
import { DUNGEON_STAGES, ITEM_CATALOG, TAMER_EQUIPMENT_CATALOG } from "@/lib/gameData";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import { getStageEnemyTeam } from "@/lib/campaignEnemies";
import { DIFFICULTY_TIERS, getTierStage, isTierUnlocked, tierStageId } from "@/lib/difficultyTiers";
import { useGameStore } from "@/lib/store";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { cn, formatNumber } from "@/lib/utils";

const DIFFICULTY_STYLES: Record<DungeonDifficulty, string> = {
  Normal: "bg-rarity-rare",
  Hard: "bg-rarity-ssr",
  Nightmare: "bg-rarity-mythic",
};

// Distinct from DIFFICULTY_STYLES above (that's the cosmetic Normal/Hard/Nightmare badge) — these
// color the new Easy/Medium/Hard/Super tier pills.
const TIER_PILL_STYLES: Record<DifficultyTier, string> = {
  Easy: "border-rarity-common text-rarity-common data-[selected=true]:bg-rarity-common",
  Medium: "border-rarity-rare text-rarity-rare data-[selected=true]:bg-rarity-rare",
  Hard: "border-rarity-ssr text-rarity-ssr data-[selected=true]:bg-rarity-ssr",
  Super: "border-rarity-mythic text-rarity-mythic data-[selected=true]:bg-rarity-mythic",
};

// Every stage can drop these three training items alongside its own Tamer-gear piece (if any).
const STANDARD_DROP_ITEM_IDS = ["it-training-dumbbell", "it-training-trx", "it-training-box"];

interface StageDetailModalProps {
  stage: DungeonStage | null;
  onClose: () => void;
}

export function StageDetailModal({ stage, onClose }: StageDetailModalProps) {
  const dungeon = useGameStore((s) => s.dungeon);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier>("Easy");
  // Tracks which stage the current selectedTier was computed for, so it only resets when a
  // (possibly different) stage opens — an unrelated dungeon-state re-render shouldn't stomp a
  // tier the player just picked by hand. Adjusting state during render like this (rather than in
  // an effect) is React's recommended pattern for "reset state when a prop changes".
  const [tierDefaultedForStageId, setTierDefaultedForStageId] = useState<string | null>(null);
  if (stage && stage.id !== tierDefaultedForStageId) {
    setTierDefaultedForStageId(stage.id);
    const highestUnlocked = [...DIFFICULTY_TIERS].reverse().find((t) => isTierUnlocked(stage, t, dungeon));
    setSelectedTier(highestUnlocked ?? "Easy");
  }

  // `stage` (the base, Easy-tier object) still drives everything tier-independent — world/name,
  // whether the stage has real battle content at all, drop tables. `displayStage` is the
  // tier-scaled variant (rewards only — enemy stat scaling itself lives in getStageEnemyTeam)
  // used for the numbers shown and the Battle button's link.
  const displayStage = stage ? getTierStage(stage, selectedTier) : null;
  const isExpEvent = stage ? stage.id === getDailyExpEventStageId(stage.world, DUNGEON_STAGES) : false;
  // A stage is battle-ready once its world has a defined enemy line-up (lib/campaignEnemies.ts)
  // — the same check BattlePage.tsx uses to decide whether to fall back to the sandbox placeholder.
  const isPlayable = stage ? getStageEnemyTeam(stage) !== null : false;
  const isSelectedTierLocked = stage ? !isTierUnlocked(stage, selectedTier, dungeon) : true;

  const specificGear = stage
    ? TAMER_EQUIPMENT_CATALOG.filter((t) => t.source.kind === "campaign-clear" && t.source.stageId === stage.id)
    : [];
  const standardDrops = STANDARD_DROP_ITEM_IDS.map((id) => ITEM_CATALOG.find((it) => it.id === id)).filter(
    (it): it is NonNullable<typeof it> => Boolean(it)
  );

  return (
    <AnimatePresence>
      {stage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-sm rounded-3xl border border-arcade-border bg-arcade-panel p-4 shadow-xl lg:max-w-lg lg:rounded-[2rem] lg:p-7 xl:max-w-xl xl:p-8 2xl:max-w-2xl 2xl:p-9"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm transition-colors hover:text-foreground lg:right-5 lg:top-5 lg:h-10 lg:w-10"
            >
              <X className="h-4 w-4 lg:h-5 lg:w-5" />
            </button>

            <p className="text-[10px] uppercase tracking-wide text-zinc-500 lg:text-sm">
              World {stage.world}-{stage.worldStageNumber}
            </p>
            <h2 className="text-xl font-bold text-foreground lg:text-3xl xl:text-4xl">{stage.name}</h2>

            <span
              className={cn(
                "mt-2 inline-flex items-center rounded-full px-2 py-0.5 font-arcade text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm lg:px-3 lg:py-1 lg:text-xs",
                DIFFICULTY_STYLES[stage.difficulty]
              )}
            >
              {stage.difficulty}
            </span>

            {isExpEvent && (
              <p className="mt-2 flex items-center gap-1 font-arcade text-[9px] font-semibold uppercase tracking-wide text-sky-500 lg:text-xs">
                <Zap className="h-3 w-3 fill-current lg:h-4 lg:w-4" /> 2x EXP Event Today
              </p>
            )}

            {isPlayable && (
              <div className="mt-3 flex gap-1.5 lg:mt-5 lg:gap-2">
                {DIFFICULTY_TIERS.map((tier) => {
                  const unlocked = isTierUnlocked(stage, tier, dungeon);
                  const selected = tier === selectedTier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => setSelectedTier(tier)}
                      data-selected={selected}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1 rounded-lg border-2 py-1.5 font-arcade text-[9px] font-semibold uppercase tracking-wide transition-colors lg:rounded-xl lg:py-2.5 lg:text-xs",
                        unlocked
                          ? cn(TIER_PILL_STYLES[tier], selected && "text-white shadow-sm")
                          : "cursor-not-allowed border-arcade-border text-zinc-400"
                      )}
                    >
                      {unlocked ? tier : <Lock className="h-3 w-3 lg:h-3.5 lg:w-3.5" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 text-center lg:mt-6 lg:gap-4">
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2 lg:rounded-2xl lg:py-5">
                <Zap className="mx-auto h-3.5 w-3.5 text-neon lg:h-6 lg:w-6" />
                <p className="mt-1 text-xs font-semibold text-foreground lg:mt-2 lg:text-lg xl:text-xl">{stage.staminaCost}</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500 lg:text-xs">Stamina</p>
              </div>
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2 lg:rounded-2xl lg:py-5">
                <GoldCoinIcon className="mx-auto h-3.5 w-3.5 lg:h-6 lg:w-6" />
                <p className="mt-1 text-xs font-semibold text-foreground lg:mt-2 lg:text-lg xl:text-xl">{formatNumber(displayStage?.rewardGold ?? stage.rewardGold)}</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500 lg:text-xs">Gold</p>
              </div>
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2 lg:rounded-2xl lg:py-5">
                <SealCoinIcon className="mx-auto h-3.5 w-3.5 lg:h-6 lg:w-6" />
                <p className="mt-1 text-xs font-semibold text-foreground lg:mt-2 lg:text-lg xl:text-xl">{displayStage?.equipmentDropChance ?? stage.equipmentDropChance}%</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500 lg:text-xs">Seal Coin</p>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-zinc-500 lg:mt-5 lg:text-sm">
              Recommended power: {formatNumber(stage.recommendedPower)}
            </p>

            <div className="mt-4 rounded-xl border border-arcade-border bg-arcade-panel-light p-3 lg:mt-6 lg:rounded-2xl lg:p-5">
              <p className="text-center text-[10px] uppercase tracking-wide text-zinc-500 mb-2 lg:text-xs lg:mb-3">Possible Drops</p>
              <div className="flex flex-wrap justify-center gap-2 lg:gap-4">
                {specificGear.map((gear) => (
                  <div key={gear.id} className="flex w-12 flex-col items-center gap-1 lg:w-24">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/10 border border-gold/30 lg:h-20 lg:w-20 lg:rounded-xl">
                      <Image src={gear.icon} alt={gear.name} width={28} height={28} className="object-contain lg:h-11 lg:w-11" />
                    </div>
                    <p className="hidden w-full truncate text-center text-[10px] font-medium text-zinc-600 lg:line-clamp-2 lg:block lg:whitespace-normal lg:text-xs lg:leading-snug">
                      {gear.name}
                    </p>
                  </div>
                ))}
                {standardDrops.map((item) => (
                  <div key={item.id} className="flex w-12 flex-col items-center gap-1 lg:w-24">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-arcade-border lg:h-20 lg:w-20 lg:rounded-xl">
                      {item.icon && (
                        <Image src={item.icon} alt={item.name} width={28} height={28} className="object-contain opacity-80 lg:h-11 lg:w-11" />
                      )}
                    </div>
                    <p className="hidden w-full truncate text-center text-[10px] font-medium text-zinc-600 lg:line-clamp-2 lg:block lg:whitespace-normal lg:text-xs lg:leading-snug">
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {isSelectedTierLocked ? (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-arcade-panel-light py-3 font-arcade text-xs uppercase text-zinc-500 lg:mt-6 lg:py-4 lg:text-sm">
                <Lock className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                {selectedTier === "Easy" ? "Clear the previous stage first" : "Clear the previous difficulty on this stage first"}
              </div>
            ) : isPlayable ? (
              <Link href={`/combat?stage=${tierStageId(stage.id, selectedTier)}`} className="mt-4 block lg:mt-6" onClick={onClose}>
                <PixelButton variant="gold" className="w-full lg:py-4 lg:text-base">
                  {Boolean(dungeon.stageStars[tierStageId(stage.id, selectedTier)])
                    ? "Replay"
                    : stage.worldStageNumber === 8
                      ? "Boss Battle"
                      : "Battle"}
                </PixelButton>
              </Link>
            ) : (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-arcade-panel-light py-3 font-arcade text-xs uppercase text-zinc-500 lg:mt-6 lg:py-4 lg:text-sm">
                Coming soon
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
