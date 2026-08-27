"use client";

import { motion } from "framer-motion";
import type { Rarity } from "@/types/game";

const RAINBOW_GRADIENT =
  "linear-gradient(120deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)";

/**
 * Subtle rainbow wash + shimmer sweep for Mythic-rarity creature cards.
 * Render as the first child of a `relative` container — it clips to the
 * parent's own border radius and never affects layout (pointer-events: none).
 */
export function MythicCardAura() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <motion.div
        className="absolute inset-0 opacity-[0.10]"
        style={{ background: RAINBOW_GRADIENT, backgroundSize: "400% 400%" }}
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
        initial={{ x: "-140%" }}
        animate={{ x: "340%" }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3.2, ease: "easeInOut" }}
      />
    </div>
  );
}

const LEGENDARY_RAINBOW_GRADIENT =
  "linear-gradient(120deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #22c55e, #f59e0b)";
const LEGENDARY_PRISM_RING =
  "conic-gradient(from 0deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #22c55e, #eab308, #f59e0b)";

/**
 * LR (Legendary) is one tier above Mythic — this aura is deliberately more elaborate than
 * MythicCardAura: a brighter rainbow wash, a rotating conic "prism ring" clipped to the card's
 * edge, two counter-sweeping shimmer beams instead of one, and a soft outer glow ring. Same
 * render contract: first child of a `relative` container, purely decorative.
 */
export function LegendaryCardAura() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <motion.div
        className="absolute inset-0 opacity-[0.16]"
        style={{ background: LEGENDARY_RAINBOW_GRADIENT, backgroundSize: "400% 400%" }}
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -inset-[45%] opacity-[0.22]"
        style={{ background: LEGENDARY_PRISM_RING }}
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        initial={{ x: "-140%" }}
        animate={{ x: "340%" }}
        transition={{ duration: 1.7, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-y-0 w-1/4 skew-x-12 bg-gradient-to-r from-transparent via-amber-200/55 to-transparent"
        initial={{ x: "340%" }}
        animate={{ x: "-140%" }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 rounded-[inherit] ring-1 ring-white/40" />
    </div>
  );
}

/** Renders the right rarity aura for a card (or nothing for Common/Rare/SSR) — drop in as the
 * first child of a `relative` container instead of hand-rolling the rarity check at each
 * call site. */
export function RarityCardAura({ rarity }: { rarity: Rarity }) {
  if (rarity === "LR") return <LegendaryCardAura />;
  if (rarity === "Mythic") return <MythicCardAura />;
  return null;
}
