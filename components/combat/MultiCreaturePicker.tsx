"use client";

import { Fragment, useState } from "react";
import { Search, X } from "lucide-react";
import type { Creature, Rarity } from "@/types/game";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";
import { RARITY_BORDER_CLASS, sortCreaturesByRarity } from "@/lib/gameData";
import { useT } from "@/lib/i18n/useT";

// Matches RARITY_BORDER_CLASS's tiers, for the section-header label text below — same identity
// color per rarity, just as text instead of a border.
const RARITY_TEXT_CLASS: Record<Rarity, string> = {
  Common: "text-rarity-common",
  Rare: "text-rarity-rare",
  SSR: "text-rarity-ssr",
  Mythic: "text-rarity-mythic",
  LR: "text-amber-500",
};

interface MultiCreaturePickerProps {
  creatures: Creature[];
  /** Creatures shown but not selectable, each mapped to a short reason label shown in place of
   * "SELECTED" (e.g. "ON EXPEDITION", "MAX LEVEL"). */
  excludedIds?: Map<string, string>;
  selectedIds: string[];
  maxCount: number;
  onToggle: (creatureId: string) => void;
  onConfirm: () => void;
  confirmLabel?: string;
  confirmDisabled?: boolean;
}

/** Reusable single/multi creature-select grid — generalizes TeamSelectScreen.tsx's picker-card
 * pattern (which stays Campaign-specific) for any flow that needs to pick up to N owned
 * creatures: Raid Battle (max 4), Expeditions (max 6), consuming a training item (max 1), Hidden
 * Potential targeting. A player's roster easily runs past 40-50 creatures (gacha duplicates keep
 * piling up), so this always carries its own name search — scrolling a flat list that long to
 * find one specific creature isn't something a polished roster screen should ask of anyone. */
export function MultiCreaturePicker({
  creatures,
  excludedIds,
  selectedIds,
  maxCount,
  onToggle,
  onConfirm,
  confirmLabel,
  confirmDisabled,
}: MultiCreaturePickerProps) {
  const t = useT();
  const resolvedConfirmLabel = confirmLabel ?? t("picker.confirm");
  const [query, setQuery] = useState("");
  const sortedCreatures = sortCreaturesByRarity(creatures);
  const visibleCreatures = query.trim()
    ? sortedCreatures.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : sortedCreatures;
  return (
    // @container: this picker is reused in very different width contexts — a full-width page
    // (Raid party, Expeditions, Hidden Potential) vs. a narrow max-w-md modal (Inventory's "use
    // item on which creature?"). The grid below used to switch columns on *viewport* width (sm:/
    // lg:), so on any normal-width desktop window it still crammed 3 columns into that 448px
    // modal regardless of how little room it actually had — cards shrank to ~130px, truncating
    // names to one letter and squeezing level/rarity out. Container queries key off this
    // element's own rendered width instead, so the modal correctly stays single-column while the
    // wide page contexts still get 2-3.
    <div className="@container space-y-3">
      {creatures.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("picker.search_placeholder")}
            className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light py-2.5 pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-zinc-400 focus:border-gold"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={t("picker.clear_search")}
              className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {visibleCreatures.length === 0 ? (
        <p className="py-8 text-center text-xs text-zinc-500">{t("picker.no_match_prefix")}{query}{t("picker.no_match_suffix")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 @lg:grid-cols-2 @4xl:grid-cols-3">
          {visibleCreatures.map((creature, i) => {
            const excludedReason = excludedIds?.get(creature.id);
            const isExcluded = excludedReason !== undefined;
            const isSelected = selectedIds.includes(creature.id);
            const isDisabled = isExcluded || (!isSelected && selectedIds.length >= maxCount);
            // A flat list sorted by rarity still reads as one undifferentiated wall once a
            // roster runs past a dozen-plus Mythics — a thin section label per tier (sortation
            // already groups them contiguously) turns "wall of pink" into a scannable collection,
            // the same way Dex/gacha-style screens group by rarity instead of just tinting rows.
            const isNewRarityGroup = i === 0 || visibleCreatures[i - 1].rarity !== creature.rarity;
            return (
              <Fragment key={creature.id}>
                {isNewRarityGroup && (
                  <div className="col-span-full flex items-center gap-2 pt-1 first:pt-0">
                    <span className={cn("font-arcade text-[10px] font-bold uppercase tracking-widest", RARITY_TEXT_CLASS[creature.rarity])}>
                      {creature.rarity}
                    </span>
                    <div className="h-px flex-1 bg-arcade-border" />
                  </div>
                )}
                <button
                  onClick={() => !isExcluded && onToggle(creature.id)}
                  disabled={isDisabled}
                  className={cn("text-left", isDisabled && "cursor-not-allowed opacity-50")}
                >
                  <GlowPanel
                    accent={isSelected ? "gold" : "none"}
                    className={cn(
                      "relative flex items-center gap-3 p-2.5 transition-colors",
                      !isSelected && ["border-2", RARITY_BORDER_CLASS[creature.rarity]],
                      !isSelected && !isDisabled && "hover:border-gold"
                    )}
                  >
                    <RarityCardAura rarity={creature.rarity} />
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gold bg-gradient-to-b pixel-frame",
                        ELEMENT_GRADIENT[creature.element]
                      )}
                    >
                      <CreatureSprite creature={creature} className="h-7 w-7 text-gold-bright" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CreatureName creature={creature} className="truncate text-sm font-semibold" />
                      <p className="text-[10px] text-zinc-600">Lv.{creature.level}</p>
                    </div>
                    <RarityBadge rarity={creature.rarity} />
                    {isExcluded ? (
                      <span className="font-arcade text-[8px] text-zinc-400">{excludedReason}</span>
                    ) : (
                      isSelected && <span className="font-arcade text-[8px] text-gold-bright">{t("picker.selected")}</span>
                    )}
                  </GlowPanel>
                </button>
              </Fragment>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-3">
        <GlowPanel accent="neon" className="flex items-center justify-between gap-3 p-3">
          <p className="text-xs text-zinc-500">
            {selectedIds.length}/{maxCount} {maxCount !== 1 ? t("picker.creature_plural") : t("picker.creature_singular")}{t("picker.creature_selected_suffix")}
          </p>
          <PixelButton
            variant="neon"
            disabled={confirmDisabled ?? selectedIds.length === 0}
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </PixelButton>
        </GlowPanel>
      </div>
    </div>
  );
}
