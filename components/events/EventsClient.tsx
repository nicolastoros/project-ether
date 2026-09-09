"use client";

import { ORB_EVENTS, ALL_ORB_ELEMENTS, EventDifficulty } from "@/lib/eventData";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, thisWeekStartDateString } from "@/lib/utils";
import { useWeeklyResetCountdown } from "@/lib/useResetCountdown";
import { syncProgressToServer } from "@/lib/syncProgress";
import { useSyncGate } from "@/lib/useSyncGate";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

const orbColorMap: Record<string, string> = {
  Fire: "red",
  Water: "blue",
  Nature: "green",
  Light: "yellow",
  Dark: "purple",
  Electric: "cyan",
  Neutral: "gray"
};

// One consolidated event now (see lib/eventData.ts's ORB_EVENTS comment) — no more picking
// between 7 near-identical per-element tiles first, straight into its 4 difficulty tiers.
const event = ORB_EVENTS[0];

export function EventsClient() {
  const router = useRouter();
  const profile = useGameStore((s) => s.profile);
  const consumeEventAttempt = useGameStore((s) => s.consumeEventAttempt);
  const spendEnergy = useGameStore((s) => s.spendEnergy);
  const resetLabel = useWeeklyResetCountdown();
  const { gating, runGated } = useSyncGate();

  // Not a raw read of profile.dailyEventAttempts — that field only actually resets the moment
  // consumeEventAttempt is called, so reading it directly here would show last week's leftover
  // (usually 0) count forever and permanently disable Start below. This is the exact bug that was
  // reported: attempts never looked like they reset because nothing re-checked freshness for
  // display, only for the actual spend.
  const attemptsUsed =
    profile.dailyEventAttemptsDate === thisWeekStartDateString() ? profile.dailyEventAttempts?.[event.id] ?? 0 : 0;
  const attemptsLeft = Math.max(0, event.maxWeeklyAttempts - attemptsUsed);

  function handleStart(diff: EventDifficulty) {
    // Re-syncs against server truth first (see useSyncGate) before this reads/spends Energy and
    // this week's attempt count — both are limited, easy-to-lose-track-of resources, exactly the
    // kind a stale local snapshot could mis-charge.
    runGated(() => {
      // Check energy *before* spending the attempt — otherwise a player who's simply out of
      // Energy silently loses one of this week's limited attempts for nothing.
      if (useGameStore.getState().currencies.energy < diff.staminaCost) {
        alert("Not enough Energy!");
        return;
      }
      if (!consumeEventAttempt(event.id, event.maxWeeklyAttempts)) {
        alert("No attempts left for this event this week!");
        return;
      }
      spendEnergy(diff.staminaCost);
      // consumeEventAttempt only mutates local state — without this, a spent attempt (and the
      // date it reset against) reverts on the next server refresh if the player navigates away
      // before GameGate's own ~60s poll happens to catch it.
      syncProgressToServer();

      const params = new URLSearchParams({
        eventId: event.id,
        difficultyId: diff.id,
      });
      router.push(`/combat?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-4">
      <LoadingOverlay show={gating} />
      <div className="w-full overflow-hidden rounded-xl border border-white/10 flex items-center justify-center bg-black">
        <img src="/assets/events/hidden_training.png" alt="Hidden Training" className="w-full h-auto block object-contain" />
      </div>

      <GlowPanel accent="none" className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-arcade text-lg text-foreground">{event.name}</h2>
            <p className="text-xs text-zinc-500">{event.description}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Attempts</p>
            <p className={cn("font-mono text-sm font-bold", attemptsLeft > 0 ? "text-green-500" : "text-red-500")}>
              {attemptsLeft}/{event.maxWeeklyAttempts}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono">Resets in {resetLabel}</p>
      </GlowPanel>

      <div className="grid gap-3">
        {event.difficulties.map((diff) => (
          <GlowPanel key={diff.id} accent="none" className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-arcade text-sm text-foreground">{diff.name}</h3>
              <p className="text-[10px] text-zinc-500 mt-1">Recommended Lv. {diff.recommendedLevel} • Boss: {diff.enemyRarity}</p>
              <div className="flex flex-col gap-1.5 mt-2">
                {(["small", "medium", "large"] as const).map((size) =>
                  diff.rewardAmount[size] > 0 ? (
                    <div key={size} className="flex items-center gap-1 bg-black/40 rounded-full pr-2 pl-1 py-0.5 border border-white/5 w-fit">
                      <div className="flex -space-x-1">
                        {ALL_ORB_ELEMENTS.map((el) => (
                          <img
                            key={el}
                            src={`/assets/objects/orbs/${orbColorMap[el]}${size === "small" ? "" : `_${size}`}_orb.png`}
                            alt=""
                            className="w-3.5 h-3.5 object-contain rounded-full border border-black/40"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-300 font-bold">×{diff.rewardAmount[size]} each</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-blue-500">
                <Zap className="h-3 w-3" /> {diff.staminaCost}
              </span>
              <PixelButton
                className="px-6 py-2 text-[10px]"
                disabled={attemptsLeft <= 0}
                onClick={() => handleStart(diff)}
              >
                START
              </PixelButton>
            </div>
          </GlowPanel>
        ))}
      </div>
    </div>
  );
}
