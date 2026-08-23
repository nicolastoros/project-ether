"use client";

import { motion } from "framer-motion";

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
