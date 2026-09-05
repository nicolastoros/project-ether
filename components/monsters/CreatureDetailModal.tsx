"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Star, X, Zap } from "lucide-react";
import type { Creature, Skill } from "@/types/game";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { HUB_TEAM_SIZE, useGameStore } from "@/lib/store";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn, xpPercent } from "@/lib/utils";
import { useState } from "react";
import { HiddenPotentialScreen } from "./HiddenPotentialScreen";
import { SuperAttackTrainingModal } from "./SuperAttackTrainingModal";
import { AwakenScreen } from "./AwakenScreen";

export const SKILL_TYPE_STYLES: Record<Skill["type"], string> = {
  Attack: "bg-red-500",
  Defense: "bg-sky-500",
  Support: "bg-emerald-500",
  Passive: "bg-violet-500",
};

interface CreatureDetailModalProps {
  creature: Creature | null;
  isActive: boolean;
  onClose: () => void;
  onSetActive: (creatureId: string) => void;
}

export function CreatureDetailModal({
  creature: propCreature,
  isActive,
  onClose,
  onSetActive,
}: CreatureDetailModalProps) {
  const storeCreatures = useGameStore((s) => s.creatures);
  const creature = propCreature ? storeCreatures.find((c) => c.id === propCreature.id) || propCreature : null;

  const hubTeamIds = useGameStore((s) => s.hubTeamIds);
  const toggleHubTeamMember = useGameStore((s) => s.toggleHubTeamMember);
  const isHubMember = creature ? hubTeamIds.includes(creature.id) : false;
  const hubFull = !isHubMember && hubTeamIds.length >= HUB_TEAM_SIZE;

  const [showPotential, setShowPotential] = useState(false);
  const [showSA, setShowSA] = useState(false);
  const [showAwaken, setShowAwaken] = useState(false);

  if (showPotential && creature) {
    return <HiddenPotentialScreen creature={creature} onClose={() => setShowPotential(false)} />;
  }

  if (showSA && creature) {
    return <SuperAttackTrainingModal creature={creature} onClose={() => setShowSA(false)} />;
  }

  if (showAwaken && creature) {
    return <AwakenScreen creature={creature} onClose={() => setShowAwaken(false)} />;
  }

  return (
    <AnimatePresence>
      {creature && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-arcade-border bg-arcade-panel shadow-xl sm:rounded-3xl"
          >
            <RarityCardAura rarity={creature.rarity} />

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-500 shadow-sm transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-0 flex w-full flex-col overflow-y-auto">
              <div
                className={cn(
                  "flex h-56 shrink-0 items-center justify-center bg-gradient-to-b",
                  ELEMENT_GRADIENT[creature.element]
                )}
              >
                <CreatureSprite creature={creature} spin className="h-40 w-40 drop-shadow-md" />
              </div>

              <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2>
                    <CreatureName creature={creature} className="text-xl font-bold" />
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {creature.element} · Stage {creature.stage} · Lv.{creature.level}
                    {creature.copies > 1 && (
                      <span className="ml-1.5 font-arcade text-gold-bright">×{creature.copies} owned</span>
                    )}
                  </p>
                  {!isHubMember && (
                    <span className="mt-1 inline-flex items-center gap-1 font-arcade text-[8px] uppercase text-emerald-600">
                      <Zap className="h-3 w-3 animate-pulse" />
                      Farming EXP in the box
                    </span>
                  )}
                </div>
                <RarityBadge rarity={creature.rarity} />
              </div>

              <div className="mt-3 space-y-2">
                <ProgressBar percent={100} color="hp" label={`HP ${creature.baseStats.hp}`} />
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
                  <div key={label} className="min-w-0 rounded-xl border border-arcade-border bg-arcade-panel-light px-1 py-1.5">
                    <p className="truncate text-[9px] uppercase tracking-wide text-zinc-600">{label}</p>
                    <p className="truncate font-mono text-[11px] font-semibold text-foreground sm:text-sm">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <h3 className="font-arcade text-xs glow-text-neon">Skills</h3>
                <ul className="mt-2 space-y-2">
                  {creature.skills.map((skill) => (
                    <li
                      key={skill.id}
                      className="rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">{skill.name}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 font-arcade text-[8px] font-semibold uppercase text-white",
                            SKILL_TYPE_STYLES[skill.type]
                          )}
                        >
                          {skill.type}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-600">{skill.description}</p>
                      <p className="mt-1 text-[9px] text-zinc-500">
                        {skill.power > 0 && `Power ${skill.power} · `}
                        {skill.cooldown > 0 && `Cooldown ${skill.cooldown}t · `}
                        Unlocks at Lv.{skill.unlockLevel}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex gap-2">
                <PixelButton
                  variant={isActive ? "ghost" : "gold"}
                  disabled={isActive}
                  className="flex-1"
                  onClick={() => onSetActive(creature.id)}
                >
                  {isActive ? "Active in Hub" : "Set as Hub Showcase"}
                </PixelButton>
                <PixelButton
                  variant={isHubMember ? "ghost" : "gold"}
                  disabled={hubFull}
                  className="flex-1"
                  onClick={() => toggleHubTeamMember(creature.id)}
                >
                  <Star className={cn("mr-1 inline h-3.5 w-3.5", isHubMember && "fill-current")} />
                  {isHubMember ? "Remove from Team" : "Add to Team"}
                </PixelButton>
              </div>

              <div className="mt-2 flex gap-2">
                <PixelButton
                  variant="gold"
                  className="flex-1 bg-violet-600 hover:bg-violet-500 border-violet-800"
                  onClick={() => setShowSA(true)}
                >
                  Train Super Attack
                </PixelButton>
                <PixelButton
                  variant="gold"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 border-amber-700"
                  onClick={() => setShowPotential(true)}
                >
                  Hidden Potential
                </PixelButton>
              </div>

              {creature.rarity === "SSR" && (
                <PixelButton
                  variant="gold"
                  className="mt-2 w-full bg-gradient-to-r from-amber-500 to-gold-bright"
                  onClick={() => setShowAwaken(true)}
                >
                  Awaken
                </PixelButton>
              )}
            </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
