"use client";

import { ORB_EVENTS, ALL_ORB_ELEMENTS, EventDifficulty } from "@/lib/eventData";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, thisWeekStartDateString } from "@/lib/utils";
import { useWeeklyResetCountdown } from "@/lib/useResetCountdown";

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

/** "Extra" tab of the Events hub (see EventsHub.tsx) — training-style events, currently just
 * Hidden Training. Was the whole /events page before Events grew Dokkan-style category tabs. */
export function ExtraTab() {
  const router = useRouter();
  const profile = useGameStore((s) => s.profile);
  const resetLabel = useWeeklyResetCountdown();

  // Not a raw read of profile.dailyEventAttempts — that field only actually resets the moment
  // consumeEventAttempt is called, so reading it directly here would show last week's leftover
  // (usually 0) count forever and permanently disable Start below. This is the exact bug that was
  // reported: attempts never looked like they reset because nothing re-checked freshness for
  // display, only for the actual spend.
  const attemptsUsed =
    profile.dailyEventAttemptsDate === thisWeekStartDateString() ? profile.dailyEventAttempts?.[event.id] ?? 0 : 0;
  const attemptsLeft = Math.max(0, event.maxWeeklyAttempts - attemptsUsed);

  // Just navigates — does NOT spend Energy or the weekly attempt. Those are charged in
  // BattlePage.tsx's TeamSelectScreen onStart instead, at the moment the player actually confirms
  // their team and hits "Start Battle" (same as every other stage). Used to charge right here
  // instead, before team select even loaded — reported live: picking a difficulty then backing
  // out of team select without picking anyone still burned an attempt for a battle that never
  // happened.
  function handleStart(diff: EventDifficulty) {
    const params = new URLSearchParams({
      eventId: event.id,
      difficultyId: diff.id,
    });
    router.push(`/combat?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Was an unconstrained hero image, edge-to-edge and 300+px tall, taking up most of the
          screen for a single event — this tab will hold more than one event over time, so no
          single one gets to hog the whole banner slot. Tried a fixed short height at full width
          next: object-cover then had to crop more of the "Hidden Potential" logo the wider the
          screen got (the box's aspect ratio drifting further from the image's own the wider it
          got), and object-contain fixed the crop but left big padded gaps either side instead —
          this image just isn't shaped like an ultra-wide short strip (it's roughly 3:1) and
          forcing it into one either crops it or leaves it looking small and lost.
          Fix: don't force a box shape onto it at all — h-auto lets the image's own aspect ratio
          set the height (so it's never cropped and never padded), and max-w-2xl keeps that from
          still being a huge banner on a wide desktop screen (on mobile max-w-2xl is wider than
          the viewport anyway, so it's effectively just w-full there, same as before). */}
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-white/10">
        <img src="/assets/events/hidden_training.png" alt="Hidden Training" className="w-full h-auto block" />
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
