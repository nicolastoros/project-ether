"use client";

import { useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Droplet, Moon, Shield, Shuffle, Skull, Zap } from "lucide-react";
import type { BattleCombatant } from "@/lib/combat";
import type { StatusEffectType } from "@/types/game";
import { CreatureSprite, type Direction } from "@/components/ui/CreatureSprite";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LegendaryCardAura } from "@/components/ui/MythicCardAura";
import { cn } from "@/lib/utils";

// Small corner badges for active status effects — same visual language as the existing
// `guarding` Shield badge below. Exported so BattleScreen's desktop CombatantPlate (a separate
// component from this one) can render matching badges.
export const STATUS_BADGE: Record<StatusEffectType, { icon: typeof Zap; className: string }> = {
  paralysis: { icon: Zap, className: "bg-amber-500" },
  sleep: { icon: Moon, className: "bg-indigo-500" },
  poison: { icon: Droplet, className: "bg-emerald-500" },
  confusion: { icon: Shuffle, className: "bg-pink-500" },
};

interface CombatantCardProps {
  combatant: BattleCombatant;
  direction: Direction;
  isActingTurn: boolean;
  isTargetable: boolean;
  onSelectTarget?: () => void;
  /** uid of the combatant currently playing its attack animation, plus a nonce so repeat attacks by the same uid re-trigger. */
  attackerUid: string;
  attackNonce: number;
  /** uids struck by the most recent action, plus a nonce so repeat hits re-trigger. */
  hitUids: string[];
  hitNonce: number;
  /** Name of the active animation to play */
  activeAnimation?: string;
  /** "sm" is used for tighter arena art (e.g. the World 1-1 stone-circle background). */
  size?: "md" | "sm";
  /** True while this combatant is charging/unleashing its Ultimate Attack — overlays the
   * LR-rarity "power surge" aura on the sprite for the charge-up beat before damage lands. */
  isCastingUltimate?: boolean;
}

export function CombatantCard({
  combatant,
  direction,
  isActingTurn,
  isTargetable,
  onSelectTarget,
  attackerUid,
  attackNonce,
  hitUids,
  hitNonce,
  activeAnimation,
  size = "md",
  isCastingUltimate = false,
}: CombatantCardProps) {
  const { creature } = combatant;
  const hpPercent = Math.round((combatant.currentHp / combatant.maxHp) * 100);
  const lungeControls = useAnimationControls();
  const impactControls = useAnimationControls();
  const flashControls = useAnimationControls();

  useEffect(() => {
    if (attackerUid !== combatant.uid) return;
    const lungeX = combatant.side === "player" ? 30 : -30;
    lungeControls.start({ x: [0, lungeX, 0], transition: { duration: 0.22, times: [0, 0.35, 1], ease: "easeOut" } });
    // Re-trigger only when this combatant is the one whose attack just resolved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackNonce]);

  useEffect(() => {
    if (!hitUids.includes(combatant.uid)) return;
    impactControls.start({
      x: [0, -6, 5, -3, 0],
      scale: [1, 0.9, 1.05, 1],
      transition: { duration: 0.3, ease: "easeOut" },
    });
    flashControls.start({ opacity: [0.75, 0], transition: { duration: 0.16, ease: "easeOut" } });
    // Re-trigger only when a fresh hit lands, regardless of which uids were included.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitNonce]);

  const barWidth = size === "sm" ? "max-w-[7.5rem] lg:max-w-[9rem]" : "max-w-[9rem] lg:max-w-[11rem]";
  const spriteSize =
    size === "sm"
      ? "h-24 w-24 sm:h-[6.5rem] sm:w-[6.5rem] lg:h-32 lg:w-32 xl:h-36 xl:w-36"
      : "h-28 w-28 sm:h-32 sm:w-32 lg:h-40 lg:w-40 xl:h-48 xl:w-48";

  const resonancePercent = Math.round((combatant.resonance / combatant.resonanceMax) * 100);
  const activeStatuses = (Object.keys(combatant.statusEffects) as StatusEffectType[]).filter(
    (type) => (combatant.statusEffects[type] ?? 0) > 0
  );

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={cn("w-full flex flex-col items-center gap-1", barWidth)}>
        <ProgressBar
          percent={hpPercent}
          color="hp"
          label={
            <span className="truncate w-full flex gap-1">
              <span className="text-gold">Lv.{creature.level}</span> <span className="text-white">{creature.name}</span>
            </span>
          }
          innerText={`${combatant.currentHp}/${combatant.maxHp}`}
        />
        <ProgressBar percent={resonancePercent} color="resonance" />
      </div>

      <motion.button
        type="button"
        disabled={!isTargetable}
        onClick={onSelectTarget}
        animate={lungeControls}
        className={cn(
          "relative flex items-center justify-center border-0 bg-transparent p-0 transition-transform",
          spriteSize,
          isTargetable && "cursor-pointer hover:scale-105"
        )}
        aria-label={isTargetable ? `Target ${creature.name}` : creature.name}
      >
        {isCastingUltimate && (
          <>
            <LegendaryCardAura />
            <motion.span
              className="pointer-events-none absolute inset-0 rounded-full border-2 border-gold-bright"
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: [0.6, 1.6], opacity: [0.9, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
            />
          </>
        )}
        <motion.span
          animate={impactControls}
          className="flex h-full w-full items-center justify-center"
        >
          <CreatureSprite
            creature={creature}
            direction={direction}
            activeAnimation={activeAnimation}
            className={cn(
              "h-full w-full transition-[filter]",
              combatant.isAlive
                ? isCastingUltimate
                  ? "drop-shadow-[0_0_22px_rgba(245,158,11,0.9)]"
                  : isActingTurn
                    ? "drop-shadow-[0_0_16px_rgba(255,184,77,0.85)]"
                    : isTargetable
                      ? "animate-pulse drop-shadow-[0_0_16px_rgba(248,113,113,0.85)]"
                      : "drop-shadow-md"
                : "grayscale opacity-40"
            )}
          />
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={flashControls}
          className="pointer-events-none absolute inset-0 rounded-full bg-white mix-blend-screen"
        />
        {combatant.guarding && combatant.isAlive && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-arcade-border bg-sky-500 text-white shadow-sm">
            <Shield className="h-3 w-3" />
          </span>
        )}
        {activeStatuses.length > 0 && combatant.isAlive && (
          <span className="absolute -left-1 -top-1 flex flex-col gap-0.5">
            {activeStatuses.map((type) => {
              const badge = STATUS_BADGE[type];
              const Icon = badge.icon;
              return (
                <span
                  key={type}
                  title={type}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border border-arcade-border text-white shadow-sm",
                    badge.className
                  )}
                >
                  <Icon className="h-3 w-3" />
                </span>
              );
            })}
          </span>
        )}
        {!combatant.isAlive && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Skull className="h-8 w-8 text-zinc-500" />
          </span>
        )}
      </motion.button>
    </div>
  );
}
