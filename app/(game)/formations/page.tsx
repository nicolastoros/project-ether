"use client";

import { useMemo, useState } from "react";
import { UserX, Search, Plus, Save, Play, X, Trash2 } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { PixelButton } from "@/components/ui/PixelButton";
import { ElementFilterGroup, RarityLevelFilterGroup } from "@/components/monsters/MonsterFilters";
import { saveFormationAction, deleteFormationAction } from "@/app/actions/combat";
import { syncProgressToServer } from "@/lib/syncProgress";
import type { Creature, Element, Rarity } from "@/types/game";
import { cn } from "@/lib/utils";

const MAX_NAME_LENGTH = 16;
const CAMPAIGN_SLOTS = 2;

export default function FormationsPage() {
  const creatures = useGameStore((s) => s.creatures);
  const teamPresets = useGameStore((s) => s.teamPresets);
  const partyCreatureIds = useGameStore((s) => s.partyCreatureIds);
  const setPartySlot = useGameStore((s) => s.setPartySlot);
  const saveTeamPreset = useGameStore((s) => s.saveTeamPreset);
  const deleteTeamPresetStore = useGameStore((s) => s.deleteTeamPreset);

  const [selectedPresetId, setSelectedPresetId] = useState<string | "new">("new");
  const [draftName, setDraftName] = useState<string>("My Formation");
  const [draftSlots, setDraftSlots] = useState<(string | null)[]>([null, null]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters state
  const [selectedElements, setSelectedElements] = useState<Set<Element>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<Rarity>>(new Set());
  const [minLevel, setMinLevel] = useState("");
  const [maxLevel, setMaxLevel] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Derived filters
  const filteredCreatures = useMemo(() => {
    const min = minLevel === "" ? null : Number(minLevel);
    const max = maxLevel === "" ? null : Number(maxLevel);
    return creatures.filter((c) => {
      if (selectedElements.size > 0 && !selectedElements.has(c.element)) return false;
      if (selectedRarities.size > 0 && !selectedRarities.has(c.rarity)) return false;
      if (min !== null && c.level < min) return false;
      if (max !== null && c.level > max) return false;
      return true;
    });
  }, [creatures, selectedElements, selectedRarities, minLevel, maxLevel]);

  const activeFilterCount =
    selectedElements.size + selectedRarities.size + (minLevel !== "" ? 1 : 0) + (maxLevel !== "" ? 1 : 0);

  const clearFilters = () => {
    setSelectedElements(new Set());
    setSelectedRarities(new Set());
    setMinLevel("");
    setMaxLevel("");
  };

  const handleSelectPreset = (id: string | "new") => {
    setSelectedPresetId(id);
    if (id === "new") {
      setDraftName("New Formation");
      setDraftSlots([null, null]);
    } else {
      const preset = teamPresets.find((p) => p.id === id);
      if (preset) {
        setDraftName(preset.name);
        const slots: (string | null)[] = [null, null];
        for (let i = 0; i < CAMPAIGN_SLOTS; i++) {
          slots[i] = preset.creatureIds[i] || null;
        }
        setDraftSlots(slots);
      }
    }
  };

  const handleToggleSlot = (creatureId: string) => {
    setDraftSlots((prev) => {
      const next = [...prev];
      // If already in slots, remove it
      const existingIdx = next.indexOf(creatureId);
      if (existingIdx !== -1) {
        next[existingIdx] = null;
        return next;
      }
      // Otherwise, add to first empty slot
      const emptyIdx = next.indexOf(null);
      if (emptyIdx !== -1) {
        next[emptyIdx] = creatureId;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!draftName.trim()) return;
    setIsSaving(true);
    try {
      const creatureIds = draftSlots.filter(Boolean) as string[];
      // We always create a new DB record and delete the old one if editing,
      // or we just save a new one. Wait, the server action `saveFormationAction` creates a new one.
      // If editing an existing one, we should ideally delete the old one first, but since the server action
      // just returns the new ID, let's treat saves as overwrites by deleting the old one.
      if (selectedPresetId !== "new") {
        await deleteFormationAction(selectedPresetId);
        deleteTeamPresetStore(selectedPresetId);
      }
      
      const newId = await saveFormationAction(draftName.trim(), creatureIds);
      saveTeamPreset(newId, draftName.trim(), creatureIds);
      setSelectedPresetId(newId);
    } catch (err) {
      console.error("Failed to save formation:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedPresetId === "new") return;
    setIsDeleting(true);
    try {
      await deleteFormationAction(selectedPresetId);
      deleteTeamPresetStore(selectedPresetId);
      handleSelectPreset("new");
    } catch (err) {
      console.error("Failed to delete formation:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetCampaignActive = () => {
    draftSlots.forEach((id, index) => {
      setPartySlot(index, id);
    });
  };

  const creatureById = (id: string | null) => creatures.find((c) => c.id === id) ?? null;
  const draftIdsSet = new Set(draftSlots.filter(Boolean));
  
  // Check if current draft is exactly the campaign active team
  const isCurrentlyCampaign = 
    partyCreatureIds.length === draftSlots.length &&
    partyCreatureIds.every((id, idx) => id === draftSlots[idx]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Formations</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Build and save teams for different game modes.
        </p>
      </div>

      {/* Mode & Preset Selection */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex-1">
          <label className="font-arcade text-[10px] uppercase text-zinc-500">Game Mode</label>
          <div className="mt-1">
            <span className="inline-flex items-center rounded-lg border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-bright">
              <Play className="mr-1.5 h-3.5 w-3.5" /> Campaign
            </span>
          </div>
        </div>

        <div className="flex-1 w-full sm:w-auto">
          <label className="font-arcade text-[10px] uppercase text-zinc-500">Saved Presets</label>
          <div className="mt-1 flex flex-wrap gap-2">
            <button
              onClick={() => handleSelectPreset("new")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                selectedPresetId === "new"
                  ? "border-arcade-border bg-arcade-panel text-white"
                  : "border-transparent bg-arcade-panel-light text-zinc-500 hover:text-white"
              )}
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
            {teamPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={cn(
                  "flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors max-w-[120px] truncate",
                  selectedPresetId === preset.id
                    ? "border-gold bg-gold/10 text-gold-bright"
                    : "border-transparent bg-arcade-panel-light text-zinc-400 hover:text-zinc-200"
                )}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Left Column: Editor */}
        <div className="space-y-4">
          <GlowPanel accent="gold" className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value.slice(0, MAX_NAME_LENGTH))}
                placeholder="Formation Name"
                className="flex-1 rounded-lg border border-arcade-border bg-arcade-panel-light px-3 py-2 text-sm text-foreground outline-none focus:border-gold font-semibold"
              />
              <span className="text-[10px] text-zinc-500 font-mono">
                {draftName.length}/{MAX_NAME_LENGTH}
              </span>
            </div>

            <div className="grid max-w-xl grid-cols-2 gap-2.5 sm:gap-3 mx-auto">
              {draftSlots.map((id, slotIndex) => {
                const creature = creatureById(id);
                if (!creature) {
                  return (
                    <GlowPanel
                      key={slotIndex}
                      accent="none"
                      className="flex aspect-square flex-col items-center justify-center gap-1.5 border-dashed text-zinc-600 cursor-pointer hover:border-gold/50 hover:text-gold/50 transition-colors"
                      onClick={() => {
                        // Could scroll to roster, but for now just clickable empty state
                      }}
                    >
                      <UserX className="h-10 w-10 sm:h-12 sm:w-12 mb-2 opacity-50" />
                      <span className="font-arcade text-xs uppercase tracking-widest opacity-60">Empty</span>
                    </GlowPanel>
                  );
                }
                return (
                  <button key={slotIndex} onClick={() => handleToggleSlot(creature.id)} className="group text-left relative">
                    <GlowPanel
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center gap-1.5 bg-gradient-to-b p-2 text-center transition-transform group-hover:scale-[1.02]",
                        ELEMENT_GRADIENT[creature.element]
                      )}
                    >
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 rounded-xl">
                        <X className="h-6 w-6 text-red-400" />
                      </div>
                      <CreatureSprite creature={creature} className="h-20 w-20 sm:h-28 sm:w-28 p-1 text-gold-bright drop-shadow-md" />
                      <CreatureName creature={creature} className="truncate text-sm sm:text-base font-semibold mt-2" />
                      <p className="text-xs text-zinc-500 font-medium">Lv.{creature.level}</p>
                    </GlowPanel>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-arcade-border/50">
              <PixelButton
                onClick={handleSetCampaignActive}
                disabled={isCurrentlyCampaign}
                className="flex-1"
                variant={isCurrentlyCampaign ? "ghost" : "gold"}
              >
                {isCurrentlyCampaign ? "Campaign Active" : "Set Campaign Active"}
              </PixelButton>
              <PixelButton
                onClick={handleSave}
                disabled={isSaving || !draftName.trim()}
                variant="neon"
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving..." : "Save Preset"}
              </PixelButton>
              {selectedPresetId !== "new" && (
                <PixelButton
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="ghost"
                  className="px-3 !text-red-400 hover:!bg-red-400/10"
                  aria-label="Delete preset"
                >
                  <Trash2 className="h-4 w-4" />
                </PixelButton>
              )}
            </div>
          </GlowPanel>
        </div>

        {/* Right Column: Roster & Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-arcade text-xs glow-text-neon">Roster</h2>
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="lg:hidden flex items-center gap-1 text-[10px] uppercase font-arcade text-zinc-400"
            >
              <Search className="h-3 w-3" /> Filters
            </button>
          </div>

          <div className={cn("grid gap-3", mobileFiltersOpen ? "block" : "hidden lg:block")}>
            <GlowPanel accent="none" className="p-3 space-y-4">
               <ElementFilterGroup
                selected={selectedElements}
                onToggle={(el) => setSelectedElements((p) => {
                  const n = new Set(p); n.has(el) ? n.delete(el) : n.add(el); return n;
                })}
              />
              <RarityLevelFilterGroup
                selectedRarities={selectedRarities}
                onToggleRarity={(r) => setSelectedRarities((p) => {
                  const n = new Set(p); n.has(r) ? n.delete(r) : n.add(r); return n;
                })}
                minLevel={minLevel}
                maxLevel={maxLevel}
                onMinLevelChange={setMinLevel}
                onMaxLevelChange={setMaxLevel}
              />
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="w-full text-center font-arcade text-[9px] uppercase tracking-wide text-zinc-500 hover:text-gold-bright mt-2"
                >
                  Clear filters
                </button>
              )}
            </GlowPanel>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 h-[400px] overflow-y-auto pr-1 pb-4 custom-scrollbar">
            {filteredCreatures.map((creature) => {
              const isAssigned = draftIdsSet.has(creature.id);

              return (
                <button
                  key={creature.id}
                  onClick={() => handleToggleSlot(creature.id)}
                  className="text-left"
                >
                  <GlowPanel
                    accent={isAssigned ? "gold" : "none"}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 transition-colors relative",
                      !isAssigned && "hover:border-gold"
                    )}
                  >
                    <RarityCardAura rarity={creature.rarity} />
                    
                    {isAssigned && (
                      <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-gold shadow-[0_0_8px_rgba(255,184,77,0.8)]" />
                    )}

                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gold bg-gradient-to-b pixel-frame mb-1",
                        ELEMENT_GRADIENT[creature.element]
                      )}
                    >
                      <CreatureSprite creature={creature} className="h-8 w-8 p-0.5 text-gold-bright" />
                    </div>
                    <div className="w-full text-center">
                      <CreatureName creature={creature} className="truncate text-xs font-semibold block" />
                      <p className="text-[10px] text-zinc-600">Lv.{creature.level}</p>
                    </div>
                  </GlowPanel>
                </button>
              );
            })}
            
            {filteredCreatures.length === 0 && (
               <div className="col-span-full h-24 flex items-center justify-center text-xs text-zinc-500 border border-dashed border-arcade-border rounded-xl">
                 No creatures match filters.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
