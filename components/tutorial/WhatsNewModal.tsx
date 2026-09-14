"use client";

import { Sparkles } from "lucide-react";
import { WHATS_NEW_CHANGELOG } from "@/lib/whatsNew";
import { FeatureIntroModal } from "./FeatureIntroModal";

/** The "What's New" changelog card — first beat of WhatsNewTour.tsx, shown once before the
 * coachmark walkthrough starts. Thin wrapper over the generic FeatureIntroModal. */
export function WhatsNewModal({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  return (
    <FeatureIntroModal
      icon={Sparkles}
      title="What's New"
      subtitle="Here's what changed in this update"
      items={WHATS_NEW_CHANGELOG}
      ctaLabel="Show Me Around"
      onContinue={onContinue}
      onSkip={onSkip}
    />
  );
}
