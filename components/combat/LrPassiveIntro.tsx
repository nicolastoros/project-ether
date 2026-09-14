"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { LrPassiveActivation } from "@/lib/combat";
import { CreatureSprite } from "@/components/ui/CreatureSprite";

// Long enough to actually read a two-line effect description, short enough that a player who
// doesn't realize they can tap isn't stuck staring at it — the tap-to-continue affordance below
// is the primary exit, this is just a safety net.
const AUTO_DISMISS_MS = 4000;

interface LrPassiveIntroProps {
  activations: LrPassiveActivation[];
  onDismiss: () => void;
}

/** Dokkan-style "Passive Skill" activation banner — every LR creature on the field (either side)
 * that has a Creature.lrPassive fires one of these the instant battle starts, always, regardless
 * of which screen (Campaign's BattleScreen, Raid/Challenge's RaidBattleScreen) called it. Spans
 * most of the battle screen's own width (not a narrow centered card) with a slight tilt, one
 * neon-blue banner per activation, stacked. Portrait and text idle-bob in opposite directions for
 * a subtle parallax depth cue — see lib/combat.ts's applyLrPassives for what actually gets applied
 * under the hood. Fully blocks the arena underneath (full-screen, high z-index) so nothing can act
 * until it's dismissed. */
export function LrPassiveIntro({ activations, onDismiss }: LrPassiveIntroProps) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (activations.length === 0) return null;

  // A brief "charge" beat before any banner slides in — a bright line flashes across the screen
  // first, THEN the content arrives, instead of everything popping in at once. That lead-in beat
  // is most of what separates a "de golpe" instant pop-in from an intentional, cinematic reveal.
  const CHARGE_S = 0.3;
  const BANNER_STAGGER_S = 0.28;

  return (
    <motion.button
      type="button"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Slightly longer than the banners' own 0.3s exit below so the backdrop doesn't clear and
      // reveal the arena while a banner is still mid-slide-out.
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="fixed inset-0 z-[55] flex cursor-pointer flex-col items-center justify-center gap-5 border-0 bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      aria-label="Continue"
    >
      {/* The charge flash itself — a thin bright bar that snaps open then fades, centered where
          the banner stack is about to appear. */}
      <motion.div
        initial={{ scaleX: 0, opacity: 1 }}
        animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
        transition={{ duration: CHARGE_S, times: [0, 0.5, 1], ease: "easeOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-[92vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_24px_6px_rgba(125,211,252,0.9)]"
      />

      <div className="flex w-full max-w-3xl flex-col gap-5 sm:max-w-4xl lg:max-w-6xl">
        {activations.map((activation, i) => {
          const fromLeft = i % 2 === 0;
          const delay = CHARGE_S + i * BANNER_STAGGER_S;
          return (
            <motion.div
              key={`${activation.creature.id}-${i}`}
              initial={{ x: fromLeft ? -260 : 260, opacity: 0, scale: 0.85, rotate: 0 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: -2.5 }}
              // A smooth expo-out tween (not a snappy/bouncy spring) — settles in one unhurried
              // motion instead of overshooting and correcting, which read as the "abrupt" part.
              transition={{ delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              // Mirrors the entrance on the way out (slides back the direction it came from,
              // shrinks slightly, fades) instead of just vanishing — only actually plays once the
              // parent overlay is wrapped in <AnimatePresence> by the battle screen, which is what
              // gives exit props on unmount a chance to run at all instead of the tree just
              // disappearing instantly.
              exit={{ x: fromLeft ? -160 : 160, opacity: 0, scale: 0.9, transition: { duration: 0.3, ease: "easeIn" } }}
              className="relative overflow-hidden rounded-xl border-2 border-sky-400 bg-gradient-to-r from-[#030913] via-[#0a2547] to-[#030913] shadow-[0_0_40px_rgba(56,189,248,0.5)]"
            >
              {/* Bold diagonal speed-line chevrons behind everything — static, not animated, so
                  they read as "art direction" rather than competing with the shimmer sweep below. */}
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute -left-6 top-0 h-full w-16 -skew-x-[20deg] bg-sky-400/25" />
                <div className="absolute left-10 top-0 h-full w-8 -skew-x-[20deg] bg-sky-300/20" />
              </div>

              {/* Looping diagonal shimmer sweep — same idiom as BannerSlider.tsx's gacha shine,
                  so this reads as "charged with energy" rather than a static card. */}
              <motion.div
                className="pointer-events-none absolute inset-y-0 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-sky-300/25 to-transparent"
                initial={{ x: "-160%" }}
                animate={{ x: "500%" }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
              />

              <div className="relative flex items-center gap-4 p-3.5 sm:gap-5 sm:p-5">
                {/* Portrait drifts down a touch, the text drifts up a touch — two independent
                    loops, slightly different periods so they never stay perfectly in sync, for a
                    parallax "these sit on different depth planes" feel rather than one flat card. */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-sky-300 bg-black/70 shadow-[0_0_22px_rgba(56,189,248,0.8)] sm:h-24 sm:w-24 lg:h-28 lg:w-28"
                >
                  <CreatureSprite creature={activation.creature} className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
                </motion.div>

                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="relative min-w-0 flex-1 text-left"
                >
                  <p className="font-arcade text-[10px] uppercase tracking-[0.25em] text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)] sm:text-xs">
                    Passive Skill
                  </p>
                  <p className="truncate text-lg font-bold text-white sm:text-xl lg:text-2xl">{activation.passive.name}</p>
                  <p className="text-xs leading-snug text-sky-100/85 sm:text-sm lg:text-base">{activation.passive.description}</p>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="animate-pulse text-[10px] uppercase tracking-widest text-sky-200/80 sm:text-xs">Tap to continue</p>
    </motion.button>
  );
}
