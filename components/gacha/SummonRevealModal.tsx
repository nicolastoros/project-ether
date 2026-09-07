"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Creature, Rarity } from "@/types/game";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { RARITY_SORT_ORDER } from "@/lib/gameData";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureName } from "@/components/ui/CreatureName";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";

interface SummonRevealModalProps {
  results: Creature[] | null;
  onClose: () => void;
}

// Rarity reads at a glance now instead of every card getting the same gold frame regardless of
// what's inside — Common/Rare/SSR/Mythic borders match the same colors RarityBadge already uses
// elsewhere, LR gets its own brighter gold since it's the one tier above Mythic.
const RARITY_REVEAL: Record<Rarity, { border: string; flash: string; title: string | null }> = {
  Common: { border: "border-rarity-common/70", flash: "rgba(100,116,139,0.6)", title: null },
  Rare: { border: "border-rarity-rare/70", flash: "rgba(59,130,246,0.65)", title: null },
  SSR: { border: "border-rarity-ssr/70", flash: "rgba(245,158,11,0.7)", title: null },
  Mythic: { border: "border-rarity-mythic", flash: "rgba(236,72,153,0.8)", title: "MYTHIC SUMMON!" },
  LR: { border: "border-amber-400", flash: "rgba(253,224,71,0.9)", title: "LEGENDARY SUMMON!" },
};

const BASE_STAGGER_S = 0.12;
const FINALE_PAUSE_S = 0.55;

/** Owns the reveal sequencing for one pull batch. Given a fresh `key` per batch by the parent
 * (below), it mounts with revealedCount at 0 for free instead of needing an effect to reset it —
 * the only setState left in the timer effect happens inside setTimeout callbacks, not
 * synchronously in the effect body. */
function RevealCards({ ordered, onClose }: { ordered: Creature[]; onClose: () => void }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const isSingle = ordered.length === 1;
  const bestRarity = ordered[ordered.length - 1].rarity;
  const bestTitle = RARITY_REVEAL[bestRarity].title;

  useEffect(() => {
    const timers = ordered.map((_, i) => {
      const isFinale = i === ordered.length - 1 && ordered.length > 1;
      const delay = (i * BASE_STAGGER_S + (isFinale ? FINALE_PAUSE_S : 0)) * 1000;
      return setTimeout(() => setRevealedCount((c) => Math.max(c, i + 1)), delay);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ordered` is stable for this component's whole lifetime (a fresh instance mounts per batch via the parent's `key`)
  }, []);

  return (
    <>
      {/* A colored flash tied to the finale's rarity — the "you know before you see it" beat
          every real gacha reveal leans on, timed to land right before the last card. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0] }}
        transition={{
          duration: 0.7,
          delay: isSingle ? 0.15 : (ordered.length - 1) * BASE_STAGGER_S + FINALE_PAUSE_S - 0.25,
        }}
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle, ${RARITY_REVEAL[bestRarity].flash} 0%, transparent 70%)` }}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl border border-arcade-border bg-arcade-panel p-4 shadow-xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h2
          className={cn("text-center font-arcade text-sm", bestRarity !== "Mythic" && "glow-text-gold")}
          style={bestRarity === "Mythic" ? { textShadow: "0 0 8px rgba(219,39,119,0.7)", color: "#db2777" } : undefined}
        >
          {revealedCount < ordered.length
            ? "Summoning..."
            : bestTitle ?? (isSingle ? "Creature Summoned!" : `${ordered.length} Creatures Summoned!`)}
        </h2>

        <div
          className={cn(
            "mt-4 grid gap-3",
            isSingle ? "grid-cols-1 place-items-center" : "grid-cols-3 sm:grid-cols-4"
          )}
        >
          {ordered.map((creature, i) => {
            const revealed = i < revealedCount;
            const style = RARITY_REVEAL[creature.rarity];
            return (
              <motion.div
                key={`${creature.id}-${i}`}
                initial={{ scale: 0, rotate: -8, opacity: 0 }}
                animate={revealed ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 0.85, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-2xl border-2 bg-gradient-to-b p-3 text-center shadow-sm",
                  style.border,
                  ELEMENT_GRADIENT[creature.element],
                  isSingle && "w-40"
                )}
              >
                {revealed && (
                  <>
                    <RarityCardAura rarity={creature.rarity} />
                    <CreatureSprite
                      creature={creature}
                      spin={isSingle}
                      className={cn(isSingle ? "h-24 w-24" : "h-12 w-12", "drop-shadow-sm")}
                    />
                    <CreatureName creature={creature} className="truncate text-xs font-semibold" />
                    <RarityBadge rarity={creature.rarity} />
                  </>
                )}
              </motion.div>
            );
          })}
        </div>

        <PixelButton
          variant="gold"
          className="mt-5 w-full disabled:opacity-40"
          disabled={revealedCount < ordered.length}
          onClick={onClose}
        >
          Nice!
        </PixelButton>
      </motion.div>
    </>
  );
}

export function SummonRevealModal({ results, onClose }: SummonRevealModalProps) {
  // Worst-first, best-last — so a multi-pull's rarest hit is always the finale, not buried in
  // the middle of the grid or (worse) the very first thing you see.
  const ordered = results
    ? [...results].sort((a, b) => RARITY_SORT_ORDER[b.rarity] - RARITY_SORT_ORDER[a.rarity])
    : null;

  return (
    <AnimatePresence>
      {ordered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          {/* Keyed by the batch's own ids so a brand-new pull always mounts a fresh instance
              (revealedCount starting at 0) instead of needing an effect to reset it. */}
          <RevealCards key={ordered.map((c) => c.id).join("-")} ordered={ordered} onClose={onClose} />
        </div>
      )}
    </AnimatePresence>
  );
}
