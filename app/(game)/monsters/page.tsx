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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {creatures.map((creature) => {
          const isActive = creature.id === activeCreatureId;
          const isHubMember = hubTeamIds.includes(creature.id);
          const hubFull = !isHubMember && hubTeamIds.length >= HUB_TEAM_SIZE;
          return (
            <div
              key={creature.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected(creature)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelected(creature);
              }}
              className="text-left"
            >
              <GlowPanel
                accent={isActive ? "gold" : "none"}
                className={cn(
                  "relative flex flex-col gap-3 p-3 transition-colors",
                  !isActive && "hover:border-gold"
                )}
              >
                {creature.rarity === "Mythic" && <MythicCardAura />}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHubTeamMember(creature.id);
                  }}
                  disabled={hubFull}
                  aria-label={
                    isHubMember
                      ? `Remove ${creature.name} from hub team`
                      : `Add ${creature.name} to hub team`
                  }
                  aria-pressed={isHubMember}
                  className={cn(
                    "absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                    isHubMember
                      ? "border-gold bg-gold-bright/20 text-gold-bright"
                      : "border-arcade-border bg-arcade-panel text-zinc-400 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-zinc-400"
                  )}
                >
                  <Star className={cn("h-3.5 w-3.5", isHubMember && "fill-current")} />
                </button>

                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gold bg-gradient-to-b pixel-frame",
                      ELEMENT_GRADIENT[creature.element]
                    )}
                  >
                    <CreatureSprite creature={creature} className="h-7 w-7 p-0.5 text-gold-bright" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <CreatureName creature={creature} className="truncate text-sm font-semibold" />
                      {isActive && (
                        <span className="font-arcade text-[8px] text-gold-bright">ACTIVE</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600">
                      {creature.element} · Stage {creature.stage} · Lv.{creature.level}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
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
                    <div
                      key={label}
                      className="rounded-xl border border-arcade-border bg-arcade-panel-light py-1"
                    >
                      <p className="text-[8px] uppercase tracking-wide text-zinc-600">{label}</p>
                      <p className="font-mono text-xs font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </GlowPanel>
            </div>
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
