"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Creature } from "@/types/game";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
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

export function SummonRevealModal({ results, onClose }: SummonRevealModalProps) {
  const isSingle = results?.length === 1;

  return (
    <AnimatePresence>
      {results && (
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
            className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl border border-arcade-border bg-arcade-panel p-4 shadow-xl"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-center font-arcade text-sm glow-text-gold">
              {isSingle ? "Creature Summoned!" : `${results.length} Creatures Summoned!`}
            </h2>

            <div
              className={cn(
                "mt-4 grid gap-3",
                isSingle ? "grid-cols-1 place-items-center" : "grid-cols-3 sm:grid-cols-4"
              )}
            >
              {results.map((creature, i) => (
                <motion.div
                  key={`${creature.id}-${i}`}
                  initial={{ scale: 0, rotate: -8, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 18 }}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-2xl border-2 border-gold bg-gradient-to-b p-3 text-center shadow-sm",
                    ELEMENT_GRADIENT[creature.element],
                    isSingle && "w-40"
                  )}
                >
                  <RarityCardAura rarity={creature.rarity} />
                  <CreatureSprite
                    creature={creature}
                    spin={isSingle}
                    className={cn(isSingle ? "h-24 w-24" : "h-12 w-12", "drop-shadow-sm")}
                  />
                  <CreatureName creature={creature} className="truncate text-xs font-semibold" />
                  <RarityBadge rarity={creature.rarity} />
                </motion.div>
              ))}
            </div>

            <PixelButton variant="gold" className="mt-5 w-full" onClick={onClose}>
              Nice!
            </PixelButton>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
