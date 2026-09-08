"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronDown, Gauge, Star, X } from "lucide-react";
import type { Creature, Skill } from "@/types/game";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { HUB_TEAM_SIZE, useGameStore } from "@/lib/store";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PixelButton } from "@/components/ui/PixelButton";
import { RARITY_BORDER_CLASS } from "@/lib/gameData";
import { creaturePower } from "@/lib/power";
import { getPotentialBonuses } from "@/lib/hiddenPotential";
import { cn, xpPercent } from "@/lib/utils";
import { useState } from "react";
import { useSyncGate } from "@/lib/useSyncGate";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { HiddenPotentialScreen } from "./HiddenPotentialScreen";
import { SuperAttackTrainingModal } from "./SuperAttackTrainingModal";
import { AwakenScreen } from "./AwakenScreen";

export const SKILL_TYPE_STYLES: Record<Skill["type"], string> = {
  Attack: "bg-red-500",
  Defense: "bg-sky-500",
  Support: "bg-emerald-500",
  Passive: "bg-violet-500",
};

// Big Dokkan-style stat tiles instead of a cramped 4-cell number grid — each stat gets its own
// color identity so a glance tells ATK from DEF from SPD, and `boostKey` maps to
// getPotentialBonuses' output so a stat raised by Hidden Potential nodes gets a small up-arrow
// badge (the same "this got buffed" cue Dokkan shows on its own stat panel).
const STAT_TILES: { label: string; key: "hp" | "atk" | "def" | "spd"; boostKey: "hp" | "atk" | "def" | "spd"; classes: string }[] = [
  { label: "HP", key: "hp", boostKey: "hp", classes: "border-red-300 bg-red-50 text-red-700" },
  { label: "ATK", key: "atk", boostKey: "atk", classes: "border-orange-300 bg-orange-50 text-orange-700" },
  { label: "DEF", key: "def", boostKey: "def", classes: "border-sky-300 bg-sky-50 text-sky-700" },
  { label: "SPD", key: "spd", boostKey: "spd", classes: "border-emerald-300 bg-emerald-50 text-emerald-700" },
];

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
  const [skillsExpanded, setSkillsExpanded] = useState(false);
  // Hidden Potential, Super Attack training, and Awaken all spend a scarce, hard-to-reverse
  // resource against this creature's current state — gate opening any of them behind a quick
  // re-sync against server truth first (see useSyncGate), the same race class that caused the
  // level/Hidden-Potential reset bug earlier.
  const { gating, runGated } = useSyncGate();

  const potentialBonuses = creature ? getPotentialBonuses(creature.potentialNodes) : null;

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
            className={cn(
              "relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-2 bg-arcade-panel shadow-xl sm:rounded-3xl",
              RARITY_BORDER_CLASS[creature.rarity]
            )}
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
                  <p className="mt-0.5 flex items-center gap-1.5 font-arcade text-sm glow-text-gold">
                    <Gauge className="h-4 w-4" />
                    {creaturePower(creature).toLocaleString()}
                  </p>
                </div>
                <RarityBadge rarity={creature.rarity} />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {STAT_TILES.map((tile) => {
                  const boosted = (potentialBonuses?.[tile.boostKey] ?? 0) > 0;
                  return (
                    <div
                      key={tile.key}
                      className={cn("relative min-w-0 rounded-2xl border-2 px-1 py-2", tile.classes)}
                    >
                      {boosted && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm">
                          <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      )}
                      <p className="truncate text-[9px] font-bold uppercase tracking-wide opacity-70">{tile.label}</p>
                      <p className="truncate font-mono text-lg font-bold leading-tight sm:text-xl">
                        {creature.baseStats[tile.key]}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3">
                <ProgressBar
                  percent={xpPercent(creature.exp, creature.expToNextLevel)}
                  color="exp"
                  label={`EXP ${creature.exp}/${creature.expToNextLevel}`}
                  showPercentText
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setSkillsExpanded((v) => !v)}
                  className="flex w-full items-center justify-between"
                >
                  <h3 className="font-arcade text-xs glow-text-neon">Skills</h3>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500">
                    {skillsExpanded ? "Hide Details" : "View Details"}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", skillsExpanded && "rotate-180")} />
                  </span>
                </button>
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
                      {skillsExpanded && (
                        <>
                          <p className="mt-1 text-[10px] text-zinc-600">{skill.description}</p>
                          <p className="mt-1 text-[9px] text-zinc-500">
                            {skill.power > 0 && `Power ${skill.power} · `}
                            {skill.cooldown > 0 && `Cooldown ${skill.cooldown}t · `}
                            Unlocks at Lv.{skill.unlockLevel}
                          </p>
                        </>
                      )}
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
                  onClick={() => runGated(() => setShowSA(true))}
                >
                  Train Super Attack
                </PixelButton>
                <PixelButton
                  variant="gold"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 border-amber-700"
                  onClick={() => runGated(() => setShowPotential(true))}
                >
                  Hidden Potential
                </PixelButton>
              </div>

              {creature.rarity === "SSR" && (
                <PixelButton
                  variant="gold"
                  className="mt-2 w-full bg-gradient-to-r from-amber-500 to-gold-bright"
                  onClick={() => runGated(() => setShowAwaken(true))}
                >
                  Awaken
                </PixelButton>
              )}
            </div>
            </div>
          </motion.div>
        </div>
      )}
      <LoadingOverlay show={gating} />
    </AnimatePresence>
  );
}
