"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { SURVIVAL_STAGES, SURVIVAL_WORLDS, type SurvivalStage } from "@/lib/survivalStages";
import { SurvivalWorldMap } from "@/components/survival/SurvivalWorldMap";
import { SurvivalStageModal } from "@/components/survival/SurvivalStageModal";
import { SurvivalGame } from "@/components/survival/SurvivalGame";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { cn } from "@/lib/utils";

export function SurvivalHome() {
  const highestCleared = useGameStore((s) => s.survivalHighestStageCleared);
  const [activeWorld, setActiveWorld] = useState(1);
  const [selectedStage, setSelectedStage] = useState<SurvivalStage | null>(null);
  const [playingStage, setPlayingStage] = useState<SurvivalStage | null>(null);

  if (playingStage) {
    // Keyed by stage id so switching stages (Next Stage from the victory screen) gets a
    // fully-fresh SurvivalGame instance instead of trying to reuse/reset internal refs.
    return (
      <SurvivalGame key={playingStage.id} stage={playingStage} onExit={() => setPlayingStage(null)} />
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

      <div className="flex shrink-0 gap-2">
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
        onClose={() => setSelectedStage(null)}
        onStart={() => {
          if (!selectedStage) return;
          setPlayingStage(selectedStage);
          setSelectedStage(null);
        }}
      />
    </div>
  );
}
