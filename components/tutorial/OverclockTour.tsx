"use client";

import { useState } from "react";
import { Swords } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { OVERCLOCK_INTRO_ITEMS, OVERCLOCK_TOUR_SEEN_ID, OVERCLOCK_TOUR_STEPS } from "@/lib/overclockTour";
import { FeatureIntroModal } from "./FeatureIntroModal";
import { CoachmarkTour } from "./CoachmarkTour";

/** Mounted in app/(game)/overclock/page.tsx, next to OverclockHome — same modal-then-coachmark
 * shape as WhatsNewTour.tsx, scoped to this one mode instead of a whole maintenance's changelog.
 * Fires the first time any account ever visits /overclock, independent of whats-new-v1 (a player
 * could reach this mode long before or after any given changelog fires). Reuses the same
 * local-only seenTutorialTips array — see lib/overclockTour.ts's comment. */
export function OverclockTour() {
  const seenTutorialTips = useGameStore((s) => s.seenTutorialTips);
  const markTutorialTipSeen = useGameStore((s) => s.markTutorialTipSeen);
  const [phase, setPhase] = useState<"modal" | "tour" | "done">("modal");

  const eligible = !seenTutorialTips.includes(OVERCLOCK_TOUR_SEEN_ID);
  if (!eligible || phase === "done") return null;

  const finish = () => {
    markTutorialTipSeen(OVERCLOCK_TOUR_SEEN_ID);
    setPhase("done");
  };

  if (phase === "modal") {
    return (
      <FeatureIntroModal
        icon={Swords}
        title="Overclock"
        subtitle="A new weekly ranked boss fight"
        items={OVERCLOCK_INTRO_ITEMS}
        ctaLabel="Show Me Around"
        onContinue={() => setPhase("tour")}
        onSkip={finish}
      />
    );
  }
  return <CoachmarkTour steps={OVERCLOCK_TOUR_STEPS} onComplete={finish} />;
}
