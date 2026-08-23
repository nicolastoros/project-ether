"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Lock, Swords } from "lucide-react";
import type { DungeonStage } from "@/types/game";
import { cn } from "@/lib/utils";

interface CampaignMapProps {
  stages: DungeonStage[];
  onSelectStage: (stage: DungeonStage) => void;
}

const NODE_SPACING_Y = 124;
const WORLD_HEADER_HEIGHT = 84;
const AMPLITUDE = 30; // percent either side of center
const CENTER_X = 50; // percent
const TOP_PADDING = 56;
const BOTTOM_PADDING = 70;

interface LayoutNode {
  stage: DungeonStage;
  x: number;
  y: number;
}

interface WorldHeader {
  world: number;
  difficulty: DungeonStage["difficulty"];
  y: number;
}

function buildLayout(stages: DungeonStage[]) {
  const nodes: LayoutNode[] = [];
  const worldHeaders: WorldHeader[] = [];
  let y = TOP_PADDING;

  stages.forEach((stage) => {
    if (stage.worldStageNumber === 1) {
      y += WORLD_HEADER_HEIGHT;
      worldHeaders.push({ world: stage.world, difficulty: stage.difficulty, y: y - WORLD_HEADER_HEIGHT / 2 - 8 });
    }
    const x = CENTER_X + AMPLITUDE * Math.sin(((stage.worldStageNumber - 1) * Math.PI) / 4);
    nodes.push({ stage, x, y });
    y += NODE_SPACING_Y;
  });

  return { nodes, worldHeaders, totalHeight: y + BOTTOM_PADDING };
}

function buildPath(nodes: LayoutNode[]) {
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

const DIFFICULTY_RING: Record<DungeonStage["difficulty"], string> = {
  Normal: "border-rarity-rare",
  Hard: "border-rarity-ssr",
  Nightmare: "border-rarity-mythic",
};

const DIFFICULTY_LABEL_COLOR: Record<DungeonStage["difficulty"], string> = {
  Normal: "text-rarity-rare",
  Hard: "text-rarity-ssr",
  Nightmare: "text-rarity-mythic",
};

export function CampaignMap({ stages, onSelectStage }: CampaignMapProps) {
  const { nodes, worldHeaders, totalHeight } = useMemo(() => buildLayout(stages), [stages]);
  const nextIndex = useMemo(() => stages.findIndex((s) => !s.isCleared && !s.isLocked), [stages]);
  const progressEndIndex = nextIndex === -1 ? nodes.length - 1 : nextIndex;

  const fullPath = useMemo(() => buildPath(nodes), [nodes]);
  const progressPath = useMemo(() => buildPath(nodes.slice(0, progressEndIndex + 1)), [nodes, progressEndIndex]);

  const currentNodeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      currentNodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md" style={{ height: totalHeight }}>
      <svg
        viewBox={`0 0 100 ${totalHeight}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d={fullPath}
          fill="none"
          stroke="var(--color-arcade-border)"
          strokeWidth={3}
          strokeDasharray="1 7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={progressPath}
          fill="none"
          stroke="var(--color-gold)"
          strokeWidth={3.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {worldHeaders.map((header) => (
        <div
          key={header.world}
          className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ top: header.y }}
        >
          <div className="rounded-full border-2 border-gold bg-arcade-panel px-5 py-1.5 shadow-sm">
            <p className="font-arcade text-xs font-bold text-foreground">World {header.world}</p>
          </div>
          <p className={cn("mt-1 font-arcade text-[9px] uppercase tracking-wide", DIFFICULTY_LABEL_COLOR[header.difficulty])}>
            {header.difficulty}
          </p>
        </div>
      ))}

      {nodes.map(({ stage, x, y }, i) => {
        const isNext = i === nextIndex;
        const isDisabled = stage.isLocked;

        return (
          <button
            key={stage.id}
            ref={isNext ? currentNodeRef : undefined}
            disabled={isDisabled}
            onClick={() => onSelectStage(stage)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${x}%`, top: y }}
          >
            {isNext && (
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                className="mb-0.5 rounded-full bg-gold px-2 py-0.5 font-arcade text-[8px] font-bold uppercase text-white shadow-sm"
              >
                Next
              </motion.span>
            )}

            <motion.div
              animate={
                isNext
                  ? { boxShadow: ["0 0 0px 0px rgba(255,184,77,0)", "0 0 18px 6px rgba(255,184,77,0.55)", "0 0 0px 0px rgba(255,184,77,0)"] }
                  : undefined
              }
              transition={isNext ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
              whileTap={isDisabled ? undefined : { scale: 0.92 }}
              className={cn(
                "flex items-center justify-center rounded-full border-[3px] font-arcade text-sm font-bold shadow-sm transition-colors",
                isNext ? "h-16 w-16" : "h-[52px] w-[52px]",
                stage.isCleared && "border-gold bg-gold text-white",
                isNext && "bg-arcade-panel text-foreground",
                isDisabled && "border-arcade-border bg-arcade-panel-light text-zinc-400",
                !stage.isCleared && !isNext && !isDisabled && cn("bg-arcade-panel", DIFFICULTY_RING[stage.difficulty])
              )}
            >
              {stage.isCleared ? (
                <Check className="h-6 w-6" />
              ) : isDisabled ? (
                <Lock className="h-5 w-5" />
              ) : isNext ? (
                <Swords className="h-6 w-6 text-gold-bright" />
              ) : (
                stage.worldStageNumber
              )}
            </motion.div>

            <span
              className={cn(
                "font-arcade text-[9px] font-semibold",
                isDisabled ? "text-zinc-400" : "text-zinc-600"
              )}
            >
              {stage.world}-{stage.worldStageNumber}
            </span>
          </button>
        );
      })}
    </div>
  );
}
