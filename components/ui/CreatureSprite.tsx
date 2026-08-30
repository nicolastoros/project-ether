"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Creature } from "@/types/game";
import { ELEMENT_ICON } from "@/lib/elementVisuals";
import { POTENTIAL_TREE } from "@/lib/hiddenPotential";
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

// LR (Legendary) sits one tier above Mythic — denser, brighter particle ring (12 vs 8) plus a
// pulsing golden halo behind the sprite (added separately below), for a visibly richer shine.
const LEGENDARY_AURA_PARTICLES: AuraParticle[] = [
  { color: "#f59e0b", inset: "-8%", duration: 4.6, reverse: false, delay: 0 },
  { color: "#ec4899", inset: "8%", duration: 5.3, reverse: true, delay: 0.18 },
  { color: "#eab308", inset: "-3%", duration: 4.1, reverse: false, delay: 0.35 },
  { color: "#22c55e", inset: "12%", duration: 6.0, reverse: true, delay: 0.08 },
  { color: "#06b6d4", inset: "-12%", duration: 4.3, reverse: false, delay: 0.28 },
  { color: "#3b82f6", inset: "3%", duration: 5.6, reverse: true, delay: 0.5 },
  { color: "#8b5cf6", inset: "-16%", duration: 4.9, reverse: false, delay: 0.14 },
  { color: "#f43f5e", inset: "16%", duration: 5.1, reverse: true, delay: 0.4 },
  { color: "#fbbf24", inset: "-5%", duration: 4.4, reverse: true, delay: 0.6 },
  { color: "#38bdf8", inset: "10%", duration: 5.8, reverse: false, delay: 0.22 },
  { color: "#a855f7", inset: "-10%", duration: 5.0, reverse: true, delay: 0.32 },
  { color: "#fb7185", inset: "6%", duration: 4.7, reverse: false, delay: 0.48 },
];

export type Direction = (typeof ROTATION_ORDER)[number];

interface CreatureSpriteProps {
  creature: Creature;
  className?: string;
  /** Cycle through the 8-directional idle frames for a "turntable" effect. */
  spin?: boolean;
  /** Static facing direction when not spinning. Defaults to "south". */
  direction?: Direction;
  /** Name of the animation to play (e.g. "Holy Judgment"). Defaults to "stand_animation" if animated. */
  activeAnimation?: string;
}

export function CreatureSprite({ creature, className, spin = false, direction: fixedDirection = "south", activeAnimation }: CreatureSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  const animName = activeAnimation 
    ? activeAnimation.replace("Crimson Exterminion", "Crimson_Exterminion") 
    : "stand_animation";

  const folder = creature.spriteFolder?.replace("stand_animation", animName);
  
  const frameCount = typeof creature.animationFrames === "object" 
    ? creature.animationFrames[animName] 
    : creature.animationFrames;
    
  const isAnimated = frameCount != null && frameCount > 0;
  const isMythic = creature.rarity === "Mythic";
  const isLegendary = creature.rarity === "LR";

  // Warm the browser cache for every frame so the spin loop never flickers on first pass.
  useEffect(() => {
    if (!folder) return;
    
    let images: HTMLImageElement[] = [];
    if (isAnimated) {
      images = Array.from({ length: frameCount! }).map((_, i) => {
        const img = new window.Image();
        img.src = `${folder}/frame_${i.toString().padStart(3, '0')}.png`;
        return img;
      });
    } else if (spin) {
      images = ROTATION_ORDER.map((direction) => {
        const img = new window.Image();
        img.src = `${folder}/${direction}.png`;
        return img;
      });
    }

    return () => {
      images.forEach((img) => {
        img.src = "";
      });
    };
  }, [spin, folder, isAnimated, creature.animationFrames]);

  useEffect(() => {
    setFrameIndex(0); // Reset animation frame when animation changes
  }, [animName]);

  useEffect(() => {
    if (!folder) return;
    
    if (isAnimated) {
      const id = setInterval(() => {
        setFrameIndex((i) => (i + 1) % frameCount!);
      }, 120); // 120ms per frame for smooth animation
      return () => clearInterval(id);
    } else if (spin) {
      const id = setInterval(() => {
        setFrameIndex((i) => (i + 1) % ROTATION_ORDER.length);
      }, ROTATION_INTERVAL_MS);
      return () => clearInterval(id);
    }
  }, [spin, folder, isAnimated, frameCount]);

  const direction = spin ? ROTATION_ORDER[frameIndex % ROTATION_ORDER.length] : fixedDirection;
  const imgSrc = isAnimated 
    ? `${folder}/frame_${frameIndex.toString().padStart(3, '0')}.png`
    : `${folder}/${direction}.png`;

  const content = folder ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local pixel-art sprite, cycled on an interval
    <img
      src={imgSrc}
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

  const unlocked = creature.potentialNodes || [];
  const unlockedNodesCount = unlocked.length;
  const fullBranchesCount = ["tl-adv3", "tr-adv3", "bl-adv3", "br-adv3"].filter(id => unlocked.includes(id)).length;
  const freeNodesComplete = ["tl-2", "tr-2", "bl-2", "br-2"].every(id => unlocked.includes(id));

  let starImage = null;
  if (unlockedNodesCount > 0 && unlockedNodesCount === POTENTIAL_TREE.length) {
    starImage = "/assets/objects/rainbow_star_hidden.png";
  } else if (fullBranchesCount === 2 || fullBranchesCount === 3) {
    starImage = "/assets/objects/gold_star_hidden.png";
  } else if (fullBranchesCount === 1 || (freeNodesComplete && unlockedNodesCount > 0)) {
    starImage = "/assets/objects/silver_star_hidden.png";
  } else if (unlockedNodesCount > 0) {
    starImage = "/assets/objects/bronce_star_hidden.png";
  }

  const starOverlay = starImage ? (
    <div className="absolute -bottom-1 -right-1 z-20 flex h-6 w-6 items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={starImage} alt="Hidden Potential Star" className="h-full w-full object-contain drop-shadow-md" />
    </div>
  ) : null;

  if (!isMythic && !isLegendary) {
    return (
      <span className={cn("relative inline-block", className)}>
        {content}
        {starOverlay}
      </span>
    );
  }

  const particles = isLegendary ? LEGENDARY_AURA_PARTICLES : AURA_PARTICLES;
  const particleSize = isLegendary ? 6 : 5;

  return (
    <span className={cn("relative inline-flex items-center justify-center", className)}>
      {isLegendary && (
        <motion.span
          aria-hidden
          className="absolute inset-[-18%] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(236,72,153,0.22) 45%, transparent 75%)",
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.94, 1.08, 0.94] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {particles.map((p, i) => (
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
            style={{ width: particleSize, height: particleSize, backgroundColor: p.color, boxShadow: `0 0 5px ${p.color}` }}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.6, 1.3, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
          />
        </motion.span>
      ))}
      <span className="relative z-10 h-full w-full">
        {content}
        {starOverlay}
      </span>
    </span>
  );
}
