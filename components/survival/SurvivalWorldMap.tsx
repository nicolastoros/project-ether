"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import type { SurvivalStage, SurvivalWorld } from "@/lib/survivalStages";
import { cn } from "@/lib/utils";

// Same "S-curve" technique as CampaignMap (components/campaign/CampaignMap.tsx), just laid out
// as percentages over a single square map image instead of scrolling through several worlds.
const CENTER_X = 50;
const AMPLITUDE = 26;
const TOP_Y = 10;
const BOTTOM_Y = 90;

interface StageNode {
  stage: SurvivalStage;
  x: number;
  y: number;
}

function buildNodes(stages: SurvivalStage[]): StageNode[] {
  const span = stages.length > 1 ? BOTTOM_Y - TOP_Y : 0;
  return stages.map((stage, i) => ({
    stage,
    x: CENTER_X + AMPLITUDE * Math.sin((i * Math.PI) / 4),
    y: stages.length > 1 ? BOTTOM_Y - (i * span) / (stages.length - 1) : BOTTOM_Y,
  }));
}

function buildPath(nodes: StageNode[]): string {
  if (nodes.length === 0) return "";
  if (nodes.length === 1) return `M ${nodes[0].x} ${nodes[0].y}`;
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length - 1; i++) {
    const midX = (nodes[i].x + nodes[i + 1].x) / 2;
    const midY = (nodes[i].y + nodes[i + 1].y) / 2;
    d += ` Q ${nodes[i].x} ${nodes[i].y} ${midX} ${midY}`;
  }
  const last = nodes[nodes.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

interface SurvivalWorldMapProps {
  world: SurvivalWorld;
  stages: SurvivalStage[];
  highestCleared: number;
  onSelectStage: (stage: SurvivalStage) => void;
}

export function SurvivalWorldMap({ world, stages, highestCleared, onSelectStage }: SurvivalWorldMapProps) {
  const nodes = useMemo(() => buildNodes(stages), [stages]);
  const nextStageNumber = highestCleared + 1;
  const nextIndex = stages.findIndex((s) => s.stageNumber === nextStageNumber);
  const progressEndIndex = nextIndex === -1 ? nodes.length - 1 : nextIndex;

  const fullPath = useMemo(() => buildPath(nodes), [nodes]);
  const progressPath = useMemo(() => buildPath(nodes.slice(0, progressEndIndex + 1)), [nodes, progressEndIndex]);

  return (
    <div
      className="relative mx-auto h-full max-h-full w-full overflow-hidden rounded-3xl border border-arcade-border shadow-sm"
      style={{ aspectRatio: "1 / 1" }}
    >
      <Image src={world.mapImage} alt={world.name} fill className="object-cover" priority />
      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/45 to-transparent p-3">
        <p className="font-arcade text-xs font-bold text-white drop-shadow">
          World {world.world} · {world.name}
        </p>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path
          d={fullPath}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={1.4}
          strokeDasharray="0.6 2.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={progressPath}
          fill="none"
          stroke="var(--color-neon)"
          strokeWidth={1.8}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {nodes.map(({ stage, x, y }) => {
        const isCleared = stage.stageNumber <= highestCleared;
        const isNext = stage.stageNumber === nextStageNumber;
        const isLocked = !isCleared && !isNext;

        return (
          <button
            key={stage.id}
            onClick={() => onSelectStage(stage)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`${world.name} stage ${stage.worldStageNumber}: ${stage.name}`}
          >
            <motion.div
              animate={
                isNext
                  ? {
                      boxShadow: [
                        "0 0 0px 0px rgba(45,212,191,0)",
                        "0 0 16px 6px rgba(45,212,191,0.6)",
                        "0 0 0px 0px rgba(45,212,191,0)",
                      ],
                    }
                  : undefined
              }
              transition={isNext ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border-[3px] font-arcade text-xs font-bold shadow-md backdrop-blur-sm",
                isCleared && "border-neon bg-neon text-white",
                isNext && "border-white bg-white/90 text-foreground",
                isLocked && "border-white/40 bg-black/40 text-white/70"
              )}
            >
              {isCleared ? (
                <Check className="h-5 w-5" />
              ) : isLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                stage.worldStageNumber
              )}
            </motion.div>
            <span className="rounded-full bg-black/55 px-1.5 py-0.5 font-arcade text-[8px] font-semibold text-white">
              {stage.worldStageNumber}
            </span>
          </button>
        );
      })}
    </div>
  );
}
