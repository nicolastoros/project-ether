"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Creature, DungeonStage } from "@/types/game";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/lib/store";
import { Check, X, Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { saveFormationAction, deleteFormationAction } from "@/app/actions/combat";
import { useState } from "react";

interface TeamSelectScreenProps {
  stage: DungeonStage;
  creatures: Creature[];
  selectedIds: string[];
  onToggle: (creatureId: string) => void;
  onSetTeam: (creatureIds: string[]) => void;
  onStart: (isSweep: boolean) => void;
}

export function TeamSelectScreen({
  stage,
  creatures,
  selectedIds,
  onToggle,
  onSetTeam,
  onStart,
}: TeamSelectScreenProps) {
  const stageStars = useGameStore((s) => s.dungeon.stageStars);
  const teamPresets = useGameStore((s) => s.teamPresets);
  const saveTeamPreset = useGameStore((s) => s.saveTeamPreset);
  const deleteTeamPreset = useGameStore((s) => s.deleteTeamPreset);
  
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSavePreset = async () => {
    if (selectedIds.length === 0) return;
    const name = prompt("Enter a name for this formation:", `Team ${teamPresets.length + 1}`);
    if (!name) return;
    
    try {
      setIsSaving(true);
      const id = await saveFormationAction(name, selectedIds);
      saveTeamPreset(id, name, selectedIds);
    } catch (err) {
      alert("Failed to save preset.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this formation?")) return;
    try {
      deleteTeamPreset(id);
      await deleteFormationAction(id);
    } catch (err) {
      alert("Failed to delete preset.");
    }
  };

  const stars = stageStars[stage.id] || { noDeaths: false, noItems: false, underFiveTurns: false };
  const hasAllStars = stars.noDeaths && stars.noItems && stars.underFiveTurns;

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

      <GlowPanel accent="none" className="p-3 lg:p-4">
        <h2 className="font-arcade text-xs text-white mb-2 lg:text-sm">Stage Missions</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <MissionItem completed={stars.noDeaths} label="Win without losing any monster" />
          <MissionItem completed={stars.noItems} label="Win without using support items" />
          <MissionItem completed={stars.underFiveTurns} label="Win in less than 5 turns" />
        </div>
      </GlowPanel>

      <GlowPanel accent="none" className="p-3 lg:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-arcade text-xs text-white lg:text-sm flex items-center gap-2">
            <Bookmark className="h-4 w-4" /> Formations
          </h2>
          <PixelButton 
            variant="ghost" 
            size="sm" 
            disabled={selectedIds.length === 0 || isSaving}
            onClick={handleSavePreset}
            className="text-[10px] lg:text-xs py-1 h-auto flex items-center gap-1"
          >
            <BookmarkPlus className="h-3 w-3" /> Save Current
          </PixelButton>
        </div>
        
        {teamPresets.length === 0 ? (
          <p className="text-[10px] text-zinc-500 italic">No saved formations yet.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {teamPresets.map((preset) => (
              <div 
                key={preset.id}
                onClick={() => onSetTeam(preset.creatureIds)}
                className="flex items-center gap-2 bg-black/40 hover:bg-black/60 cursor-pointer border border-white/5 hover:border-gold/30 rounded-lg px-3 py-2 transition-all whitespace-nowrap shrink-0 group"
              >
                <div className="flex -space-x-2">
                  {preset.creatureIds.map((cId) => {
                    const c = creatures.find(x => x.id === cId);
                    if (!c) return null;
                    return (
                      <div key={c.id} className={cn("h-6 w-6 rounded-md flex items-center justify-center bg-gradient-to-b border border-arcade-border", ELEMENT_GRADIENT[c.element])}>
                        <CreatureSprite creature={c} className="h-4 w-4" />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] font-semibold text-zinc-300">{preset.name}</span>
                <button 
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  className="ml-1 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlowPanel>

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
                <RarityCardAura rarity={creature.rarity} />
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

      <div className="sticky bottom-3 lg:bottom-5 z-20">
        <GlowPanel accent="neon" className="flex items-center justify-between gap-3 p-3 lg:rounded-2xl lg:p-5">
          <p className="text-xs text-zinc-500 lg:text-base">{selectedIds.length}/2 creatures selected</p>
          <div className="flex gap-2">
            {hasAllStars && (
              <PixelButton 
                variant="gold" 
                disabled={selectedIds.length === 0} 
                onClick={() => onStart(true)} 
                className="lg:px-8 lg:py-3.5 lg:text-base"
              >
                Sweep
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

function MissionItem({ completed, label }: { completed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-2 border border-white/5">
      {completed ? <Check className="h-4 w-4 text-gold shrink-0" /> : <X className="h-4 w-4 text-zinc-600 shrink-0" />}
      <span className={cn("text-[10px] lg:text-xs", completed ? "text-zinc-200" : "text-zinc-500")}>{label}</span>
    </div>
  );
}
