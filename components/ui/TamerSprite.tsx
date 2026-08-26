"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Direction } from "@/components/ui/CreatureSprite";

const ROTATION_ORDER: Direction[] = [
  "south",
  "south-east",
  "east",
  "north-east",
  "north",
  "north-west",
  "west",
  "south-west",
];

const ROTATION_INTERVAL_MS = 420;

interface TamerSpriteProps {
  spriteFolder: string;
  name: string;
  className?: string;
  /** Cycle through the 8-directional idle frames for a "turntable" effect. */
  spin?: boolean;
  /** Forces a specific facing when not spinning. Omit to freeze on whichever frame the spin last
   * reached instead (e.g. a pause button that stops it "where it was"). */
  direction?: Direction;
}

/** Same idle-rotation-frame technique as CreatureSprite.tsx, minus the Mythic aura (not
 * applicable to Tamer avatars) — plain `spriteFolder` string instead of a Creature object since
 * TamerAvatar isn't a Creature. */
export function TamerSprite({ spriteFolder, name, className, spin = false, direction: fixedDirection }: TamerSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!spin) return;
    const images = ROTATION_ORDER.map((direction) => {
      const img = new window.Image();
      img.src = `${spriteFolder}/${direction}.png`;
      return img;
    });
    return () => {
      images.forEach((img) => {
        img.src = "";
      });
    };
  }, [spin, spriteFolder]);

  useEffect(() => {
    if (!spin) return;
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % ROTATION_ORDER.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [spin]);

  const direction = spin ? ROTATION_ORDER[frameIndex] : (fixedDirection ?? ROTATION_ORDER[frameIndex]);

  return (
    <span className={cn("relative inline-block", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny local pixel-art sprite, cycled on an interval */}
      <img
        src={`${spriteFolder}/${direction}.png`}
        alt={name}
        className="h-full w-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
    </span>
  );
}
