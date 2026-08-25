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

interface TeamSelectScreenProps {
  stage: DungeonStage;
  creatures: Creature[];
  selectedIds: string[];
  onToggle: (creatureId: string) => void;
  onStart: () => void;
}

export function TeamSelectScreen({
  stage,
  creatures,
  selectedIds,
  onToggle,
  onStart,
}: TeamSelectScreenProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/campaign"
          aria-label="Back to Campaign"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-500 shadow-sm transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">
            World {stage.world}-{stage.worldStageNumber}
          </h1>
          <p className="text-xs text-zinc-500">{stage.name} — choose 1 or 2 creatures for this battle.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
                  "relative flex items-center gap-2.5 p-2.5 transition-colors",
                  !isSelected && !isDisabled && "hover:border-gold"
                )}
              >
                {creature.rarity === "Mythic" && <MythicCardAura />}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold bg-gradient-to-b pixel-frame",
                    ELEMENT_GRADIENT[creature.element]
                  )}
                >
                  <CreatureSprite creature={creature} className="h-5 w-5 p-0.5 text-gold-bright" />
                </div>
                <div className="min-w-0 flex-1">
                  <CreatureName creature={creature} className="truncate text-xs font-semibold" />
                  <p className="text-[10px] text-zinc-600">Lv.{creature.level}</p>
                </div>
                <RarityBadge rarity={creature.rarity} />
                {isSelected && (
                  <span className="font-arcade text-[8px] text-gold-bright">SELECTED</span>
                )}
              </GlowPanel>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-3">
        <GlowPanel accent="neon" className="flex items-center justify-between gap-3 p-3">
          <p className="text-xs text-zinc-500">{selectedIds.length}/2 creatures selected</p>
          <PixelButton variant="neon" disabled={selectedIds.length === 0} onClick={onStart}>
            Start Battle
          </PixelButton>
        </GlowPanel>
      </div>
    </div>
  );
}
