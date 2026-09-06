"use client";

import { motion } from "framer-motion";
import type { Creature } from "@/types/game";
import { cn } from "@/lib/utils";

// LR (Legendary) is the one tier that gets the full animated rainbow treatment — reserved as
// the "wow" tier so it doesn't get diluted by Mythic sharing the same effect (see
// MythicCardAura for the matching card-level reasoning). Gold-anchored gradient that cycles
// fast, plus a soft warm glow behind the glyphs.
const LEGENDARY_TEXT_GRADIENT =
  "linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #22c55e, #eab308, #f59e0b)";

interface CreatureNameProps {
  creature: Creature;
  className?: string;
}

export function CreatureName({ creature, className }: CreatureNameProps) {
  if (creature.rarity === "LR") {
    return (
      <motion.span
        className={cn("block bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(245,158,11,0.55)]", className)}
        style={{ backgroundImage: LEGENDARY_TEXT_GRADIENT, backgroundSize: "300% auto" }}
        animate={{ backgroundPosition: ["0% 50%", "300% 50%"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
      >
        {creature.name}
      </motion.span>
    );
  }

  if (creature.rarity === "Mythic") {
    // A fixed magenta identity (matches RarityBadge's --color-rarity-mythic) instead of a
    // cycling rainbow — hue-cycling text made Mythic indistinguishable from LR in a still
    // screenshot, and read as "LR with less sparkle" instead of its own tier.
    return (
      <span className={cn("block text-rarity-mythic drop-shadow-[0_0_5px_rgba(219,39,119,0.45)]", className)}>
        {creature.name}
      </span>
    );
  }

  return <span className={cn("block text-foreground", className)}>{creature.name}</span>;
}
