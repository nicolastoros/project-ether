"use client";

import { UserX } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { MythicCardAura } from "@/components/ui/MythicCardAura";
import { cn } from "@/lib/utils";

export default function PartyPage() {
  const creatures = useGameStore((s) => s.creatures);
  const partyCreatureIds = useGameStore((s) => s.partyCreatureIds);
  const setPartySlot = useGameStore((s) => s.setPartySlot);

  const creatureById = (id: string | null) => creatures.find((c) => c.id === id) ?? null;
  const assignedIds = new Set(partyCreatureIds.filter(Boolean));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Party</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Choose up to 3 creatures to bring into battle.
        </p>
      </div>

      {/* max-w-xl keeps these 3 aspect-square slots at a sane size — without a cap they scale
          with the whole page's width (see AppShell's max-w), and on a wide screen 3 equal
          columns of a square each grow far larger than a "current team" preview should be. */}
      <div className="grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3">
        {partyCreatureIds.map((id, slotIndex) => {
          const creature = creatureById(id);
          if (!creature) {
            return (
              <GlowPanel
                key={slotIndex}
                accent="none"
                className="flex aspect-square flex-col items-center justify-center gap-1.5 border-dashed text-zinc-600"
              >
                <UserX className="h-6 w-6" />
                <span className="font-arcade text-[9px]">Empty</span>
              </GlowPanel>
            );
          }
          return (
            <GlowPanel
              key={slotIndex}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1.5 bg-gradient-to-b p-2 text-center",
                ELEMENT_GRADIENT[creature.element]
              )}
            >
              <CreatureSprite creature={creature} className="h-7 w-7 p-0.5 text-gold-bright sm:h-8 sm:w-8" />
              <CreatureName creature={creature} className="truncate text-[11px] font-semibold" />
              <p className="text-[9px] text-zinc-500">Lv.{creature.level}</p>
            </GlowPanel>
          );
        })}
      </div>

      <div>
        <h2 className="font-arcade text-xs glow-text-neon">Roster</h2>
        <p className="mt-1 text-[10px] text-zinc-600">Tap a creature to assign it to the next open slot.</p>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {creatures.map((creature) => {
            const isAssigned = assignedIds.has(creature.id);
            const assignedSlot = partyCreatureIds.indexOf(creature.id);

            return (
              <button
                key={creature.id}
                onClick={() => {
                  if (isAssigned) {
                    setPartySlot(assignedSlot, null);
                    return;
                  }
                  const openSlot = partyCreatureIds.indexOf(null);
                  if (openSlot !== -1) setPartySlot(openSlot, creature.id);
                }}
                className="text-left"
              >
                <GlowPanel
                  accent={isAssigned ? "gold" : "none"}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 transition-colors",
                    !isAssigned && "hover:border-gold"
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
                  {isAssigned && (
                    <span className="font-arcade text-[8px] text-gold-bright">IN PARTY</span>
                  )}
                </GlowPanel>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
