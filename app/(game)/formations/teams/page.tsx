"use client";

import { useMemo, useState } from "react";
import { UserX, Plus, Save, Play, Flame, X, Trash2, SlidersHorizontal, Heart } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT, ELEMENT_ICON } from "@/lib/elementVisuals";
import { BackButton } from "@/components/ui/BackButton";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { PixelButton } from "@/components/ui/PixelButton";
import { saveFormationAction, deleteFormationAction } from "@/app/actions/combat";
import type { Element, Rarity } from "@/types/game";
import { cn } from "@/lib/utils";
import { sortCreaturesByRarity } from "@/lib/gameData";

const MAX_NAME_LENGTH = 16;

type Mode = "campaign" | "raid";
const MODE_SLOTS: Record<Mode, number> = { campaign: 2, raid: 4 };

const ELEMENTS = Object.keys(ELEMENT_ICON) as Element[];
const RARITIES: Rarity[] = ["Common", "Rare", "SSR", "Mythic", "LR"];

// Lets rarity read at a glance across the whole grid (the RarityCardAura shimmer alone is too
// subtle in a static screenshot) without spending a corner badge on it — every other corner is
// already claimed by favorite/selected/level/hidden-potential.
const RARITY_BORDER: Record<Rarity, string> = {
  Common: "border-rarity-common/70",
  Rare: "border-rarity-rare/70",
  SSR: "border-rarity-ssr/70",
  Mythic: "border-rarity-mythic/70",
  LR: "border-amber-400",
};

type SortKey = "rarity" | "atk" | "def" | "hp" | "obtention";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rarity", label: "Rarity" },
  { key: "atk", label: "ATK" },
  { key: "def", label: "DEF" },
  { key: "hp", label: "HP" },
  { key: "obtention", label: "Obtained" },
];

export default function FormationTeamsPage() {
  const creatures = useGameStore((s) => s.creatures);
  const teamPresets = useGameStore((s) => s.teamPresets);
  const partyCreatureIds = useGameStore((s) => s.partyCreatureIds);
  const setPartySlot = useGameStore((s) => s.setPartySlot);
  const saveTeamPreset = useGameStore((s) => s.saveTeamPreset);
  const deleteTeamPresetStore = useGameStore((s) => s.deleteTeamPreset);
  const favoriteCreatureIds = useGameStore((s) => s.favoriteCreatureIds);
  const toggleFavorite = useGameStore((s) => s.toggleFavorite);

  const [mode, setMode] = useState<Mode>("campaign");
  const [selectedPresetId, setSelectedPresetId] = useState<string | "new">("new");
  const [draftName, setDraftName] = useState<string>("New Formation");
  const [draftSlots, setDraftSlots] = useState<(string | null)[]>([null, null]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters + sort state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedElements, setSelectedElements] = useState<Set<Element>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<Rarity>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("rarity");
  const [sortDesc, setSortDesc] = useState(true);

  const modePresets = useMemo(() => teamPresets.filter((p) => p.mode === mode), [teamPresets, mode]);

  const handleSelectMode = (nextMode: Mode) => {
    setMode(nextMode);
    setSelectedPresetId("new");
    setDraftName("New Formation");
    setDraftSlots(Array(MODE_SLOTS[nextMode]).fill(null));
  };

  const filteredCreatures = useMemo(() => {
    let list = creatures.filter((c) => {
      if (selectedElements.size > 0 && !selectedElements.has(c.element)) return false;
      if (selectedRarities.size > 0 && !selectedRarities.has(c.rarity)) return false;
      if (favoritesOnly && !favoriteCreatureIds.includes(c.id)) return false;
      return true;
    });

    if (sortKey === "obtention") {
      // No real "acquired at" timestamp exists yet — the roster's own array order (new grants
      // are appended) is a reasonable stand-in, newest-first by default.
      list = sortDesc ? [...list].reverse() : list;
    } else if (sortKey === "rarity") {
      list = sortCreaturesByRarity(list);
      if (!sortDesc) list = [...list].reverse();
    } else {
      list = [...list].sort((a, b) =>
        sortDesc ? b.baseStats[sortKey] - a.baseStats[sortKey] : a.baseStats[sortKey] - b.baseStats[sortKey]
      );
    }
    return list;
  }, [creatures, selectedElements, selectedRarities, favoritesOnly, favoriteCreatureIds, sortKey, sortDesc]);

  const activeFilterCount = selectedElements.size + selectedRarities.size + (favoritesOnly ? 1 : 0);

  const clearFilters = () => {
    setSelectedElements(new Set());
    setSelectedRarities(new Set());
    setFavoritesOnly(false);
  };

  const handleSelectPreset = (id: string | "new") => {
    setSelectedPresetId(id);
    const slotCount = MODE_SLOTS[mode];
    if (id === "new") {
      setDraftName("New Formation");
      setDraftSlots(Array(slotCount).fill(null));
    } else {
      const preset = teamPresets.find((p) => p.id === id);
      if (preset) {
        setDraftName(preset.name);
        const slots: (string | null)[] = Array(slotCount).fill(null);
        for (let i = 0; i < slotCount; i++) {
          slots[i] = preset.creatureIds[i] || null;
        }
        setDraftSlots(slots);
      }
    }
  };

  const handleToggleSlot = (creatureId: string) => {
    setDraftSlots((prev) => {
      const next = [...prev];
      const existingIdx = next.indexOf(creatureId);
      if (existingIdx !== -1) {
        next[existingIdx] = null;
        return next;
      }
      const emptyIdx = next.indexOf(null);
      if (emptyIdx !== -1) {
        next[emptyIdx] = creatureId;
      }
      return next;
    });
  };

  const handleClearSlots = () => setDraftSlots(Array(MODE_SLOTS[mode]).fill(null));

  const handleSave = async () => {
    if (!draftName.trim()) return;
    setIsSaving(true);
    try {
      const creatureIds = draftSlots.filter(Boolean) as string[];
      // We always create a new DB record and delete the old one if editing,
      // or we just save a new one.
      if (selectedPresetId !== "new") {
        await deleteFormationAction(selectedPresetId);
        deleteTeamPresetStore(selectedPresetId);
      }

      const newId = await saveFormationAction(draftName.trim(), creatureIds, mode);
      saveTeamPreset(newId, draftName.trim(), creatureIds, mode);
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
  const filledCount = draftSlots.filter(Boolean).length;

  // Check if current draft is exactly the campaign active team
  const isCurrentlyCampaign =
    mode === "campaign" &&
    partyCreatureIds.length === draftSlots.length &&
    partyCreatureIds.every((id, idx) => id === draftSlots[idx]);

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-2 lg:gap-4">
        <BackButton href="/formations" label="Back to Formation Menu" />
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Formations</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Build and save teams for different game modes.
          </p>
        </div>
      </div>

      {/* Mode tabs + Saved Presets */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => handleSelectMode("campaign")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
              mode === "campaign"
                ? "border-gold bg-gold text-white"
                : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:text-foreground"
            )}
          >
            <Play className="h-3.5 w-3.5" /> Campaign <span className="opacity-70">1-2</span>
          </button>
          <button
            onClick={() => handleSelectMode("raid")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
              mode === "raid"
                ? "border-gold bg-gold text-white"
                : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:text-foreground"
            )}
          >
            <Flame className="h-3.5 w-3.5" /> Raid <span className="opacity-70">1-4</span>
          </button>
        </div>

        <div className="flex flex-1 flex-wrap gap-2">
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
          {modePresets.map((preset) => (
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

      {/* Name + actions */}
      <GlowPanel accent="gold" className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value.slice(0, MAX_NAME_LENGTH))}
            placeholder="Formation Name"
            className="flex-1 rounded-lg border border-arcade-border bg-arcade-panel-light px-3 py-2 text-sm text-foreground outline-none focus:border-gold font-semibold"
          />
          <span className="text-[10px] text-zinc-500 font-mono shrink-0">
            {draftName.length}/{MAX_NAME_LENGTH}
          </span>
        </div>
        <div className="flex gap-2">
          {mode === "campaign" && (
            <PixelButton
              onClick={handleSetCampaignActive}
              disabled={isCurrentlyCampaign}
              variant={isCurrentlyCampaign ? "ghost" : "gold"}
              size="sm"
            >
              {isCurrentlyCampaign ? "Active" : "Set Active"}
            </PixelButton>
          )}
          <PixelButton onClick={handleSave} disabled={isSaving || !draftName.trim()} variant="neon" size="sm">
            <Save className="mr-1.5 h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save"}
          </PixelButton>
          {selectedPresetId !== "new" && (
            <PixelButton
              onClick={handleDelete}
              disabled={isDeleting}
              variant="ghost"
              size="sm"
              className="px-3 !text-red-400 hover:!bg-red-400/10"
              aria-label="Delete preset"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </PixelButton>
          )}
        </div>
      </GlowPanel>

      {/* Filters */}
      <div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
            activeFilterCount > 0
              ? "border-gold bg-gold/10 text-gold-bright"
              : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-gold px-1.5 py-0.5 text-[9px] text-white">{activeFilterCount}</span>
          )}
        </button>

        {filtersOpen && (
          <GlowPanel accent="none" className="mt-2 space-y-3 p-3">
            <div className="space-y-1.5">
              <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {ELEMENTS.map((el) => {
                  const Icon = ELEMENT_ICON[el];
                  const active = selectedElements.has(el);
                  return (
                    <button
                      key={el}
                      onClick={() =>
                        setSelectedElements((p) => {
                          const n = new Set(p);
                          n.has(el) ? n.delete(el) : n.add(el);
                          return n;
                        })
                      }
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                        active
                          ? "border-gold bg-gold/10 text-gold-bright"
                          : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:border-gold/60"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" /> {el}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Rarity</p>
              <div className="flex flex-wrap gap-1.5">
                {RARITIES.map((r) => {
                  const active = selectedRarities.has(r);
                  return (
                    <button
                      key={r}
                      onClick={() =>
                        setSelectedRarities((p) => {
                          const n = new Set(p);
                          n.has(r) ? n.delete(r) : n.add(r);
                          return n;
                        })
                      }
                    >
                      <RarityBadge rarity={r} className={cn("transition-opacity", !active && "opacity-35 grayscale")} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Sort by</p>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map(({ key, label }) => {
                  const active = sortKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (sortKey === key) setSortDesc((d) => !d);
                        else {
                          setSortKey(key);
                          setSortDesc(true);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                        active
                          ? "border-gold bg-gold/10 text-gold-bright"
                          : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:border-gold/60"
                      )}
                    >
                      {label} {active && (sortDesc ? "↓" : "↑")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Other</p>
              <button
                onClick={() => setFavoritesOnly((v) => !v)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  favoritesOnly
                    ? "border-gold bg-gold/10 text-gold-bright"
                    : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:border-gold/60"
                )}
              >
                <Heart className={cn("h-3.5 w-3.5", favoritesOnly && "fill-current")} /> Favorites Only
              </button>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="w-full text-center font-arcade text-[9px] uppercase tracking-wide text-zinc-500 hover:text-gold-bright"
              >
                Clear filters
              </button>
            )}
          </GlowPanel>
        )}
      </div>

      {/* Roster — the main, dominant content area. 2xl adds a 7th column so wide desktops gain
          density instead of just stretching the gaps between cards. */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-4 2xl:grid-cols-7">
        {filteredCreatures.map((creature) => {
          const isAssigned = draftIdsSet.has(creature.id);
          const isFavorite = favoriteCreatureIds.includes(creature.id);

          return (
            <div key={creature.id} className="relative">
              <button onClick={() => handleToggleSlot(creature.id)} className="flex w-full flex-col items-center gap-1">
                <div
                  className={cn(
                    "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 bg-gradient-to-b pixel-frame transition-colors sm:h-20 sm:w-20 lg:h-24 lg:w-24",
                    ELEMENT_GRADIENT[creature.element],
                    isAssigned
                      ? "border-gold ring-2 ring-gold/70"
                      : cn(RARITY_BORDER[creature.rarity], "hover:ring-2 hover:ring-gold/40")
                  )}
                >
                  <RarityCardAura rarity={creature.rarity} />
                  <CreatureSprite creature={creature} className="h-11 w-11 p-0.5 text-gold-bright sm:h-14 sm:w-14 lg:h-16 lg:w-16" />

                  {/* Level (+ dupe count, when >1) — bottom-left, opposite corner from the Hidden
                      Potential star CreatureSprite draws bottom-right, so the two never collide. */}
                  <span className="absolute bottom-1 left-1 z-20 flex items-center gap-0.5 rounded bg-black/70 px-1 font-mono text-[9px] font-bold leading-tight text-white sm:text-[10px]">
                    Lv{creature.level}
                    {creature.copies > 1 && <span className="text-amber-300">×{creature.copies}</span>}
                  </span>

                  {isAssigned && (
                    <div className="absolute top-1 right-1 z-20 h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_6px_rgba(255,184,77,0.9)] sm:h-3 sm:w-3" />
                  )}
                </div>
                <CreatureName creature={creature} className="w-full truncate text-center text-xs font-semibold sm:text-sm" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(creature.id);
                }}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                className={cn(
                  "absolute left-1 top-1 z-20 flex h-5 w-5 items-center justify-center transition-colors sm:h-6 sm:w-6",
                  isFavorite ? "text-red-400" : "text-white/70 hover:text-red-300"
                )}
              >
                <Heart className={cn("h-3.5 w-3.5 drop-shadow sm:h-4 sm:w-4", isFavorite && "fill-current")} />
              </button>
            </div>
          );
        })}

        {filteredCreatures.length === 0 && (
          <div className="col-span-full h-24 flex items-center justify-center text-xs text-zinc-500 border border-dashed border-arcade-border rounded-xl">
            No creatures match filters.
          </div>
        )}
      </div>

      {/* Sticky team strip — the current formation. Capped width + centered instead of stretching
          full-page-wide, so a half-empty 2-slot Campaign team doesn't read as a barren bar. */}
      <div className="sticky bottom-3 lg:bottom-5 z-20 mx-auto w-full max-w-2xl">
        <GlowPanel accent="neon" className="flex items-center gap-3 p-2.5 lg:p-3.5">
          {filledCount === 0 && (
            <p className="shrink-0 text-[10px] text-zinc-500 sm:text-xs">Tap a character above to build your team →</p>
          )}
          <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-hide">
            {draftSlots.map((id, slotIndex) => {
              const creature = creatureById(id);
              if (!creature) {
                return (
                  <div
                    key={slotIndex}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-arcade-border text-zinc-600 sm:h-14 sm:w-14"
                  >
                    <UserX className="h-5 w-5 opacity-50" />
                  </div>
                );
              }
              return (
                <button
                  key={slotIndex}
                  onClick={() => handleToggleSlot(creature.id)}
                  className="group relative shrink-0"
                  aria-label={`Remove ${creature.name}`}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg border border-gold bg-gradient-to-b sm:h-14 sm:w-14",
                      ELEMENT_GRADIENT[creature.element]
                    )}
                  >
                    <CreatureSprite creature={creature} className="h-8 w-8 sm:h-9 sm:w-9" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="h-4 w-4 text-red-400" />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="shrink-0 font-arcade text-[10px] uppercase tracking-wide text-zinc-400">
            {filledCount}/{MODE_SLOTS[mode]}
          </p>
          {filledCount > 0 && (
            <button
              onClick={handleClearSlots}
              className="shrink-0 font-arcade text-[10px] uppercase tracking-wide text-zinc-500 hover:text-red-400"
            >
              Clear
            </button>
          )}
        </GlowPanel>
      </div>
    </div>
  );
}
