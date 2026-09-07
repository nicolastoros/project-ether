"use client";

import { Check, Gift } from "lucide-react";
import { DAILY_BONUS_GEMS, DAILY_BONUS_GOLD, useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { syncProgressToServer } from "@/lib/syncProgress";
import { cn } from "@/lib/utils";
import { useResetCountdown } from "@/lib/useResetCountdown";

export function DailyTaskList() {
  const dailyTasks = useGameStore((s) => s.dailyTasks);
  const dailyBonusClaimed = useGameStore((s) => s.dailyBonusClaimed);
  const claimTask = useGameStore((s) => s.claimTask);
  const claimDailyBonus = useGameStore((s) => s.claimDailyBonus);
  const resetLabel = useResetCountdown();

  const claimedCount = dailyTasks.filter((t) => t.claimed).length;
  const allClaimed = claimedCount === dailyTasks.length;

  return (
    <GlowPanel accent="neon" className="p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-arcade text-xs glow-text-neon">Daily Tasks</h2>
        <span className="font-mono text-[10px] text-zinc-500">Resets in {resetLabel}</span>
      </div>
      <p className="mt-1 font-mono text-[10px] text-zinc-600">{claimedCount}/{dailyTasks.length} complete</p>

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
                <p
                  className={cn(
                    "mt-0.5 font-mono text-[10px]",
                    !task.claimed && isComplete ? "font-semibold text-neon" : "text-zinc-600"
                  )}
                >
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
                {task.claimed ? (
                  <span className="flex h-7 w-7 items-center justify-center text-zinc-500">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : isComplete ? (
                  <PixelButton
                    size="sm"
                    variant="neon"
                    onClick={() => {
                      claimTask(task.id);
                      // claimTask only mutates local state — without this, a claimed reward's
                      // gold/gems and the claimed flag itself both revert on the next reload,
                      // since nothing ever told BigQuery about it.
                      syncProgressToServer();
                    }}
                  >
                    Claim
                  </PixelButton>
                ) : (
                  // Not ready yet — no button at all, so it can't be mistaken for a disabled
                  // "Claim" (which used to look identical to a bug, not "keep playing").
                  <span className="px-1 font-arcade text-[9px] uppercase tracking-wide text-zinc-500">
                    In progress
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={cn(
          "mt-2 flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 transition-colors",
          dailyBonusClaimed
            ? "border-arcade-border bg-arcade-panel-light opacity-50"
            : allClaimed
              ? "border-gold bg-gold/10"
              : "border-dashed border-arcade-border bg-arcade-panel-light"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Gift className={cn("h-4 w-4 shrink-0", allClaimed && !dailyBonusClaimed ? "text-gold-bright" : "text-zinc-500")} />
          <div className="min-w-0">
            <p className="truncate text-xs text-foreground">All tasks bonus</p>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-600">
              <span className="flex items-center gap-0.5 text-gold-bright">
                <GoldCoinIcon className="h-3 w-3" />
                {DAILY_BONUS_GOLD}
              </span>
              <span className="flex items-center gap-0.5 text-neon">
                <CrownIcon className="h-3 w-3" />
                {DAILY_BONUS_GEMS}
              </span>
            </span>
          </div>
        </div>
        {dailyBonusClaimed ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-zinc-500">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : (
          <PixelButton
            size="sm"
            variant={allClaimed ? "gold" : "ghost"}
            disabled={!allClaimed}
            onClick={() => {
              if (claimDailyBonus()) syncProgressToServer();
            }}
          >
            Claim
          </PixelButton>
        )}
      </div>
    </GlowPanel>
  );
}
