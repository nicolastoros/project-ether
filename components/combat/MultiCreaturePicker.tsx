"use client";

import type { Creature } from "@/types/game";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";
import { sortCreaturesByRarity } from "@/lib/gameData";

interface MultiCreaturePickerProps {
  creatures: Creature[];
  /** Creatures shown but not selectable (e.g. already out on an Expedition). */
  excludedIds?: Set<string>;
  selectedIds: string[];
  maxCount: number;
  onToggle: (creatureId: string) => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
}

/** Reusable single/multi creature-select grid — generalizes TeamSelectScreen.tsx's picker-card
 * pattern (which stays Campaign-specific) for any flow that needs to pick up to N owned
 * creatures: Raid Battle (max 4), Expeditions (max 6), consuming a training item (max 1). */
export function MultiCreaturePicker({
  creatures,
  excludedIds,
  selectedIds,
  maxCount,
  onToggle,
  onConfirm,
  confirmLabel = "Confirm",
  confirmDisabled,
}: MultiCreaturePickerProps) {
  const sortedCreatures = sortCreaturesByRarity(creatures);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {sortedCreatures.map((creature) => {
          const isExcluded = excludedIds?.has(creature.id) ?? false;
          const isSelected = selectedIds.includes(creature.id);
          const isDisabled = isExcluded || (!isSelected && selectedIds.length >= maxCount);
          return (
            <button
              key={creature.id}
              onClick={() => !isExcluded && onToggle(creature.id)}
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
                <RarityCardAura rarity={creature.rarity} />
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
                {isExcluded ? (
                  <span className="font-arcade text-[8px] text-zinc-400">ON EXPEDITION</span>
                ) : (
                  isSelected && <span className="font-arcade text-[8px] text-gold-bright">SELECTED</span>
                )}
              </GlowPanel>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-3">
        <GlowPanel accent="neon" className="flex items-center justify-between gap-3 p-3">
          <p className="text-xs text-zinc-500">
            {selectedIds.length}/{maxCount} creatures selected
          </p>
          <PixelButton
            variant="neon"
            disabled={confirmDisabled ?? selectedIds.length === 0}
            onClick={onConfirm}
          >
            {confirmLabel}
          </PixelButton>
        </GlowPanel>
      </div>
    </div>
  );
}
