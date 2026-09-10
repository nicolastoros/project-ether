"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Droplet, Moon, Shield, Shuffle, Skull, Zap } from "lucide-react";
import type { BattleCombatant, HitInfo } from "@/lib/combat";
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

// Fixed angles (not random) for the death particle burst — deterministic so nothing ever looks
// lopsided, and cheap (no per-render Math.random()). Distances/sizes vary a little per-particle
// just for visual texture.
const DEATH_PARTICLES = [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => ({
  angle,
  distance: 34 + (i % 3) * 8,
  size: i % 2 === 0 ? 7 : 5,
}));

interface CombatantCardProps {
  combatant: BattleCombatant;
  direction: Direction;
  isActingTurn: boolean;
  isTargetable: boolean;
  onSelectTarget?: () => void;
  /** uid of the combatant currently playing its attack animation, plus a nonce so repeat attacks by the same uid re-trigger. */
  attackerUid: string;
  attackNonce: number;
  /** Combatants struck (or healed) by the most recent action, with the actual number to float —
   * see lib/combat.ts's HitInfo. `hitNonce` re-triggers even a repeat hit on the same uid. */
  hits: HitInfo[];
  hitNonce: number;
  /** Name of the active animation to play */
  activeAnimation?: string;
  /** "sm" is used for tighter arena art (e.g. the World 1-1 stone-circle background). */
  size?: "md" | "sm";
  /** True while this combatant is charging/unleashing its Ultimate Attack — overlays the
   * LR-rarity "power surge" aura on the sprite for the charge-up beat before damage lands. */
  isCastingUltimate?: boolean;
  /** Direction the attack lunge travels — toward where this combatant's enemy actually sits in
   * the current layout. Campaign is side-by-side (default, horizontal); Raid stacks the boss
   * above the party, so players lunge up ({x:0,y:-1}) and the boss lunges down. Magnitude is
   * ignored — only the direction matters, the component normalizes it. */
  lungeVector?: { x: number; y: number };
}

export function CombatantCard({
  combatant,
  direction,
  isActingTurn,
  isTargetable,
  onSelectTarget,
  attackerUid,
  attackNonce,
  hits,
  hitNonce,
  activeAnimation,
  size = "md",
  isCastingUltimate = false,
  lungeVector,
}: CombatantCardProps) {
  const { creature } = combatant;
  const hpPercent = Math.round((combatant.currentHp / combatant.maxHp) * 100);
  const lungeControls = useAnimationControls();
  const impactControls = useAnimationControls();
  const flashControls = useAnimationControls();
  const deathControls = useAnimationControls();
  const wasAliveRef = useRef(combatant.isAlive);

  const myHit = hits.find((h) => h.uid === combatant.uid) ?? null;

  useEffect(() => {
    if (attackerUid !== combatant.uid) return;
    // A real tackle, not a twitch: a short wind-up pull-back, then a strong forward lunge that
    // holds at the target for a beat (so it visibly "connects") before returning — was a single
    // 30px/0.22s slide before, which read as barely more than a flinch.
    //
    // The lunge travels toward the enemy's actual position: side-by-side in Campaign (horizontal),
    // but stacked in Raid (the party lunges UP at the boss, the boss lunges DOWN). Callers pass
    // lungeVector; the side-based horizontal fallback keeps older callers working.
    const raw = lungeVector ?? { x: combatant.side === "player" ? 1 : -1, y: 0 };
    const mag = Math.hypot(raw.x, raw.y) || 1;
    const ux = raw.x / mag;
    const uy = raw.y / mag;
    const WINDUP = 10;
    const REACH = 58;
    lungeControls.start({
      x: [0, -ux * WINDUP, ux * REACH, ux * REACH, 0],
      y: [0, -uy * WINDUP, uy * REACH, uy * REACH, 0],
      scale: [1, 1, 1.1, 1.1, 1],
      transition: { duration: 0.5, times: [0, 0.18, 0.42, 0.62, 1], ease: "easeOut" },
    });
    // Re-trigger only when this combatant is the one whose attack just resolved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackNonce]);

  useEffect(() => {
    if (!myHit) return;
    if (myHit.isCrit) {
      // Bigger, longer shake for a critical — the number popping alone wasn't enough to read as
      // "special" at a glance the way Dokkan's own screen-shake-on-crit does.
      impactControls.start({
        x: [0, -10, 9, -7, 5, 0],
        y: [0, -3, 2, 0],
        scale: [1, 0.85, 1.12, 0.97, 1],
        transition: { duration: 0.45, ease: "easeOut" },
      });
      flashControls.start({ opacity: [0.9, 0], transition: { duration: 0.25, ease: "easeOut" } });
    } else {
      impactControls.start({
        x: [0, -6, 5, -3, 0],
        scale: [1, 0.9, 1.05, 1],
        transition: { duration: 0.3, ease: "easeOut" },
      });
      flashControls.start({ opacity: [0.75, 0], transition: { duration: 0.16, ease: "easeOut" } });
    }
    // Re-trigger only when a fresh hit lands, regardless of which uids were included.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitNonce]);

  // Fires exactly once, the instant this combatant actually dies (isAlive true -> false) — not on
  // every render where isAlive happens to already be false (e.g. a re-mount).
  useEffect(() => {
    if (wasAliveRef.current && !combatant.isAlive) {
      deathControls.start({
        opacity: [1, 1, 0],
        scale: [1, 1.08, 0.85],
        rotate: combatant.side === "player" ? [0, -8] : [0, 8],
        transition: { duration: 0.6, ease: "easeIn" },
      });
    }
    wasAliveRef.current = combatant.isAlive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatant.isAlive]);

  const barWidth = size === "sm" ? "max-w-[6rem] sm:max-w-[7.5rem] lg:max-w-[9rem]" : "max-w-[9rem] lg:max-w-[11rem]";
  const spriteSize =
    size === "sm"
      // Base tier shrunk from the old flat h-24 (96px) — BattleScreen's mobile arena (the only
      // place size="sm" is used) is tight enough that at 96px the bottom skill menu overlay was
      // covering the player creatures' own sprites. sm: and up are unchanged from before.
      ? "h-16 w-16 sm:h-[6.5rem] sm:w-[6.5rem] lg:h-32 lg:w-32 xl:h-36 xl:w-36"
      : "h-28 w-28 sm:h-32 sm:w-32 lg:h-40 lg:w-40 xl:h-48 xl:w-48";

  const resonancePercent = Math.round((combatant.resonance / combatant.resonanceMax) * 100);
  const activeStatuses = (Object.keys(combatant.statusEffects) as StatusEffectType[]).filter(
    (type) => (combatant.statusEffects[type] ?? 0) > 0
  );

  return (
    // pointer-events-none on the whole card: two arena slots positioned close together (see
    // BattleScreen.tsx's ARENA_SLOTS, where enemy 0 and enemy 1 are only ~10% apart) let a later
    // sibling's card visually cover an earlier sibling's sprite button underneath, silently
    // swallowing clicks meant to target it — reproduced live, enemy slot 0 was completely
    // untargetable in every 2v2 fight. The sprite button below opts back in with
    // pointer-events-auto (a plain CSS "punch a hole back through" override), so it alone stays
    // clickable; everything else here (bars, badges, floating numbers) was already inert.
    <div className="pointer-events-none flex flex-col items-center gap-1.5">
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
          "relative flex items-center justify-center border-0 bg-transparent p-0 transition-transform pointer-events-auto",
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

        {/* Dokkan-style floating damage/heal number — keyed on hitNonce so it remounts (and
            restarts its pop/rise/fade) every time, even for a repeat hit with the same amount. */}
        <AnimatePresence>
          {myHit && (
            <motion.div
              key={hitNonce}
              initial={{ opacity: 0, y: 4, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -50,
                scale: myHit.isCrit ? [0.5, 1.4, 1.05, 1.05] : [0.5, 1.1, 1, 1],
              }}
              transition={{
                duration: myHit.isCrit ? 1.15 : 0.9,
                times: [0, 0.18, 0.8, 1],
                ease: "easeOut",
              }}
              className={cn(
                "pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 whitespace-nowrap text-center font-arcade font-black leading-none",
                myHit.isHeal
                  ? "text-emerald-400 drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
                  : myHit.isCrit
                    ? "text-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]"
                    : "text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]"
              )}
            >
              {myHit.isCrit && (
                <div className="text-[9px] font-bold tracking-widest text-red-400 sm:text-[10px]">CRITICAL!</div>
              )}
              <div className={myHit.isCrit ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"}>
                {myHit.isHeal ? "+" : "-"}
                {myHit.amount}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Radiating burst behind a critical hit — makes the number's pop read as an impact,
            not just text appearing. */}
        {myHit?.isCrit && (
          <motion.span
            key={`burst-${hitNonce}`}
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-300"
            initial={{ scale: 0.3, opacity: 0.9 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}

        <motion.span
          animate={impactControls}
          className="flex h-full w-full items-center justify-center"
        >
          <motion.span animate={deathControls} className="flex h-full w-full items-center justify-center">
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
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={flashControls}
          className="pointer-events-none absolute inset-0 rounded-full bg-white mix-blend-screen"
        />

        {/* Death particle burst — fires once, the instant isAlive flips to false (see the effect
            above), not tied to the fainted sprite's ongoing grayscale state. */}
        {!combatant.isAlive && (
          <span className="pointer-events-none absolute inset-0">
            {DEATH_PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full bg-zinc-300"
                style={{ width: p.size, height: p.size }}
                initial={{ x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
                animate={{
                  x: `calc(-50% + ${Math.cos((p.angle * Math.PI) / 180) * p.distance}px)`,
                  y: `calc(-50% + ${Math.sin((p.angle * Math.PI) / 180) * p.distance}px)`,
                  opacity: 0,
                  scale: 0.3,
                }}
                transition={{ duration: 0.7, delay: 0.05, ease: "easeOut" }}
              />
            ))}
          </span>
        )}

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
