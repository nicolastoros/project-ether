"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { SURVIVAL_STAGES, SURVIVAL_WORLDS, type SurvivalStage } from "@/lib/survivalStages";
import { SurvivalWorldMap } from "@/components/survival/SurvivalWorldMap";
import { SurvivalStageModal } from "@/components/survival/SurvivalStageModal";
import { SurvivalGame } from "@/components/survival/SurvivalGame";
import { GlowPanel } from "@/components/ui/GlowPanel";
import type { Creature } from "@/types/game";
import { cn } from "@/lib/utils";

export function SurvivalHome() {
  const highestCleared = useGameStore((s) => s.survivalHighestStageCleared);
  const creatures = useGameStore((s) => s.creatures);
  const activeCreatureId = useGameStore((s) => s.activeCreatureId);
  const [activeWorld, setActiveWorld] = useState(1);
  const [selectedStage, setSelectedStage] = useState<SurvivalStage | null>(null);
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(null);
  const [playingStage, setPlayingStage] = useState<SurvivalStage | null>(null);
  const [playingCreature, setPlayingCreature] = useState<Creature | null>(null);

  if (playingStage && playingCreature) {
    // Keyed by stage+creature id so switching either (Next Stage from the victory screen, or a
    // different pick next run) gets a fully-fresh SurvivalGame instance instead of trying to
    // reuse/reset internal refs.
    return (
      <SurvivalGame
        key={`${playingStage.id}-${playingCreature.id}`}
        stage={playingStage}
        creature={playingCreature}
        onExit={() => {
          setPlayingStage(null);
          setPlayingCreature(null);
        }}
      />
    );
  }

  const world = SURVIVAL_WORLDS.find((w) => w.world === activeWorld) ?? SURVIVAL_WORLDS[0];
  const worldStages = SURVIVAL_STAGES.filter((s) => s.world === activeWorld);
  const nextStageNumber = highestCleared + 1;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0">
        <h1 className="font-arcade text-lg glow-text-neon">Survival Mode</h1>
        <p className="text-xs text-zinc-500">Pick a stage — survive until the target time to clear it.</p>
      </div>

      {/* Mobile: full-width pill row, unchanged. */}
      <div className="flex shrink-0 gap-2 lg:hidden">
        {SURVIVAL_WORLDS.map((w) => (
          <button
            key={w.world}
            type="button"
            onClick={() => setActiveWorld(w.world)}
            className={cn(
              "flex-1 rounded-full border px-3 py-1.5 font-arcade text-[10px] font-semibold uppercase tracking-wide transition-colors",
              activeWorld === w.world
                ? "border-neon bg-neon/10 text-neon-ink"
                : "border-arcade-border bg-arcade-panel text-zinc-500 hover:text-foreground"
            )}
          >
            World {w.world}
            {!w.isAvailable && <Lock className="ml-1 inline h-3 w-3 align-[-1px]" />}
          </button>
        ))}
      </div>

      {/* PC: compact segmented slider, sized to content instead of stretched full-width. */}
      <div className="hidden shrink-0 lg:flex">
        <div className="inline-flex items-center gap-1 rounded-full border border-arcade-border bg-arcade-panel p-1 shadow-sm">
          {SURVIVAL_WORLDS.map((w) => (
            <button
              key={w.world}
              type="button"
              onClick={() => setActiveWorld(w.world)}
              className={cn(
                "relative overflow-hidden rounded-full px-5 py-2 font-arcade text-xs font-semibold uppercase tracking-wide transition-colors",
                activeWorld === w.world ? "text-neon-ink" : "text-zinc-500 hover:text-foreground"
              )}
            >
              {activeWorld === w.world && (
                <motion.div
                  layoutId="survivalWorldActiveBg"
                  className="absolute inset-0 rounded-full border border-neon bg-neon/10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                World {w.world}
                {!w.isAvailable && <Lock className="h-3 w-3" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {world.isAvailable ? (
          <SurvivalWorldMap
            world={world}
            stages={worldStages}
            highestCleared={highestCleared}
            onSelectStage={setSelectedStage}
          />
        ) : (
          <GlowPanel accent="none" className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <Lock className="h-8 w-8 text-zinc-400" />
            <p className="font-arcade text-xs text-zinc-500">World {world.world} — Coming soon</p>
          </GlowPanel>
        )}
      </div>

      <SurvivalStageModal
        stage={selectedStage}
        isLocked={!!selectedStage && selectedStage.stageNumber > nextStageNumber}
        isCleared={!!selectedStage && selectedStage.stageNumber <= highestCleared}
        creatures={creatures}
        selectedCreatureId={selectedCreatureId ?? activeCreatureId}
        onSelectCreature={setSelectedCreatureId}
        onClose={() => setSelectedStage(null)}
        onStart={() => {
          if (!selectedStage) return;
          const creature =
            creatures.find((c) => c.id === (selectedCreatureId ?? activeCreatureId)) ?? creatures[0];
          if (!creature) return;
          setPlayingStage(selectedStage);
          setPlayingCreature(creature);
          setSelectedStage(null);
        }}
      />
    </div>
  );
}
