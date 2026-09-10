"use client";

import { Trophy } from "lucide-react";
import { GlowPanel } from "@/components/ui/GlowPanel";

/** "Challenge" tab of the Events hub (see EventsHub.tsx) — reserved for future ticket/premium-
 * currency events (a Dokkan-style Challenge Battle). No such event exists yet, so this is a plain
 * placeholder rather than a half-built feature. */
export function ChallengeTab() {
  return (
    <GlowPanel accent="none" className="flex flex-col items-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light">
        <Trophy className="h-7 w-7 text-zinc-400" />
      </div>
      <div>
        <p className="font-arcade text-sm text-foreground">Coming Soon</p>
        <p className="mt-1 max-w-xs text-xs text-zinc-500">
          Challenge Battles for Tickets and premium currency are on their way — check back soon!
        </p>
      </div>
    </GlowPanel>
  );
}
