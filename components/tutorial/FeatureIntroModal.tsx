"use client";

import { motion } from "framer-motion";
import { X, type LucideIcon } from "lucide-react";
import type { FeatureIntroItem } from "@/lib/whatsNew";
import { useT } from "@/lib/i18n/useT";

export type { FeatureIntroItem };

/** Generic centered "here's what this is" card — the modal beat every one-time feature tour opens
 * with, before handing off to CoachmarkTour.tsx for the walkthrough of the actual UI. Not
 * spotlight-based (nothing on screen to point at yet), so it works regardless of route. Originally
 * built as WhatsNewModal for the maintenance changelog; generalized once Overclock's own first-run
 * intro needed the identical shape with different copy — see WhatsNewTour.tsx and
 * OverclockTour.tsx for the two callers. */
export function FeatureIntroModal({
  icon: Icon,
  title,
  subtitle,
  items,
  ctaLabel,
  onContinue,
  onSkip,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  items: FeatureIntroItem[];
  ctaLabel?: string;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const t = useT();
  const resolvedCtaLabel = ctaLabel ?? t("tutorial.show_me_around");
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 border-gold bg-arcade-panel shadow-[0_0_40px_-6px_rgba(255,184,77,0.5)]"
      >
        <button
          type="button"
          onClick={onSkip}
          aria-label={t("common.close")}
          className="absolute right-3 top-3 z-10 text-zinc-400 hover:text-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="shrink-0 border-b border-arcade-border bg-gradient-to-b from-gold/15 to-transparent px-5 pb-4 pt-5 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold bg-gold/10">
            <Icon className="h-5 w-5 text-gold-bright" />
          </div>
          <h2 className="mt-2 font-arcade text-sm uppercase tracking-wide text-gold-bright">{title}</h2>
          <p className="mt-1 text-[11px] text-zinc-500">{subtitle}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {items.map((entry) => (
            <div key={entry.title} className="rounded-xl border border-arcade-border bg-arcade-panel-light p-3">
              <p className="font-arcade text-[10px] uppercase tracking-wide text-gold-bright">{entry.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">{entry.body}</p>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-arcade-border px-5 py-4">
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-full bg-gradient-to-br from-gold-bright to-gold py-2.5 font-arcade text-[11px] uppercase tracking-wide text-white shadow-[0_0_14px_rgba(255,184,77,0.6)]"
          >
            {resolvedCtaLabel}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="mt-2 w-full text-center text-[10px] uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
          >
            {t("tutorial.skip")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
