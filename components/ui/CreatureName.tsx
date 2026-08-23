"use client";

import { motion } from "framer-motion";
import type { Creature } from "@/types/game";
import { cn } from "@/lib/utils";

const RAINBOW_TEXT_GRADIENT =
  "linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)";

interface CreatureNameProps {
  creature: Creature;
  className?: string;
}

export function CreatureName({ creature, className }: CreatureNameProps) {
  if (creature.rarity !== "Mythic") {
    return <span className={cn("block text-foreground", className)}>{creature.name}</span>;
  }

  return (
    <motion.span
      className={cn("block bg-clip-text text-transparent", className)}
      style={{ backgroundImage: RAINBOW_TEXT_GRADIENT, backgroundSize: "300% auto" }}
      animate={{ backgroundPosition: ["0% 50%", "300% 50%"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
    >
      {creature.name}
    </motion.span>
  );
}
