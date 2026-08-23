"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Creature } from "@/types/game";
import { ELEMENT_ICON } from "@/lib/elementVisuals";
import { cn } from "@/lib/utils";

const ROTATION_ORDER = [
  "south",
  "south-east",
  "east",
  "north-east",
  "north",
  "north-west",
  "west",
  "south-west",
] as const;

const ROTATION_INTERVAL_MS = 420;

interface AuraParticle {
  color: string;
  inset: string;
  duration: number;
  reverse: boolean;
  delay: number;
}

const AURA_PARTICLES: AuraParticle[] = [
  { color: "#ef4444", inset: "-6%", duration: 5.5, reverse: false, delay: 0 },
  { color: "#f97316", inset: "6%", duration: 6.4, reverse: true, delay: 0.25 },
  { color: "#eab308", inset: "-2%", duration: 4.8, reverse: false, delay: 0.5 },
  { color: "#22c55e", inset: "10%", duration: 7.2, reverse: true, delay: 0.1 },
  { color: "#06b6d4", inset: "-10%", duration: 5.1, reverse: false, delay: 0.4 },
  { color: "#3b82f6", inset: "2%", duration: 6.8, reverse: true, delay: 0.6 },
  { color: "#8b5cf6", inset: "-14%", duration: 5.9, reverse: false, delay: 0.2 },
  { color: "#ec4899", inset: "14%", duration: 6.1, reverse: true, delay: 0.45 },
];

export type Direction = (typeof ROTATION_ORDER)[number];

interface CreatureSpriteProps {
  creature: Creature;
  className?: string;
  /** Cycle through the 8-directional idle frames for a "turntable" effect. */
  spin?: boolean;
  /** Static facing direction when not spinning. Defaults to "south". */
  direction?: Direction;
}

export function CreatureSprite({ creature, className, spin = false, direction: fixedDirection = "south" }: CreatureSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const folder = creature.spriteFolder;
  const isMythic = creature.rarity === "Mythic";

  // Warm the browser cache for every frame so the spin loop never flickers on first pass.
  useEffect(() => {
    if (!spin || !folder) return;
    const images = ROTATION_ORDER.map((direction) => {
      const img = new window.Image();
      img.src = `${folder}/${direction}.png`;
      return img;
    });
    return () => {
      images.forEach((img) => {
        img.src = "";
      });
    };
  }, [spin, folder]);

  useEffect(() => {
    if (!spin || !folder) return;
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % ROTATION_ORDER.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [spin, folder]);

  const direction = spin ? ROTATION_ORDER[frameIndex] : fixedDirection;

  const content = folder ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local pixel-art sprite, cycled on an interval
    <img
      src={`${folder}/${direction}.png`}
      alt={creature.name}
      className="h-full w-full object-contain"
      style={{ imageRendering: "pixelated" }}
    />
  ) : (
    (() => {
      const Icon = ELEMENT_ICON[creature.element];
      return <Icon className="h-full w-full" />;
    })()
  );

  if (!isMythic) {
    return <span className={cn("relative inline-block", className)}>{content}</span>;
  }

  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      {AURA_PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute"
          style={{ inset: p.inset }}
          animate={{ rotate: p.reverse ? -360 : 360 }}
          transition={{ duration: p.duration, repeat: Infinity, ease: "linear", delay: p.delay * 0.3 }}
        >
          <motion.span
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 5, height: 5, backgroundColor: p.color, boxShadow: `0 0 5px ${p.color}` }}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.6, 1.3, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
          />
        </motion.span>
      ))}
      <span className="relative z-10 h-full w-full">{content}</span>
    </span>
  );
}
