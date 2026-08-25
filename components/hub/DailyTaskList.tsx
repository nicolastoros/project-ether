"use client";

import { Check } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { cn } from "@/lib/utils";

export function DailyTaskList() {
  const dailyTasks = useGameStore((s) => s.dailyTasks);
  const claimTask = useGameStore((s) => s.claimTask);

  return (
    <GlowPanel accent="neon" className="p-4">
      <h2 className="font-arcade text-xs glow-text-neon">Daily Tasks</h2>
      <ul className="mt-3 space-y-2">
        {dailyTasks.map((task) => {
          const isComplete = task.progress >= task.target;
          return (
            <li
              key={task.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl border border-arcade-border bg-arcade-panel-light px-2.5 py-2",
                task.claimed && "opacity-50"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-xs text-foreground">{task.description}</p>
                <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                  {Math.min(task.progress, task.target)}/{task.target}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {task.rewardGold ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-gold-bright">
                    <GoldCoinIcon className="h-3 w-3" />
                    {task.rewardGold}
                  </span>
                ) : null}
                {task.rewardGems ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-neon">
                    <CrownIcon className="h-3 w-3" />
                    {task.rewardGems}
                  </span>
                ) : null}
                <PixelButton
                  size="sm"
                  variant={task.claimed ? "ghost" : "neon"}
                  disabled={!isComplete || task.claimed}
                  onClick={() => claimTask(task.id)}
                >
                  {task.claimed ? <Check className="h-3.5 w-3.5" /> : "Claim"}
                </PixelButton>
              </div>
            </li>
          );
        })}
      </ul>
    </GlowPanel>
  );
}
