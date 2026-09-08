"use client";

import { useState } from "react";
import { ORB_EVENTS, GameEvent, EventDifficulty } from "@/lib/eventData";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useResetCountdown } from "@/lib/useResetCountdown";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
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

export function EventsClient() {
  const router = useRouter();
  const profile = useGameStore((s) => s.profile);
  const consumeEventAttempt = useGameStore((s) => s.consumeEventAttempt);
  const spendEnergy = useGameStore((s) => s.spendEnergy);
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const resetLabel = useResetCountdown();
  const { gating, runGated } = useSyncGate();

  function handleStart(event: GameEvent, diff: EventDifficulty) {
    // Re-syncs against server truth first (see useSyncGate) before this reads/spends Energy and
    // today's attempt count — both are limited, easy-to-lose-track-of resources, exactly the kind
    // a stale local snapshot could mis-charge.
    runGated(() => {
      // Check energy *before* spending the attempt — otherwise a player who's simply out of
      // Energy silently loses one of today's limited attempts for nothing.
      if (useGameStore.getState().currencies.energy < diff.staminaCost) {
        alert("Not enough Energy!");
        return;
      }
      if (!consumeEventAttempt(event.id, event.maxDailyAttempts)) {
        alert("No daily attempts left for this event!");
        return;
      }
      spendEnergy(diff.staminaCost);
      // consumeEventAttempt only mutates local state — without this, a spent attempt (and the
      // date it reset against) reverts on the next server refresh if the player navigates away
      // before GameGate's own ~60s poll happens to catch it.
      syncProgressToServer();

      // 3. Route to combat page
      const params = new URLSearchParams({
        eventId: event.id,
        difficultyId: diff.id,
      });
      router.push(`/combat?${params.toString()}`);
    });
  }

  if (selectedEvent) {
    const attemptsUsed = profile.dailyEventAttempts?.[selectedEvent.id] || 0;
    const attemptsLeft = Math.max(0, selectedEvent.maxDailyAttempts - attemptsUsed);

    return (
      <div className="space-y-4">
        <LoadingOverlay show={gating} />
        <button
          onClick={() => setSelectedEvent(null)}
          className="text-xs text-zinc-500 hover:text-foreground underline decoration-zinc-500/50 underline-offset-4"
        >
          ← Back to Training Orbs
        </button>

        <GlowPanel accent="none" className="p-4 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-arcade text-lg text-foreground">{selectedEvent.name}</h2>
              <p className="text-xs text-zinc-500">{selectedEvent.description}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Attempts</p>
              <p className={cn("font-mono text-sm font-bold", attemptsLeft > 0 ? "text-green-500" : "text-red-500")}>
                {attemptsLeft}/{selectedEvent.maxDailyAttempts}
              </p>
            </div>
          </div>
        </GlowPanel>

        <div className="grid gap-3">
          {selectedEvent.difficulties.map((diff) => (
            <GlowPanel key={diff.id} accent="none" className="p-3 flex items-center justify-between">
              <div>
                <h3 className="font-arcade text-sm text-foreground">{diff.name}</h3>
                <p className="text-[10px] text-zinc-500 mt-1">Recommended Lv. {diff.recommendedLevel} • Boss: {diff.enemyRarity}</p>
                <div className="flex gap-2 mt-2">
                  {diff.rewardAmount.small > 0 && (
                    <div className="flex items-center gap-1 bg-black/40 rounded-full pr-2 pl-1 py-0.5 border border-white/5">
                      <img src={`/assets/objects/orbs/${orbColorMap[selectedEvent.element]}_orb.png`} alt="Small Orb" className="w-4 h-4 object-contain" />
                      <span className="text-[10px] font-mono text-zinc-300 font-bold">{diff.rewardAmount.small}x</span>
                    </div>
                  )}
                  {diff.rewardAmount.medium > 0 && (
                    <div className="flex items-center gap-1 bg-black/40 rounded-full pr-2 pl-1 py-0.5 border border-white/5">
                      <img src={`/assets/objects/orbs/${orbColorMap[selectedEvent.element]}_medium_orb.png`} alt="Medium Orb" className="w-4 h-4 object-contain" />
                      <span className="text-[10px] font-mono text-zinc-300 font-bold">{diff.rewardAmount.medium}x</span>
                    </div>
                  )}
                  {diff.rewardAmount.large > 0 && (
                    <div className="flex items-center gap-1 bg-black/40 rounded-full pr-2 pl-1 py-0.5 border border-white/5">
                      <img src={`/assets/objects/orbs/${orbColorMap[selectedEvent.element]}_large_orb.png`} alt="Large Orb" className="w-4 h-4 object-contain" />
                      <span className="text-[10px] font-mono text-zinc-300 font-bold">{diff.rewardAmount.large}x</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-blue-500">
                  <Zap className="h-3 w-3" /> {diff.staminaCost}
                </span>
                <PixelButton
                  className="px-6 py-2 text-[10px]"
                  disabled={attemptsLeft <= 0}
                  onClick={() => handleStart(selectedEvent, diff)}
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

  // Landing and category used to be two separate clicks showing the same banner twice — merged
  // into one screen so the 7 elemental arenas (and today's remaining attempts) are visible
  // immediately instead of hidden behind a mystery banner.
  const totalAttemptsLeft = ORB_EVENTS.reduce((sum, ev) => {
    const used = profile.dailyEventAttempts?.[ev.id] || 0;
    return sum + Math.max(0, ev.maxDailyAttempts - used);
  }, 0);
  const totalAttemptsMax = ORB_EVENTS.reduce((sum, ev) => sum + ev.maxDailyAttempts, 0);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <LoadingOverlay show={gating} />
      <div className="w-full overflow-hidden rounded-xl border border-white/10 flex items-center justify-center bg-black">
        <img src="/assets/events/hidden_training.png" alt="Hidden Training" className="w-full h-auto block object-contain" />
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-zinc-500">
          <span className={cn("font-mono font-bold", totalAttemptsLeft > 0 ? "text-green-500" : "text-red-500")}>
            {totalAttemptsLeft}/{totalAttemptsMax}
          </span>{" "}
          attempts left today
        </p>
        <p className="text-xs text-zinc-500 font-mono">Resets in {resetLabel}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {ORB_EVENTS.map((ev) => {
          const attemptsUsed = profile.dailyEventAttempts?.[ev.id] || 0;
          const attemptsLeft = Math.max(0, ev.maxDailyAttempts - attemptsUsed);
          const color = orbColorMap[ev.element];

          return (
            <button
              key={ev.id}
              onClick={() => setSelectedEvent(ev)}
              className="text-left group"
            >
              <GlowPanel accent="none" className="relative overflow-hidden p-4 transition-colors hover:border-foreground/30 flex flex-col justify-between h-full min-h-[120px]">
                <div className="relative z-10 flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-arcade text-base text-foreground drop-shadow-sm">{ev.name}</h3>
                    <p className="text-[10px] text-zinc-400 mt-1">{ev.element} Element</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">Attempts</p>
                    <p className={cn("font-mono text-sm font-bold", attemptsLeft > 0 ? "text-green-500" : "text-red-500")}>
                      {attemptsLeft}/{ev.maxDailyAttempts}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex justify-end items-end gap-2 mt-auto group-hover:scale-105 transition-transform">
                  {/* Small orb */}
                  <img src={`/assets/objects/orbs/${color}_orb.png`} alt="Small Orb" className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] animate-pulse" style={{ animationDuration: '3s' }} />
                  {/* Medium orb */}
                  <img src={`/assets/objects/orbs/${color}_medium_orb.png`} alt="Medium Orb" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] animate-pulse" style={{ animationDuration: '4s' }} />
                  {/* Large orb */}
                  <img src={`/assets/objects/orbs/${color}_large_orb.png`} alt="Large Orb" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] animate-pulse" style={{ animationDuration: '2.5s' }} />
                </div>

                {/* Subtle background gradient based on element */}
                <div className={cn("absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br", ELEMENT_GRADIENT[ev.element])} />
              </GlowPanel>
            </button>
          );
        })}
      </div>
    </div>
  );
}
