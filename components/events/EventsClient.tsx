"use client";

import { useState } from "react";
import { ORB_EVENTS, GameEvent, EventDifficulty } from "@/lib/eventData";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";

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

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  function handleStart(event: GameEvent, diff: EventDifficulty) {
    // 1. Consume attempt
    if (!consumeEventAttempt(event.id)) {
      alert("No daily attempts left for this event!");
      return;
    }
    // 2. Consume energy
    if (!spendEnergy(diff.staminaCost)) {
      alert("Not enough Energy!");
      return;
    }

    // 3. Route to combat page
    const params = new URLSearchParams({
      eventId: event.id,
      difficultyId: diff.id,
    });
    router.push(`/combat?${params.toString()}`);
  }

  if (selectedEvent) {
    const attemptsUsed = profile.dailyEventAttempts?.[selectedEvent.id] || 0;
    const attemptsLeft = Math.max(0, selectedEvent.maxDailyAttempts - attemptsUsed);

    return (
      <div className="space-y-4">
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

  if (selectedCategory === "training_orbs") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedCategory(null)}
          className="text-xs text-zinc-500 hover:text-foreground underline decoration-zinc-500/50 underline-offset-4"
        >
          ← Back to Events Categories
        </button>

        <div className="w-full max-w-4xl mx-auto overflow-hidden rounded-xl border border-white/10 flex items-center justify-center bg-black">
          <img src="/assets/events/hidden_training.png" alt="Training Orbs Banner" className="w-full h-auto block object-contain" />
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

  return (
    <div className="flex justify-center">
      <button
        onClick={() => setSelectedCategory("training_orbs")}
        className="text-left group mx-auto w-full max-w-4xl"
      >
        <GlowPanel accent="none" className="overflow-hidden p-0 transition-colors hover:border-foreground/50 flex justify-center items-center bg-black">
          <img
            src="/assets/events/hidden_training.png"
            alt="Training Orbs"
            className="w-full h-auto block object-contain group-hover:scale-105 group-hover:opacity-90 transition-all duration-500"
          />
        </GlowPanel>
      </button>
    </div>
  );
}
