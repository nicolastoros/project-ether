"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import { TUTORIAL_TIPS } from "@/lib/tutorialTips";

interface MonsterGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mirrors NAV_GROUPS' "Play"/"Collection" section titles (lib/navigation.ts) so this reads like a
// table of contents, but listed explicitly rather than derived from NAV_GROUPS — that array only
// has top-level routes, not the Formations sub-pages/Dex this also covers. "Social" (Friends/
// Guild) has no tips yet, so it's left out rather than shown as an empty section.
const GUIDE_SECTIONS: { title: string; pathnames: string[] }[] = [
  {
    title: "Play",
    pathnames: ["/hub", "/campaign", "/survival", "/events", "/raid", "/expeditions", "/gacha", "/pvp"],
  },
  {
    title: "Collection",
    pathnames: [
      "/monsters",
      "/formations",
      "/formations/teams",
      "/formations/sell",
      "/formations/potential",
      "/dex",
      "/inventory",
      "/tamer",
      "/shop",
      "/trophies",
    ],
  },
];

/** Permanent reference for every onboarding tip (lib/tutorialTips.ts) — opened from the "Monster
 * Guide" button in TopStatusBar.tsx. Purely a read-only list; unlike TutorialBubble.tsx it never
 * touches seenTutorialTips, since re-reading a tip you've already dismissed shouldn't need
 * tracking. Same portal/Escape-to-close shape as GiftsModal.tsx. */
export function MonsterGuideModal({ isOpen, onClose }: MonsterGuideModalProps) {
  const [mounted, setMounted] = useState(false);

  // Delays the createPortal call below until after client mount — document.body doesn't exist
  // during SSR, and this is the standard guard for that (same pattern as GiftsModal.tsx). The
  // purity linter flags setState-in-effect generically, but there's no render-time alternative
  // for "has this component mounted in the browser yet".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-arcade-border bg-arcade-panel shadow-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-arcade-border bg-arcade-panel p-4">
              <h2 className="flex items-center gap-2 font-arcade text-lg glow-text-gold">
                <BookOpen className="h-5 w-5 text-gold-bright" />
                Monster Guide
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {GUIDE_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 font-arcade text-[10px] uppercase tracking-wider text-slate-400">
                    {section.title}
                  </p>
                  <div className="space-y-2">
                    {section.pathnames.map((pathname) => {
                      const tip = TUTORIAL_TIPS[pathname];
                      if (!tip) return null;
                      return (
                        <div
                          key={tip.id}
                          className="rounded-xl border-2 border-[#38bdf8]/60 bg-arcade-panel-light p-3"
                        >
                          <p className="font-arcade text-[10px] uppercase tracking-wide text-[#0e7490]">
                            {tip.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-foreground">{tip.body}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
