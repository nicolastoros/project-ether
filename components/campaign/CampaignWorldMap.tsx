"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Lock, Swords, Zap, Skull, Star } from "lucide-react";
import type { DungeonStage } from "@/types/game";
import type { CampaignWorld } from "@/lib/campaignWorlds";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// --- Mobile (Vertical) Layout Constants ---
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

// --- PC (Horizontal Cybernetic) Layout Constants ---
const PC_LEFT_X = 12;
const PC_RIGHT_X = 86;

function buildPcNodes(stages: DungeonStage[]): StageNode[] {
  const span = stages.length > 1 ? PC_RIGHT_X - PC_LEFT_X : 0;
  return stages.map((stage, i) => {
    let y = 50;
    if (stages.length > 1) {
      if (i === stages.length - 1) {
        y = 50; // boss in the middle
      } else {
        y = i % 2 === 0 ? 40 : 60; // square zig-zag (less separated vertically)
      }
    }
    return {
      stage,
      x: stages.length > 1 ? PC_LEFT_X + (i * span) / (stages.length - 1) : 50,
      y,
    };
  });
}

function buildPcPath(nodes: StageNode[]): string {
  if (nodes.length === 0) return "";
  if (nodes.length === 1) return `M ${nodes[0].x} ${nodes[0].y}`;
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 0; i < nodes.length - 1; i++) {
    const current = nodes[i];
    const next = nodes[i + 1];
    const midX = (current.x + next.x) / 2;
    d += ` L ${midX} ${current.y} L ${midX} ${next.y} L ${next.x} ${next.y}`;
  }
  return d;
}

interface CampaignWorldMapProps {
  world: CampaignWorld;
  stages: DungeonStage[];
  onSelectStage: (stage: DungeonStage) => void;
}

function MobileCampaignWorldMap({ world, stages, onSelectStage }: CampaignWorldMapProps) {
  const nodes = useMemo(() => buildNodes(stages), [stages]);
  const nextIndex = useMemo(() => stages.findIndex((s) => !s.isCleared && !s.isLocked), [stages]);
  const progressEndIndex = nextIndex === -1 ? nodes.length - 1 : nextIndex;
  const eventStageId = useMemo(() => getDailyExpEventStageId(world.world, stages), [world.world, stages]);

  const stageStars = useGameStore((s) => s.dungeon.stageStars);

  const fullPath = useMemo(() => buildPath(nodes), [nodes]);
  const progressPath = useMemo(() => buildPath(nodes.slice(0, progressEndIndex + 1)), [nodes, progressEndIndex]);

  return (
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
        const stars = stageStars[stage.id] || { noDeaths: false, noItems: false, underFiveTurns: false };
        const earnedStars = [stars.noDeaths, stars.noItems, stars.underFiveTurns];

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
            <div className="flex flex-col items-center gap-0.5">
              <span className="rounded-full bg-black/55 px-1.5 py-0.5 font-arcade text-[8px] font-semibold text-white">
                {stage.worldStageNumber}
              </span>
              {/* Render small stars if unlocked */}
              {!isLocked && (
                <div className="flex gap-0.5 rounded-full bg-black/50 px-1 py-0.5 shadow-sm">
                  {earnedStars.map((earned, idx) => (
                    <Star
                      key={idx}
                      className={cn("h-[8px] w-[8px]", earned ? "fill-gold text-gold" : "text-white/20")}
                    />
                  ))}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PcCampaignWorldMap({ world, stages, onSelectStage }: CampaignWorldMapProps) {
  const nodes = useMemo(() => buildPcNodes(stages), [stages]);
  const nextIndex = useMemo(() => stages.findIndex((s) => !s.isCleared && !s.isLocked), [stages]);
  const progressEndIndex = nextIndex === -1 ? nodes.length - 1 : nextIndex;
  const eventStageId = useMemo(() => getDailyExpEventStageId(world.world, stages), [world.world, stages]);

  const stageStars = useGameStore((s) => s.dungeon.stageStars);

  const fullPath = useMemo(() => buildPcPath(nodes), [nodes]);
  const progressPath = useMemo(() => buildPcPath(nodes.slice(0, progressEndIndex + 1)), [nodes, progressEndIndex]);

  // Tech/RPG shapes
  const dodecagonClip = "polygon(50% 0%, 75% 6.7%, 93.3% 25%, 100% 50%, 93.3% 75%, 75% 93.3%, 50% 100%, 25% 93.3%, 6.7% 75%, 0% 50%, 6.7% 25%, 25% 6.7%)";
  const hexagonClip = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

  return (
    <div className="relative mx-auto flex h-full w-full min-h-[320px] overflow-hidden rounded-3xl border-2 border-sky-100 bg-white shadow-xl">
      {/* Map Image visible */}
      <div className="absolute inset-0">
        <Image src={world.mapImage} alt={world.name} fill className="object-cover" priority />
      </div>
      
      {/* Subtle gradients to ensure text/nodes legibility without obscuring the map */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
      
      {/* Light digital grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:48px_48px] mix-blend-overlay" />
      
      <div className="absolute inset-x-0 top-0 p-6">
        <p className="font-arcade text-lg font-bold text-white drop-shadow-md">
          {world.name} // SYS.WORLD_{world.world}
        </p>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {/* Full path dashed line */}
        <path
          d={fullPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth={2}
          strokeLinejoin="miter"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {nodes.map(({ stage, x, y }, i) => {
        const isNext = i === nextIndex;
        const isLocked = stage.isLocked;
        const isExpEvent = stage.id === eventStageId;
        const isBoss = i === nodes.length - 1;
        const stars = stageStars[stage.id] || { noDeaths: false, noItems: false, underFiveTurns: false };
        const earnedStars = [stars.noDeaths, stars.noItems, stars.underFiveTurns];

        const sizeClass = isBoss ? "h-16 w-16" : "h-12 w-12";

        return (
          <motion.button
            key={stage.id}
            onClick={() => onSelectStage(stage)}
            disabled={isLocked}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 focus:outline-none"
            style={{ left: `${x}%`, top: `${y}%` }}
            whileHover={!isLocked ? { scale: 1.15 } : undefined}
          >
            <div className="relative">
              {isExpEvent && (
                <span className="absolute -right-4 -top-3 z-10 flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-400 to-blue-500 px-2 py-0.5 font-arcade text-[9px] font-bold text-white shadow-md ring-1 ring-white">
                  <Zap className="h-3 w-3 fill-current" /> 2X
                </span>
              )}
              
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border-[3px] font-arcade text-sm font-bold shadow-md backdrop-blur-sm transition-colors",
                  sizeClass,
                  stage.isCleared && "border-gold bg-gold text-white",
                  isNext && "border-white bg-white/95 text-foreground",
                  isLocked && "border-white/30 bg-black/50 text-white/60",
                  isExpEvent && !isNext && "border-sky-400"
                )}
              >
                {stage.isCleared ? (
                  isBoss ? <Skull className="h-6 w-6" /> : <Check className="h-6 w-6" />
                ) : isLocked ? (
                  <Lock className="h-5 w-5 opacity-70" />
                ) : isNext ? (
                  isBoss ? <Skull className="h-7 w-7" /> : <Swords className="h-6 w-6" />
                ) : (
                  <span className={isBoss ? "text-xl" : "text-lg"}>{stage.worldStageNumber}</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-black/60 px-2.5 py-1 font-arcade text-[10px] font-semibold text-white backdrop-blur-sm">
                {isBoss ? "BOSS" : stage.worldStageNumber}
              </span>
              {/* Render small stars if unlocked */}
              {!isLocked && (
                <div className="flex gap-1 rounded-full bg-black/50 px-1.5 py-0.5 shadow-sm">
                  {earnedStars.map((earned, idx) => (
                    <Star
                      key={idx}
                      className={cn("h-[10px] w-[10px]", earned ? "fill-gold text-gold" : "text-white/20")}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export function CampaignWorldMap(props: CampaignWorldMapProps) {
  return (
    <>
      <div className="h-full w-full lg:hidden">
        <MobileCampaignWorldMap {...props} />
      </div>
      <div className="hidden h-full w-full lg:block">
        <PcCampaignWorldMap {...props} />
      </div>
    </>
  );
}
