"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, SlidersHorizontal, Star, X, Zap } from "lucide-react";
import { HUB_TEAM_SIZE, useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT, ELEMENT_ICON } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { MythicCardAura } from "@/components/ui/MythicCardAura";
import { PixelButton } from "@/components/ui/PixelButton";
import { CreatureDetailModal } from "@/components/monsters/CreatureDetailModal";
import type { Creature, Element, Rarity } from "@/types/game";
import { cn } from "@/lib/utils";

const ELEMENTS = Object.keys(ELEMENT_ICON) as Element[];
const RARITIES: Rarity[] = ["Common", "Rare", "SSR", "Mythic"];

interface MonsterCardProps {
  creature: Creature;
  isActive: boolean;
  isHubMember: boolean;
  hubFull: boolean;
  onSelect: () => void;
  onToggleHubTeam: () => void;
}

function MonsterCard({ creature, isActive, isHubMember, hubFull, onSelect, onToggleHubTeam }: MonsterCardProps) {
  // Drives both the sprite's turntable spin and a slight lift/scale on the whole card — a real
  // React state (not just a CSS :hover) since CreatureSprite's spin is driven by a JS interval.
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left"
    >
      <GlowPanel
        accent={isActive ? "gold" : "none"}
        className={cn(
          "relative flex flex-col gap-2 p-2.5 transition-all duration-200 sm:p-3",
          !isActive && "hover:border-gold",
          "hover:-translate-y-1 hover:shadow-lg"
        )}
      >
        {creature.rarity === "Mythic" && <MythicCardAura />}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleHubTeam();
          }}
          disabled={hubFull}
          aria-label={
            isHubMember ? `Remove ${creature.name} from hub team` : `Add ${creature.name} to hub team`
          }
          aria-pressed={isHubMember}
          className={cn(
            "absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors",
            isHubMember
              ? "border-gold bg-gold-bright/20 text-gold-bright"
              : "border-arcade-border bg-arcade-panel/90 text-zinc-400 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-400"
          )}
        >
          <Star className={cn("h-4 w-4", isHubMember && "fill-current")} />
        </button>

        <div
          className={cn(
            "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-gold bg-gradient-to-b pixel-frame transition-transform duration-300",
            ELEMENT_GRADIENT[creature.element],
            hovered && "scale-[1.04]"
          )}
        >
          <CreatureSprite creature={creature} spin={hovered} className="h-4/5 w-4/5 text-gold-bright" />
        </div>

        <div className="min-w-0 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <CreatureName creature={creature} className="truncate text-sm font-semibold sm:text-base" />
            {isActive && <span className="font-arcade text-[8px] text-gold-bright">ACTIVE</span>}
          </div>
          <p className="text-[10px] text-zinc-600">
            {creature.element} · Stage {creature.stage} · Lv.{creature.level}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
            <RarityBadge rarity={creature.rarity} />
            {creature.copies > 1 && (
              <span className="rounded-full border border-gold/60 bg-gold/10 px-1.5 py-0.5 font-arcade text-[8px] font-semibold text-gold-bright">
                ×{creature.copies}
              </span>
            )}
            {!isHubMember && (
              <span className="inline-flex items-center gap-0.5 font-arcade text-[7px] uppercase text-emerald-600">
                <Zap className="h-2.5 w-2.5 animate-pulse" />
                Farming EXP
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          {(
            [
              ["HP", creature.baseStats.hp],
              ["ATK", creature.baseStats.atk],
              ["DEF", creature.baseStats.def],
              ["SPD", creature.baseStats.spd],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-arcade-border bg-arcade-panel-light py-1">
              <p className="text-[8px] uppercase tracking-wide text-zinc-600">{label}</p>
              <p className="font-mono text-[11px] font-semibold text-foreground sm:text-xs">{value}</p>
            </div>
          ))}
        </div>
      </GlowPanel>
    </div>
  );
}

// Column count for the paginated desktop grid — kept in sync with the plain grid-cols-N classes
// used below (no lg:/xl:/2xl: prefixes there since this hook already gates on those same
// breakpoints, and JS needs to know the real count to compute a "2 rows" page size).
function usePageColumns() {
  const [columns, setColumns] = useState(3);
  useEffect(() => {
    const xl = window.matchMedia("(min-width: 1280px)");
    const xxl = window.matchMedia("(min-width: 1536px)");
    const update = () => setColumns(xxl.matches ? 5 : xl.matches ? 4 : 3);
    update();
    xl.addEventListener("change", update);
    xxl.addEventListener("change", update);
    return () => {
      xl.removeEventListener("change", update);
      xxl.removeEventListener("change", update);
    };
  }, []);
  return columns;
}

function PageArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous page" : "Next page"}
      className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-arcade-border bg-arcade-panel shadow-sm transition-colors hover:border-gold hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-arcade-border disabled:hover:text-inherit"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function ElementFilterGroup({
  selected,
  onToggle,
}: {
  selected: Set<Element>;
  onToggle: (el: Element) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Type</p>
      <div className="flex flex-col gap-1.5">
        {ELEMENTS.map((el) => {
          const Icon = ELEMENT_ICON[el];
          const active = selected.has(el);
          return (
            <button
              key={el}
              onClick={() => onToggle(el)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs transition-colors",
                active
                  ? "border-gold bg-gold/10 text-gold-bright"
                  : "border-arcade-border bg-arcade-panel-light text-zinc-600 hover:border-gold/60"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {el}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RarityLevelFilterGroup({
  selectedRarities,
  onToggleRarity,
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
}: {
  selectedRarities: Set<Rarity>;
  onToggleRarity: (r: Rarity) => void;
  minLevel: string;
  maxLevel: string;
  onMinLevelChange: (v: string) => void;
  onMaxLevelChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Rarity</p>
        <div className="flex flex-wrap gap-1.5">
          {RARITIES.map((r) => {
            const active = selectedRarities.has(r);
            return (
              <button key={r} onClick={() => onToggleRarity(r)} aria-pressed={active}>
                <RarityBadge rarity={r} className={cn("transition-opacity", !active && "opacity-35 grayscale")} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Level</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            placeholder="Min"
            value={minLevel}
            onChange={(e) => onMinLevelChange(e.target.value)}
            className="w-full rounded-lg border border-arcade-border bg-arcade-panel-light px-2 py-1.5 text-xs text-foreground outline-none focus:border-gold"
          />
          <span className="text-zinc-500">–</span>
          <input
            type="number"
            min={1}
            placeholder="Max"
            value={maxLevel}
            onChange={(e) => onMaxLevelChange(e.target.value)}
            className="w-full rounded-lg border border-arcade-border bg-arcade-panel-light px-2 py-1.5 text-xs text-foreground outline-none focus:border-gold"
          />
        </div>
      </div>
    </div>
  );
}

export default function MonstersPage() {
  const creatures = useGameStore((s) => s.creatures);
  const activeCreatureId = useGameStore((s) => s.activeCreatureId);
  const setActiveCreature = useGameStore((s) => s.setActiveCreature);
  const hubTeamIds = useGameStore((s) => s.hubTeamIds);
  const toggleHubTeamMember = useGameStore((s) => s.toggleHubTeamMember);
  const [selected, setSelected] = useState<Creature | null>(null);

  const [selectedElements, setSelectedElements] = useState<Set<Element>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<Rarity>>(new Set());
  const [minLevel, setMinLevel] = useState("");
  const [maxLevel, setMaxLevel] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);

  const toggleElement = (el: Element) =>
    setSelectedElements((prev) => {
      const next = new Set(prev);
      if (next.has(el)) next.delete(el);
      else next.add(el);
      return next;
    });

  const toggleRarity = (r: Rarity) =>
    setSelectedRarities((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });

  const clearFilters = () => {
    setSelectedElements(new Set());
    setSelectedRarities(new Set());
    setMinLevel("");
    setMaxLevel("");
  };

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

  // Reset to page 1 whenever the filters themselves change (not just their result count) —
  // adjusting state during render, per React's guidance, instead of a setState-in-effect.
  const filterSignature = `${[...selectedElements].sort().join(",")}|${[...selectedRarities]
    .sort()
    .join(",")}|${minLevel}|${maxLevel}`;
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPage(0);
  }

  const columns = usePageColumns();
  const pageSize = columns * 2;
  const pageCount = Math.max(1, Math.ceil(filteredCreatures.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageCreatures = filteredCreatures.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  const renderCard = (creature: Creature) => {
    const isActive = creature.id === activeCreatureId;
    const isHubMember = hubTeamIds.includes(creature.id);
    const hubFull = !isHubMember && hubTeamIds.length >= HUB_TEAM_SIZE;
    return (
      <MonsterCard
        key={creature.id}
        creature={creature}
        isActive={isActive}
        isHubMember={isHubMember}
        hubFull={hubFull}
        onSelect={() => setSelected(creature)}
        onToggleHubTeam={() => toggleHubTeamMember(creature.id)}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Monsters</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {creatures.length} creatures collected. Tap one to view its stats and skills.
        </p>
        <p className="mt-1 text-[10px] text-zinc-600">
          <Star className="mr-1 inline h-3 w-3 text-gold-bright" />
          Hub team {hubTeamIds.length}/{HUB_TEAM_SIZE} — the rest keep farming EXP in the box.
        </p>
      </div>

      {/* Desktop: filters live in the side gutters that opened up once AppShell's max-w grew
          (see AppShell.tsx), and the grid pages 2 rows at a time instead of growing tall —
          arrows sit right next to the grid so paging doesn't require scrolling back up. */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[180px_1fr_180px] lg:items-start">
        <GlowPanel accent="none" className="space-y-3 p-3">
          <ElementFilterGroup selected={selectedElements} onToggle={toggleElement} />
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="font-arcade text-[9px] uppercase tracking-wide text-zinc-500 hover:text-gold-bright"
            >
              Clear filters
            </button>
          )}
        </GlowPanel>

        <div className="flex items-start gap-2">
          <PageArrow direction="left" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={clampedPage === 0} />

          <div className="min-w-0 flex-1 space-y-2">
            {pageCreatures.length > 0 ? (
              <div
                className={cn(
                  "grid gap-3",
                  columns === 5 ? "grid-cols-5" : columns === 4 ? "grid-cols-4" : "grid-cols-3"
                )}
              >
                {pageCreatures.map(renderCard)}
              </div>
            ) : (
              <GlowPanel accent="none" className="flex h-40 items-center justify-center text-xs text-zinc-500">
                No creatures match these filters.
              </GlowPanel>
            )}
            {pageCount > 1 && (
              <p className="text-center font-arcade text-[9px] uppercase tracking-wide text-zinc-500">
                Page {clampedPage + 1} / {pageCount}
              </p>
            )}
          </div>

          <PageArrow
            direction="right"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={clampedPage >= pageCount - 1}
          />
        </div>

        <GlowPanel accent="none" className="p-3">
          <RarityLevelFilterGroup
            selectedRarities={selectedRarities}
            onToggleRarity={toggleRarity}
            minLevel={minLevel}
            maxLevel={maxLevel}
            onMinLevelChange={setMinLevel}
            onMaxLevelChange={setMaxLevel}
          />
        </GlowPanel>
      </div>

      {/* Mobile/tablet: filters collapse into a sheet triggered from one button, and the grid
          just keeps scrolling — 2-row pagination doesn't make sense once each row only fits
          2-3 cards. */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
            activeFilterCount > 0
              ? "border-gold bg-gold/10 text-gold-bright"
              : "border-arcade-border bg-arcade-panel-light text-zinc-600"
          )}
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-gold px-1.5 py-0.5 text-[9px] text-white">{activeFilterCount}</span>
            )}
          </span>
          <span className="text-[10px] text-zinc-500">{filteredCreatures.length} shown</span>
        </button>

        {filteredCreatures.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filteredCreatures.map(renderCard)}
          </div>
        ) : (
          <GlowPanel accent="none" className="mt-3 flex h-32 items-center justify-center text-xs text-zinc-500">
            No creatures match these filters.
          </GlowPanel>
        )}
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex items-end lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative flex max-h-[80vh] w-full flex-col overflow-y-auto rounded-t-3xl border border-arcade-border bg-arcade-panel p-4 shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-arcade text-xs glow-text-gold">Filters</h2>
                <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters">
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              </div>

              <div className="space-y-4">
                <ElementFilterGroup selected={selectedElements} onToggle={toggleElement} />
                <RarityLevelFilterGroup
                  selectedRarities={selectedRarities}
                  onToggleRarity={toggleRarity}
                  minLevel={minLevel}
                  maxLevel={maxLevel}
                  onMinLevelChange={setMinLevel}
                  onMaxLevelChange={setMaxLevel}
                />
              </div>

              <div className="mt-4 flex gap-2">
                <PixelButton variant="ghost" size="sm" className="flex-1" onClick={clearFilters}>
                  Clear
                </PixelButton>
                <PixelButton size="sm" className="flex-1" onClick={() => setMobileFiltersOpen(false)}>
                  Show {filteredCreatures.length}
                </PixelButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CreatureDetailModal
        creature={selected}
        isActive={selected?.id === activeCreatureId}
        onClose={() => setSelected(null)}
        onSetActive={(id) => {
          setActiveCreature(id);
          setSelected(null);
        }}
      />
    </div>
  );
}
