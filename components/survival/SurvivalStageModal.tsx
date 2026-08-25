"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, Coins, Gem } from "lucide-react";
import type { SurvivalStage } from "@/lib/survivalStages";
import { PixelButton } from "@/components/ui/PixelButton";
import { formatNumber } from "@/lib/utils";

function formatTargetTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SurvivalStageModalProps {
  stage: SurvivalStage | null;
  isLocked: boolean;
  isCleared: boolean;
  onClose: () => void;
  onStart: () => void;
}

export function SurvivalStageModal({ stage, isLocked, isCleared, onClose, onStart }: SurvivalStageModalProps) {
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

            <span className="mt-2 inline-flex items-center rounded-full bg-neon px-2 py-0.5 font-arcade text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
              Survive {formatTargetTime(stage.targetSeconds)}
            </span>

            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2">
                <Coins className="mx-auto h-3.5 w-3.5 text-gold-bright" />
                <p className="mt-1 text-xs font-semibold text-foreground">{formatNumber(stage.rewardGold)}</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500">Gold</p>
              </div>
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2">
                <Gem className="mx-auto h-3.5 w-3.5 text-violet-500" />
                <p className="mt-1 text-xs font-semibold text-foreground">{stage.rewardGems}</p>
                <p className="text-[8px] uppercase tracking-wide text-zinc-500">Gems</p>
              </div>
            </div>

            {isLocked ? (
              <div className="mt-4 flex items-center justify-center gap-1.5 rounded-full bg-arcade-panel-light py-3 font-arcade text-xs uppercase text-zinc-500">
                <Lock className="h-3.5 w-3.5" /> Clear the previous stage first
              </div>
            ) : (
              <PixelButton variant="neon" className="mt-4 w-full" onClick={onStart}>
                {isCleared ? "Replay" : "Start"}
              </PixelButton>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
