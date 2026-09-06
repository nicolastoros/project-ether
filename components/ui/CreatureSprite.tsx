"use client";

import { useEffect, useId, useState } from "react";
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

/** Hidden Potential progress badge — gold while any node is unlocked but the tree isn't
 * finished, ruby once every node is. Hand-drawn as an inline SVG (not a raster asset) so it
 * stays crisp at any size and can be scaled as a percentage of the sprite box it sits on,
 * instead of a fixed pixel size that swallows small sprites. */
function HiddenPotentialStar({ tier }: { tier: "gold" | "ruby" }) {
  const gradientId = useId();
  const colors =
    tier === "ruby"
      ? { light: "#fda4af", mid: "#e11d48", dark: "#881337", glow: "rgba(225,29,72,0.9)" }
      : { light: "#fef08a", mid: "#f59e0b", dark: "#b45309", glow: "rgba(245,158,11,0.9)" };
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full overflow-visible" style={{ filter: `drop-shadow(0 0 2px ${colors.glow})` }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="55%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      <path
        d="M12 1.5l2.99 6.4L22 9.02l-5.11 4.86L18.36 21 12 17.27 5.64 21l1.47-7.12L2 9.02l7.01-1.12L12 1.5z"
        fill={`url(#${gradientId})`}
        stroke="rgba(40,10,10,0.45)"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  /** Renders a grayscale silhouette instead of the normal element-colored sprite, and skips the
   * Mythic/LR aura + Hidden-Potential star overlays regardless of rarity — for a Dex entry the
   * player doesn't own yet (see app/(game)/dex/page.tsx). */
  locked?: boolean;
}

export function CreatureSprite({ creature, className, spin = false, direction: fixedDirection = "south", activeAnimation, locked = false }: CreatureSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  // Raid boss skill names are player-facing flavor text, but the actual animation folders on
  // disk keep their raw (often auto-captioned) names — each raid boss with more than a plain
  // stand pose needs its skill name mapped to its real folder name here.
  const animName = activeAnimation
    ? activeAnimation
        .replace("Crimson Exterminion", "Crimson_Exterminion")
        .replace("Stormcore Discharge", "The_creature_stands_firm_its_feathers_bristling_as")
        .replace("Tempest Wingstorm", "The_creature_plants_its_feet_firmly_and_spreads_it")
        .replace("Radiant Blade Rush", "sword_attack")
        .replace("Elysian Judgment", "final_elysium")
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
      className={cn("h-full w-full object-contain", locked && "grayscale contrast-75 brightness-75")}
      style={{ imageRendering: "pixelated" }}
    />
  ) : (
    (() => {
      const Icon = ELEMENT_ICON[creature.element];
      return <Icon className={cn("h-full w-full", locked && "grayscale contrast-75 brightness-75")} />;
    })()
  );

  // Locked (unowned) entries never show the Mythic/LR aura or Hidden Potential star, regardless
  // of the creature's actual rarity/potential — those celebrate progress the player hasn't made.
  if (locked) {
    return <span className={cn("relative inline-block", className)}>{content}</span>;
  }

  const unlockedNodesCount = (creature.potentialNodes || []).length;
  const isMaxPotential = unlockedNodesCount > 0 && unlockedNodesCount === POTENTIAL_TREE.length;
  const starTier: "gold" | "ruby" | null = unlockedNodesCount === 0 ? null : isMaxPotential ? "ruby" : "gold";

  // Sized as a percentage of the sprite box itself (not a fixed pixel size) so it scales down
  // cleanly on tiny roster cards instead of swallowing the sprite, and up on larger ones.
  const starOverlay = starTier ? (
    <div className="absolute -bottom-[4%] -right-[4%] z-20 h-[36%] w-[36%]">
      <HiddenPotentialStar tier={starTier} />
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
