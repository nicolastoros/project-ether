"use client";

import { Sparkles } from "lucide-react";
import { WHATS_NEW_CHANGELOG, WHATS_NEW_MODAL_TEXT } from "@/lib/whatsNew";
import { useGameStore } from "@/lib/store";
import { FeatureIntroModal } from "./FeatureIntroModal";

/** The "What's New" changelog card — first beat of WhatsNewTour.tsx, shown once before the
 * coachmark walkthrough starts. Thin wrapper over the generic FeatureIntroModal. */
export function WhatsNewModal({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const language = useGameStore((s) => s.language);
  return (
    <FeatureIntroModal
      icon={Sparkles}
      title={WHATS_NEW_MODAL_TEXT[language].title}
      subtitle={WHATS_NEW_MODAL_TEXT[language].subtitle}
      items={WHATS_NEW_CHANGELOG[language]}
      onContinue={onContinue}
      onSkip={onSkip}
    />
  );
}
