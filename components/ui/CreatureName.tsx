"use client";

import { motion } from "framer-motion";
import type { Creature } from "@/types/game";
import { cn } from "@/lib/utils";

const RAINBOW_TEXT_GRADIENT =
  "linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)";

// LR (Legendary) is one tier above Mythic — a gold-anchored gradient that cycles faster, plus a
// soft warm glow behind the glyphs, so it reads as visibly richer than Mythic's plain rainbow.
const LEGENDARY_TEXT_GRADIENT =
  "linear-gradient(90deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #22c55e, #eab308, #f59e0b)";

interface CreatureNameProps {
  creature: Creature;
  className?: string;
}

export function CreatureName({ creature, className }: CreatureNameProps) {
  if (creature.rarity !== "Mythic" && creature.rarity !== "LR") {
    return <span className={cn("block text-foreground", className)}>{creature.name}</span>;
  }

  const isLegendary = creature.rarity === "LR";

  return (
    <motion.span
      className={cn(
        "block bg-clip-text text-transparent",
        isLegendary && "drop-shadow-[0_0_6px_rgba(245,158,11,0.55)]",
        className
      )}
      style={{
        backgroundImage: isLegendary ? LEGENDARY_TEXT_GRADIENT : RAINBOW_TEXT_GRADIENT,
        backgroundSize: "300% auto",
      }}
      animate={{ backgroundPosition: ["0% 50%", "300% 50%"] }}
      transition={{ duration: isLegendary ? 2.5 : 4, repeat: Infinity, ease: "linear" }}
    >
      {creature.name}
    </motion.span>
  );
}
