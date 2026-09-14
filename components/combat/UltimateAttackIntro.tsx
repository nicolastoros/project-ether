"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { UltimateSkill } from "@/types/game";
import { useT } from "@/lib/i18n/useT";

// A punchy impact should resolve fast — long enough to actually read the name and watch the
// centered GIF play through once, short enough that even an all-Ultimate battle doesn't drag.
const AUTO_DISMISS_MS = 3200;

interface UltimateAttackIntroProps {
  casterName: string;
  ultimate: UltimateSkill;
  onDismiss: () => void;
}

/** LR-EXCLUSIVE "Ultimate Attack" epic banner — gold (not the passive intro's neon blue), screen
 * darkened harder, and (when the caster's own UltimateSkill.animationGif is set — currently only
 * Omega's) that creature's own special-attack GIF playing front and center. The GIF and the move
 * name are the whole point — everything else (background glow, labels) stays minimal so neither
 * competes with them. Fires every time any LR's Ultimate is cast, either side, in every real
 * battle screen — see BattleScreen.tsx/RaidBattleScreen.tsx's resolveTurn, which holds actual
 * damage back until this is dismissed (tap, or its own auto-timer), same "onDismiss both ways"
 * pattern as LrPassiveIntro.tsx. */
export function UltimateAttackIntro({ casterName, ultimate, onDismiss }: UltimateAttackIntroProps) {
  const t = useT();
  useEffect(() => {
    const timeout = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.button
      type="button"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[58] flex cursor-pointer flex-col items-center justify-center overflow-hidden border-0 bg-black/92 p-4"
      aria-label={t("common.continue")}
    >
      {/* Slow-spinning sunburst rays — a repeating pattern (not one wedge) so it's symmetric all
          the way around and never shows a hard edge/seam while it rotates, unlike a plain
          conic-gradient half-circle would. This is pure background texture, kept faint. */}
      <motion.div
        className="pointer-events-none absolute h-[110vmin] w-[110vmin] opacity-[0.14]"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, var(--color-gold-bright) 0deg 3deg, transparent 3deg 18deg)",
          maskImage: "radial-gradient(circle, black 0%, black 35%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle, black 0%, black 35%, transparent 72%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />

      {/* A soft, smooth radial glow breathing gently behind the art — no hard edges anywhere,
          just light. This (not the rays above) is what actually reads as "power core". */}
      <motion.div
        className="pointer-events-none absolute h-[60vmin] w-[60vmin] rounded-full bg-[radial-gradient(circle,_rgba(255,184,77,0.45)_0%,_rgba(201,130,15,0.2)_40%,_transparent_72%)] blur-2xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* One expanding shockwave ring, timed with the GIF/name landing — the "impact" beat. */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0.9 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ delay: 0.15, duration: 0.8, ease: "easeOut" }}
        className="pointer-events-none absolute h-56 w-56 rounded-full border-2 border-gold-bright"
      />

      <motion.p
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="relative font-arcade text-[9px] uppercase tracking-[0.4em] text-gold-bright/90 drop-shadow-[0_0_8px_rgba(255,184,77,0.8)] sm:text-[11px]"
      >
        {casterName} · {t("creature.ultimate_attack")}
      </motion.p>

      {ultimate.animationGif && (
        <motion.img
          src={ultimate.animationGif}
          alt=""
          draggable={false}
          initial={{ opacity: 0, scale: 0.55 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative my-1 h-40 w-40 select-none object-contain drop-shadow-[0_0_40px_rgba(255,184,77,0.9)] sm:h-60 sm:w-60 lg:h-72 lg:w-72"
          style={{ imageRendering: "pixelated" }}
        />
      )}

      <motion.h2
        initial={{ opacity: 0, scale: 1.6, letterSpacing: "0.4em" }}
        animate={{
          opacity: 1,
          scale: 1,
          letterSpacing: "0.02em",
          filter: [
            "drop-shadow(0 4px 14px rgba(0,0,0,0.85)) drop-shadow(0 0 0px rgba(255,184,77,0))",
            "drop-shadow(0 4px 14px rgba(0,0,0,0.85)) drop-shadow(0 0 28px rgba(255,184,77,0.9))",
            "drop-shadow(0 4px 14px rgba(0,0,0,0.85)) drop-shadow(0 0 12px rgba(255,184,77,0.6))",
          ],
        }}
        transition={{ delay: 0.32, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative mt-1 font-arcade text-3xl font-black uppercase sm:text-5xl lg:text-6xl"
      >
        {/* Electric cyan glow layer — a duplicate of the name, sitting just behind the main gradient
            text and softly blurred, like a live current crackling through it, rather than a hard
            offset shadow. Flickers in brightness on the same per-letter stagger as the bob below,
            selling "electric" instead of just "3D bevel" — and being bright neon-cyan (not a dark
            tone) is what actually lifts the whole word out of looking dark against the black
            backdrop. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-neon-bright"
          style={{ transform: "translate(1px, 2px)", filter: "blur(2px)" }}
        >
          {[...ultimate.name].map((char, i) => (
            <motion.span
              key={i}
              style={{ whiteSpace: "pre", display: "inline-block" }}
              animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.045 }}
            >
              {char}
            </motion.span>
          ))}
        </span>

        {/* Main layer — each letter idles up and down on its own staggered loop (a subtle wave
            running through the word), the actual "moves a little" depth cue, on top of a slightly
            warmer gradient (a pale honey top instead of flat white) than before. */}
        <span
          className="relative flex items-center justify-center text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #fff6df 0%, var(--color-gold) 42%, var(--color-gold-bright) 78%, var(--color-gold-ink) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
          }}
        >
          {[...ultimate.name].map((char, i) => (
            <motion.span
              key={i}
              style={{ whiteSpace: "pre", display: "inline-block" }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.045 }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      </motion.h2>

      <p className="relative mt-6 animate-pulse text-[9px] uppercase tracking-widest text-gold-bright/50 sm:text-[10px]">
        {t("common.tap_to_continue")}
      </p>
    </motion.button>
  );
}
