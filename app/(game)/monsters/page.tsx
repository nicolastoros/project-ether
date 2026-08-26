"use client";

import { useState } from "react";
import { Star, Zap } from "lucide-react";
import { HUB_TEAM_SIZE, useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { MythicCardAura } from "@/components/ui/MythicCardAura";
import { CreatureDetailModal } from "@/components/monsters/CreatureDetailModal";
import type { Creature } from "@/types/game";
import { cn } from "@/lib/utils";

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

export default function MonstersPage() {
  const creatures = useGameStore((s) => s.creatures);
  const activeCreatureId = useGameStore((s) => s.activeCreatureId);
  const setActiveCreature = useGameStore((s) => s.setActiveCreature);
  const hubTeamIds = useGameStore((s) => s.hubTeamIds);
  const toggleHubTeamMember = useGameStore((s) => s.toggleHubTeamMember);
  const [selected, setSelected] = useState<Creature | null>(null);

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {creatures.map((creature) => {
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
        })}
      </div>

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
