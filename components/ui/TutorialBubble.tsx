"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { TUTORIAL_TIPS } from "@/lib/tutorialTips";
import { cn } from "@/lib/utils";

/** Mounted once in AppShell.tsx — route-driven, not per-page. Shows the current route's tip (see
 * lib/tutorialTips.ts) exactly once ever, dismissed by a click anywhere on the card (or the X),
 * which marks its id in the persisted (local-only) seenTutorialTips list. Re-readable anytime via
 * the Monster Guide (MonsterGuideModal.tsx, opened from TopStatusBar). */
export function TutorialBubble() {
  const pathname = usePathname();
  const seenTutorialTips = useGameStore((s) => s.seenTutorialTips);
  const markTutorialTipSeen = useGameStore((s) => s.markTutorialTipSeen);

  const tip = TUTORIAL_TIPS[pathname];
  const isVisible = Boolean(tip) && !seenTutorialTips.includes(tip.id);

  return (
    <AnimatePresence>
      {isVisible && tip && (
        <motion.button
          type="button"
          onClick={() => markTutorialTipSeen(tip.id)}
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className={cn(
            "fixed z-40 w-[calc(100%-2rem)] max-w-sm cursor-pointer rounded-2xl border-2 p-4 text-left",
            "border-[#38bdf8] bg-arcade-panel shadow-[0_0_24px_-4px_rgba(56,189,248,0.55)]",
            // Above BottomNav on mobile (which sits fixed at the bottom, ~64px tall); bottom-right
            // on desktop where there's no bottom nav to clear.
            "bottom-20 inset-x-4 lg:inset-x-auto lg:bottom-6 lg:right-6"
          )}
          aria-label={`${tip.title} tip — click to dismiss`}
        >
          <span className="absolute right-3 top-3 text-zinc-400">
            <X className="h-3.5 w-3.5" />
          </span>
          <p className="pr-5 font-arcade text-[11px] uppercase tracking-wide text-[#0e7490]">{tip.title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">{tip.body}</p>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
