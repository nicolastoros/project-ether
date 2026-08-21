"use client";

import { useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { cn } from "@/lib/utils";

export default function MonstersPage() {
  const creatures = useGameStore((s) => s.creatures);
  const activeCreatureId = useGameStore((s) => s.activeCreatureId);
  const setActiveCreature = useGameStore((s) => s.setActiveCreature);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Monsters</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {creatures.length} creatures collected. Tap one to set it as your hub showcase.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {creatures.map((creature) => {
          const isActive = creature.id === activeCreatureId;
          return (
            <button
              key={creature.id}
              onClick={() => setActiveCreature(creature.id)}
              className="text-left"
            >
              <GlowPanel
                accent={isActive ? "gold" : "none"}
                className={cn(
                  "flex flex-col gap-3 p-3 transition-colors",
                  !isActive && "hover:border-gold"
                )}
              >
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
                      <p className="truncate text-sm font-semibold text-foreground">
                        {creature.name}
                      </p>
                      {isActive && (
                        <span className="font-arcade text-[8px] text-gold-bright">ACTIVE</span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600">
                      {creature.element} · Stage {creature.stage} · Lv.{creature.level}
                    </p>
                    <RarityBadge rarity={creature.rarity} className="mt-1" />
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
