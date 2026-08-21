import Link from "next/link";
import { Lock, CheckCircle2, Zap, Coins, Sparkles } from "lucide-react";
import { DUNGEON_STAGES } from "@/lib/gameData";
import type { DungeonDifficulty } from "@/types/game";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { cn, formatNumber } from "@/lib/utils";

const DIFFICULTY_STYLES: Record<DungeonDifficulty, string> = {
  Normal: "bg-rarity-rare",
  Hard: "bg-rarity-ssr",
  Nightmare: "bg-rarity-mythic",
};

export default function DungeonsPage() {
  const nextStage = DUNGEON_STAGES.find((s) => !s.isCleared && !s.isLocked);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Dungeons</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Clear stages to earn gold, EXP, and equipment drops.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {DUNGEON_STAGES.map((stage) => {
          const isNext = stage.id === nextStage?.id;
          return (
            <GlowPanel
              key={stage.id}
              accent={isNext ? "gold" : "none"}
              className={cn(
                "flex flex-col gap-2.5 p-3",
                stage.isLocked && "opacity-50",
                !stage.isLocked && !isNext && "border-arcade-border"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                    Stage {stage.stageNumber}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{stage.name}</p>
                </div>
                {stage.isCleared ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : stage.isLocked ? (
                  <Lock className="h-4 w-4 shrink-0 text-zinc-600" />
                ) : null}
              </div>

              <span
                className={cn(
                  "inline-flex w-fit items-center rounded-full px-2 py-0.5 font-arcade text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm",
                  DIFFICULTY_STYLES[stage.difficulty]
                )}
              >
                {stage.difficulty}
              </span>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-neon" /> {stage.staminaCost}
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3 text-gold-bright" /> {formatNumber(stage.rewardGold)}
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-violet-500" /> {stage.equipmentDropChance}% drop
                </span>
              </div>

              <p className="text-[10px] text-zinc-600">
                Recommended power: {formatNumber(stage.recommendedPower)}
              </p>

              {stage.isLocked ? (
                <span className="rounded-full flex items-center justify-center bg-arcade-panel-light py-2 font-arcade text-[10px] uppercase text-zinc-600">
                  Locked
                </span>
              ) : (
                <Link
                  href="/combat"
                  className="rounded-full flex items-center justify-center bg-gold py-2 font-arcade text-[10px] font-semibold uppercase text-white shadow-sm border-b-[3px] border-black/15"
                >
                  {stage.isCleared ? "Replay" : "Battle"}
                </Link>
              )}
            </GlowPanel>
          );
        })}
      </div>
    </div>
  );
}
