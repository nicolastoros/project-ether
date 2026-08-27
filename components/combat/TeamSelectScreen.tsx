"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Creature, DungeonStage } from "@/types/game";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { MythicCardAura } from "@/components/ui/MythicCardAura";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/lib/store";

interface TeamSelectScreenProps {
  stage: DungeonStage;
  creatures: Creature[];
  selectedIds: string[];
  onToggle: (creatureId: string) => void;
  onStart: (isSweep: boolean) => void;
}

export function TeamSelectScreen({
  stage,
  creatures,
  selectedIds,
  onToggle,
  onStart,
}: TeamSelectScreenProps) {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2 lg:gap-4">
        <Link
          href="/campaign"
          aria-label="Back to Campaign"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-500 shadow-sm transition-colors hover:text-foreground lg:h-11 lg:w-11"
        >
          <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
        </Link>
        <div>
          <h1 className="font-arcade text-lg glow-text-gold lg:text-2xl xl:text-3xl">
            World {stage.world}-{stage.worldStageNumber}
          </h1>
          <p className="text-xs text-zinc-500 lg:mt-1 lg:text-base">{stage.name} — choose 1 or 2 creatures for this battle.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:gap-5 2xl:grid-cols-4">
        {creatures.map((creature) => {
          const isSelected = selectedIds.includes(creature.id);
          const isDisabled = !isSelected && selectedIds.length >= 2;
          return (
            <button
              key={creature.id}
              onClick={() => onToggle(creature.id)}
              disabled={isDisabled}
              className={cn("text-left", isDisabled && "cursor-not-allowed opacity-50")}
            >
              <GlowPanel
                accent={isSelected ? "gold" : "none"}
                className={cn(
                  "relative flex items-center gap-2.5 p-2.5 transition-colors lg:gap-4 lg:rounded-2xl lg:p-4 xl:p-5",
                  !isSelected && !isDisabled && "hover:border-gold"
                )}
              >
                {creature.rarity === "Mythic" && <MythicCardAura />}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold bg-gradient-to-b pixel-frame lg:h-16 lg:w-16 xl:h-[72px] xl:w-[72px]",
                    ELEMENT_GRADIENT[creature.element]
                  )}
                >
                  <CreatureSprite creature={creature} className="h-5 w-5 p-0.5 text-gold-bright lg:h-9 lg:w-9 xl:h-10 xl:w-10" />
                </div>
                <div className="min-w-0 flex-1">
                  <CreatureName creature={creature} className="truncate text-xs font-semibold lg:text-base xl:text-lg" />
                  <p className="text-[10px] text-zinc-600 lg:mt-0.5 lg:text-sm">Lv.{creature.level}</p>
                </div>
                <RarityBadge rarity={creature.rarity} className="lg:text-xs lg:px-2 lg:py-1" />
                {isSelected && (
                  <span className="font-arcade text-[8px] text-gold-bright lg:text-[10px]">SELECTED</span>
                )}
              </GlowPanel>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-3 lg:bottom-5">
        <GlowPanel accent="neon" className="flex items-center justify-between gap-3 p-3 lg:rounded-2xl lg:p-5">
          <p className="text-xs text-zinc-500 lg:text-base">{selectedIds.length}/2 creatures selected</p>
          <div className="flex gap-2">
            {useGameStore((s) => s.dungeon.perfectStages.includes(stage.id)) && (
              <PixelButton 
                variant="gold" 
                disabled={selectedIds.length === 0} 
                onClick={() => onStart(true)} 
                className="lg:px-8 lg:py-3.5 lg:text-base"
              >
                Auto-Clear
              </PixelButton>
            )}
            <PixelButton variant="neon" disabled={selectedIds.length === 0} onClick={() => onStart(false)} className="lg:px-8 lg:py-3.5 lg:text-base">
              Start Battle
            </PixelButton>
          </div>
        </GlowPanel>
      </div>
    </div>
  );
}
