"use client";

import { useEffect, useState } from "react";
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

interface CreatureSpriteProps {
  creature: Creature;
  className?: string;
  /** Cycle through the 8-directional idle frames for a "turntable" effect. */
  spin?: boolean;
}

export function CreatureSprite({ creature, className, spin = false }: CreatureSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const folder = creature.spriteFolder;

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

  if (folder) {
    const direction = spin ? ROTATION_ORDER[frameIndex] : "south";
    return (
      // eslint-disable-next-line @next/next/no-img-element -- tiny local pixel-art sprite, cycled on an interval
      <img
        src={`${folder}/${direction}.png`}
        alt={creature.name}
        className={cn("h-full w-full object-contain", className)}
        style={{ imageRendering: "pixelated" }}
      />
    );
  }

  const Icon = ELEMENT_ICON[creature.element];
  return <Icon className={cn("h-full w-full", className)} />;
}
