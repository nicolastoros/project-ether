"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Lock, Swords, Zap } from "lucide-react";
import type { DungeonStage } from "@/types/game";
import type { CampaignWorld } from "@/lib/campaignWorlds";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import { cn } from "@/lib/utils";

// Same "S-curve" node layout as SurvivalWorldMap (components/survival/SurvivalWorldMap.tsx) —
// one world's stages plotted over its own square map image, instead of stacking every world
// into one continuously-scrolling path.
const CENTER_X = 50;
const AMPLITUDE = 26;
const TOP_Y = 10;
const BOTTOM_Y = 90;

interface StageNode {
  stage: DungeonStage;
  x: number;
  y: number;
}

function buildNodes(stages: DungeonStage[]): StageNode[] {
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

interface CampaignWorldMapProps {
  world: CampaignWorld;
  stages: DungeonStage[];
  onSelectStage: (stage: DungeonStage) => void;
}

export function CampaignWorldMap({ world, stages, onSelectStage }: CampaignWorldMapProps) {
  const nodes = useMemo(() => buildNodes(stages), [stages]);
  const nextIndex = useMemo(() => stages.findIndex((s) => !s.isCleared && !s.isLocked), [stages]);
  const progressEndIndex = nextIndex === -1 ? nodes.length - 1 : nextIndex;
  const eventStageId = useMemo(() => getDailyExpEventStageId(world.world, stages), [world.world, stages]);

  const fullPath = useMemo(() => buildPath(nodes), [nodes]);
  const progressPath = useMemo(() => buildPath(nodes.slice(0, progressEndIndex + 1)), [nodes, progressEndIndex]);

  return (
    // max-w-3xl matters beyond "don't let it get silly-wide" — see SurvivalWorldMap.tsx's
    // identical comment: this box's height derives from aspect-ratio off its width whenever an
    // ancestor's own height isn't fully definite, so an uncapped width can push it past the
    // viewport on a wide page.
    <div
      className="relative mx-auto h-full max-h-full w-full max-w-3xl overflow-hidden rounded-3xl border border-arcade-border shadow-sm"
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
          stroke="var(--color-gold)"
          strokeWidth={1.8}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {nodes.map(({ stage, x, y }, i) => {
        const isNext = i === nextIndex;
        const isLocked = stage.isLocked;
        const isExpEvent = stage.id === eventStageId;

        return (
          <button
            key={stage.id}
            onClick={() => onSelectStage(stage)}
            disabled={isLocked}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={`${world.name} stage ${stage.worldStageNumber}: ${stage.name}${isExpEvent ? " — 2x EXP event today" : ""}`}
          >
            <div className="relative">
              {isExpEvent && (
                <span className="absolute -right-1.5 -top-1.5 z-10 flex items-center gap-0.5 rounded-full bg-sky-500 px-1.5 py-0.5 font-arcade text-[7px] font-bold text-white shadow-sm ring-2 ring-white">
                  <Zap className="h-2 w-2 fill-current" /> x2
                </span>
              )}
              <motion.div
                animate={
                  isExpEvent
                    ? {
                        boxShadow: [
                          "0 0 0px 0px rgba(56,189,248,0)",
                          "0 0 16px 6px rgba(56,189,248,0.65)",
                          "0 0 0px 0px rgba(56,189,248,0)",
                        ],
                      }
                    : isNext
                      ? {
                          boxShadow: [
                            "0 0 0px 0px rgba(255,184,77,0)",
                            "0 0 16px 6px rgba(255,184,77,0.6)",
                            "0 0 0px 0px rgba(255,184,77,0)",
                          ],
                        }
                      : undefined
                }
                transition={isNext || isExpEvent ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
                whileTap={isLocked ? undefined : { scale: 0.92 }}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border-[3px] font-arcade text-xs font-bold shadow-md backdrop-blur-sm",
                  stage.isCleared && "border-gold bg-gold text-white",
                  isNext && "border-white bg-white/90 text-foreground",
                  isLocked && "border-white/40 bg-black/40 text-white/70",
                  isExpEvent && !isNext && "border-sky-400"
                )}
              >
                {stage.isCleared ? (
                  <Check className="h-5 w-5" />
                ) : isLocked ? (
                  <Lock className="h-4 w-4" />
                ) : isNext ? (
                  <Swords className="h-5 w-5" />
                ) : (
                  stage.worldStageNumber
                )}
              </motion.div>
            </div>
            <span className="rounded-full bg-black/55 px-1.5 py-0.5 font-arcade text-[8px] font-semibold text-white">
              {stage.worldStageNumber}
            </span>
          </button>
        );
      })}
    </div>
  );
}
