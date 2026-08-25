"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { X, Lock, Zap, Coins, Sparkles } from "lucide-react";
import type { DungeonStage, DungeonDifficulty } from "@/types/game";
import { PixelButton } from "@/components/ui/PixelButton";
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

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2">
                <Zap className="mx-auto h-3.5 w-3.5 text-neon" />
                <p className="mt-1 text-xs font-semibold text-foreground">{stage.staminaCost}</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500">Stamina</p>
              </div>
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2">
                <Coins className="mx-auto h-3.5 w-3.5 text-gold-bright" />
                <p className="mt-1 text-xs font-semibold text-foreground">{formatNumber(stage.rewardGold)}</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500">Gold</p>
              </div>
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2">
                <Sparkles className="mx-auto h-3.5 w-3.5 text-violet-500" />
                <p className="mt-1 text-xs font-semibold text-foreground">{stage.equipmentDropChance}%</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500">Drop</p>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-zinc-500">
              Recommended power: {formatNumber(stage.recommendedPower)}
            </p>

            {stage.isLocked ? (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-arcade-panel-light py-3 font-arcade text-xs uppercase text-zinc-500">
                <Lock className="h-3.5 w-3.5" /> Clear the previous stage first
              </div>
            ) : stage.world === 1 ? (
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
