"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { X, Lock, Zap } from "lucide-react";
import type { DungeonStage, DungeonDifficulty } from "@/types/game";
import { DUNGEON_STAGES, TAMER_EQUIPMENT_CATALOG } from "@/lib/gameData";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import { getStageEnemyTeam } from "@/lib/campaignEnemies";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { cn, formatNumber } from "@/lib/utils";

const DIFFICULTY_STYLES: Record<DungeonDifficulty, string> = {
  Normal: "bg-rarity-rare",
  Hard: "bg-rarity-ssr",
  Nightmare: "bg-rarity-mythic",
};

interface StageDetailModalProps {
  stage: DungeonStage | null;
  onClose: () => void;
}

export function StageDetailModal({ stage, onClose }: StageDetailModalProps) {
  const isExpEvent = stage ? stage.id === getDailyExpEventStageId(stage.world, DUNGEON_STAGES) : false;
  // A stage is battle-ready once its world has a defined enemy line-up (lib/campaignEnemies.ts)
  // — the same check BattlePage.tsx uses to decide whether to fall back to the sandbox placeholder.
  const isPlayable = stage ? getStageEnemyTeam(stage) !== null : false;

  const specificGear = stage
    ? TAMER_EQUIPMENT_CATALOG.filter((t) => t.source.kind === "campaign-clear" && t.source.stageId === stage.id)
    : [];

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
            className="relative w-full max-w-sm rounded-3xl border border-arcade-border bg-arcade-panel p-4 shadow-xl"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-[10px] uppercase tracking-wide text-zinc-500">
              World {stage.world}-{stage.worldStageNumber}
            </p>
            <h2 className="text-xl font-bold text-foreground">{stage.name}</h2>

            <span
              className={cn(
                "mt-2 inline-flex items-center rounded-full px-2 py-0.5 font-arcade text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm",
                DIFFICULTY_STYLES[stage.difficulty]
              )}
            >
              {stage.difficulty}
            </span>

            {isExpEvent && (
              <p className="mt-2 flex items-center gap-1 font-arcade text-[9px] font-semibold uppercase tracking-wide text-sky-500">
                <Zap className="h-3 w-3 fill-current" /> 2x EXP Event Today
              </p>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2">
                <Zap className="mx-auto h-3.5 w-3.5 text-neon" />
                <p className="mt-1 text-xs font-semibold text-foreground">{stage.staminaCost}</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500">Stamina</p>
              </div>
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2">
                <GoldCoinIcon className="mx-auto h-3.5 w-3.5" />
                <p className="mt-1 text-xs font-semibold text-foreground">{formatNumber(stage.rewardGold)}</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500">Gold</p>
              </div>
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2">
                <SealCoinIcon className="mx-auto h-3.5 w-3.5" />
                <p className="mt-1 text-xs font-semibold text-foreground">{stage.equipmentDropChance}%</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500">Seal Coin</p>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-zinc-500">
              Recommended power: {formatNumber(stage.recommendedPower)}
            </p>

            <div className="mt-4 rounded-xl border border-arcade-border bg-arcade-panel-light p-3">
              <p className="text-center text-[10px] uppercase tracking-wide text-zinc-500 mb-2">Possible Drops</p>
              <div className="flex flex-wrap justify-center gap-2">
                {specificGear.map(gear => (
                  <div key={gear.id} className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-gold/10 border border-gold/30">
                    <Image src={gear.icon} alt={gear.name} width={28} height={28} className="object-contain" />
                  </div>
                ))}
                <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-white/5 border border-arcade-border">
                  <Image src="/assets/objects/mancuerna_exp3.png" alt="EXP Dumbbell" width={28} height={28} className="object-contain opacity-80" />
                </div>
                <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-white/5 border border-arcade-border">
                  <Image src="/assets/objects/trx_exp2.png" alt="EXP TRX" width={28} height={28} className="object-contain opacity-80" />
                </div>
                <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-white/5 border border-arcade-border">
                  <Image src="/assets/objects/box_exp1.png" alt="EXP Box" width={28} height={28} className="object-contain opacity-80" />
                </div>
              </div>
            </div>

            {stage.isLocked ? (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-arcade-panel-light py-3 font-arcade text-xs uppercase text-zinc-500">
                <Lock className="h-3.5 w-3.5" /> Clear the previous stage first
              </div>
            ) : isPlayable ? (
              <Link href={`/combat?stage=${stage.id}`} className="mt-4 block" onClick={onClose}>
                <PixelButton variant="gold" className="w-full">
                  {stage.isCleared ? "Replay" : stage.worldStageNumber === 8 ? "Boss Battle" : "Battle"}
                </PixelButton>
              </Link>
            ) : (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-arcade-panel-light py-3 font-arcade text-xs uppercase text-zinc-500">
                Coming soon
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
