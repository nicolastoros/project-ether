"use client";

import { motion } from "framer-motion";
import { useActiveCreature, useGameStore } from "@/lib/store";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { TAMER_CATALOG } from "@/lib/gameData";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { TamerSprite } from "@/components/ui/TamerSprite";
import { xpPercent, cn } from "@/lib/utils";

export function CreatureShowcase() {
  const creature = useActiveCreature();
  const creatures = useGameStore((s) => s.creatures);
  const hubTeamIds = useGameStore((s) => s.hubTeamIds);
  const setActiveCreature = useGameStore((s) => s.setActiveCreature);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);
  const hubTeam = hubTeamIds
    .map((id) => creatures.find((c) => c.id === id))
    .filter((c): c is (typeof creatures)[number] => Boolean(c));

  // Briefly true right after login/registration, before the account bundle finishes loading.
  if (!creature) return null;

  // The Tamer stays put here no matter which Digimon is active below (swapping active creature
  // via the hub-team row, or leveling/evolving it) — it's the constant "partner" pairing, not
  // tied to a specific Digimon.
  const equippedTamer = TAMER_CATALOG.find((t) => t.id === equippedTamerId) ?? TAMER_CATALOG[0];

  return (
    <GlowPanel className="p-4">
      <RarityCardAura rarity={creature.rarity} />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-arcade text-xs glow-text-gold">Active Creature</h2>
          <p className="mt-1">
            <CreatureName creature={creature} className="text-lg font-bold" />
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <RarityBadge rarity={creature.rarity} />
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            Stage {creature.stage} · Lv.{creature.level}
          </span>
        </div>
      </div>

      <div
        className={cn(
          "relative flex h-48 items-center justify-center gap-2 overflow-hidden rounded-xl border border-arcade-border bg-gradient-to-b",
          ELEMENT_GRADIENT[creature.element]
        )}
      >
        {/* Taller than the Digimon's h-32 box below — the Tamer is the player's own avatar and
            should read as the more prominent figure in the scene, not a same-size sidekick. */}
        <div className="flex h-44 w-44 shrink-0 items-center justify-center">
          <TamerSprite
            spriteFolder={equippedTamer.spriteFolder}
            name={equippedTamer.name}
            className="h-full w-full drop-shadow-md"
          />
        </div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "flex shrink-0 items-center justify-center",
            creature.spriteFolder
              ? "h-32 w-32"
              : "h-20 w-20 rounded-xl border-2 border-gold bg-arcade-panel pixel-frame glow-border-gold"
          )}
        >
          <CreatureSprite
            creature={creature}
            spin
            className={cn(creature.spriteFolder ? "h-full w-full drop-shadow-md" : "h-10 w-10 p-1 text-gold-bright")}
          />
        </motion.div>
        <span className="absolute bottom-1.5 right-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500/80">
          {creature.element}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <ProgressBar
          percent={100}
          color="hp"
          label={`HP ${creature.baseStats.hp}`}
        />
        <ProgressBar
          percent={xpPercent(creature.exp, creature.expToNextLevel)}
          color="exp"
          label={`EXP ${creature.exp}/${creature.expToNextLevel}`}
          showPercentText
        />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {(
          [
            ["ATK", creature.baseStats.atk],
            ["DEF", creature.baseStats.def],
            ["SPD", creature.baseStats.spd],
            ["HP", creature.baseStats.hp],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-arcade-border bg-arcade-panel-light py-1.5">
            <p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p>
            <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {hubTeam.length > 1 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[9px] uppercase tracking-wide text-zinc-500">
            Hub Team {hubTeam.length}/7
          </p>
          <div className="flex gap-2">
            {hubTeam.map((c) => {
              const isActive = c.id === creature.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCreature(c.id)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                    isActive
                      ? "border-gold bg-arcade-panel-light glow-border-gold"
                      : "border-arcade-border bg-arcade-panel text-zinc-500 hover:text-zinc-700"
                  )}
                  aria-label={`Select ${c.name}`}
                >
                  <CreatureSprite creature={c} className={cn("h-5 w-5 p-0.5", isActive && "text-gold-bright")} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GlowPanel>
  );
}
