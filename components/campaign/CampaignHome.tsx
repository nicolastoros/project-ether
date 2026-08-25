"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { CAMPAIGN_WORLDS } from "@/lib/campaignWorlds";
import type { DungeonStage } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { CampaignWorldMap } from "@/components/campaign/CampaignWorldMap";
import { StageDetailModal } from "@/components/campaign/StageDetailModal";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { cn } from "@/lib/utils";

export function CampaignHome() {
  const highestCleared = useGameStore((s) => s.dungeon.highestStageCleared);
  const [activeWorld, setActiveWorld] = useState(1);
  const [selectedStage, setSelectedStage] = useState<DungeonStage | null>(null);

  const world = CAMPAIGN_WORLDS.find((w) => w.world === activeWorld) ?? CAMPAIGN_WORLDS[0];
  // isLocked/isCleared on DUNGEON_STAGES are seed placeholders — override with real progress
  // from the store (dungeon.highestStageCleared, updated by BattleScreen on victory).
  const worldStages = DUNGEON_STAGES.filter((s) => s.world === activeWorld).map((s) => ({
    ...s,
    isCleared: s.stageNumber <= highestCleared,
    isLocked: s.stageNumber > highestCleared + 1,
  }));

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0">
        <h1 className="font-arcade text-lg glow-text-gold">Campaign</h1>
        <p className="mt-1 text-xs text-zinc-500">Pick a world, then follow the path and clear each stage.</p>
      </div>

      {/* Worlds as a side tab strip (not a stacked list) so browsing stays a flat, quick lookup
          even once there are many worlds — no scrolling through a tall map to reach a later one. */}
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="scrollbar-hidden flex w-16 shrink-0 flex-col gap-2 overflow-y-auto sm:w-24">
          {CAMPAIGN_WORLDS.map((w) => (
            <button
              key={w.world}
              type="button"
              onClick={() => setActiveWorld(w.world)}
              className={cn(
                "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-2 py-2.5 font-arcade transition-colors",
                activeWorld === w.world
                  ? "border-gold bg-gold/10 text-gold-bright"
                  : "border-arcade-border bg-arcade-panel text-zinc-500 hover:text-foreground"
              )}
            >
              <span className="text-[9px] uppercase tracking-wide">World</span>
              <span className="text-base font-bold">{w.world}</span>
              {!w.isAvailable && <Lock className="mt-0.5 h-3 w-3" />}
            </button>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {world.isAvailable ? (
            <CampaignWorldMap world={world} stages={worldStages} onSelectStage={setSelectedStage} />
          ) : (
            <GlowPanel accent="none" className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
              <Lock className="h-8 w-8 text-zinc-400" />
              <p className="font-arcade text-xs text-zinc-500">World {world.world} — Coming soon</p>
            </GlowPanel>
          )}
        </div>
      </div>

      <StageDetailModal stage={selectedStage} onClose={() => setSelectedStage(null)} />
    </div>
  );
}
