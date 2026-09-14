"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useGameStore } from "@/lib/store";
import { WHATS_NEW_SEEN_ID, WHATS_NEW_TOUR_STEPS } from "@/lib/whatsNew";
import { WhatsNewModal } from "./WhatsNewModal";
import { CoachmarkTour } from "./CoachmarkTour";

/** Mounted once in AppShell.tsx, alongside TutorialBubble. Shows the "What's New" changelog card
 * followed by a coachmark tour of the Hub's Start button + the new Lacrima pill, exactly once per
 * browser (seenTutorialTips is local-only — see lib/tutorialTips.ts's own comment on that
 * tradeoff, which applies identically here).
 *
 * Gated to /hub (the only route whose DOM has this tour's targets) and to players who already
 * received their starter gifts — a brand-new account's hasReceivedStarterGifts is still false at
 * the moment this first renders (GameGate's own claim effect hasn't resolved yet), so a first-ever
 * signup never sees a "here's what changed" card for changes it has no baseline to compare against;
 * it'll show the next time that account logs back in instead, same as any returning player. */
export function WhatsNewTour() {
  const pathname = usePathname();
  const hasReceivedStarterGifts = useGameStore((s) => s.profile.hasReceivedStarterGifts);
  const seenTutorialTips = useGameStore((s) => s.seenTutorialTips);
  const markTutorialTipSeen = useGameStore((s) => s.markTutorialTipSeen);
  const [phase, setPhase] = useState<"modal" | "tour" | "done">("modal");

  const eligible = pathname === "/hub" && hasReceivedStarterGifts && !seenTutorialTips.includes(WHATS_NEW_SEEN_ID);

  if (!eligible || phase === "done") return null;

  const finish = () => {
    markTutorialTipSeen(WHATS_NEW_SEEN_ID);
    setPhase("done");
  };

  if (phase === "modal") {
    return <WhatsNewModal onContinue={() => setPhase("tour")} onSkip={finish} />;
  }
  return <CoachmarkTour steps={WHATS_NEW_TOUR_STEPS} onComplete={finish} />;
}
