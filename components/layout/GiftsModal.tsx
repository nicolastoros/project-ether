"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Gift, Ticket } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { ITEM_CATALOG, STARTER_CREATURES } from "@/lib/gameData";
import { PixelButton } from "@/components/ui/PixelButton";

interface GiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GiftsModal({ isOpen, onClose }: GiftsModalProps) {
  const gifts = useGameStore((s) => s.gifts) || [];
  const claimGift = useGameStore((s) => s.claimGift);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const getGiftName = (gift: any) => {
    if (gift.type === "item" && gift.itemId) {
      return ITEM_CATALOG.find(i => i.id === gift.itemId)?.name || gift.itemId;
    }
    if (gift.type === "creature" && gift.creatureId) {
      return STARTER_CREATURES.find(c => c.id === gift.creatureId)?.name || gift.creatureId;
    }
    return "Unknown Gift";
  };

  const getGiftIcon = (gift: any) => {
    if (gift.type === "item" && gift.itemId) {
      return ITEM_CATALOG.find(i => i.id === gift.itemId)?.icon;
    }
    return undefined;
  };

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
            className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-3xl border border-arcade-border bg-arcade-panel shadow-xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-arcade-border bg-arcade-panel p-4">
              <h2 className="flex items-center gap-2 font-arcade text-lg glow-text-gold">
                <Gift className="h-5 w-5 text-gold-bright" />
                Gifts & Rewards
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {gifts.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-center">
                  <Gift className="mb-2 h-8 w-8 text-zinc-300" />
                  <p className="text-sm text-zinc-500">No gifts available.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gifts.map(gift => {
                    const icon = getGiftIcon(gift);
                    return (
                      <div key={gift.id} className="flex items-center gap-3 rounded-xl border border-arcade-border bg-arcade-panel-light p-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gold bg-gradient-to-br from-gold/20 to-gold/5 pixel-frame overflow-hidden">
                          {icon ? (
                            <img 
                              src={icon} 
                              alt="gift" 
                              className="h-8 w-8 object-contain" 
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('fallback-icon');
                              }} 
                            />
                          ) : (
                            <Gift className="h-6 w-6 text-gold" />
                          )}
                          <style jsx>{`
                            .fallback-icon::after {
                              content: '';
                              position: absolute;
                              width: 24px;
                              height: 24px;
                              background-color: #ffd700;
                              mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>') no-repeat center;
                              -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>') no-repeat center;
                            }
                          `}</style>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {getGiftName(gift)} <span className="text-xs text-gold-bright">x{gift.quantity}</span>
                          </p>
                          <p className="text-xs text-zinc-500">{gift.message}</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5">{new Date(gift.createdAt).toLocaleDateString()}</p>
                        </div>
                        <PixelButton variant="gold" size="sm" onClick={() => claimGift(gift.id)} className="px-3 py-1 text-xs">
                          Claim
                        </PixelButton>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {gifts.length > 0 && (
              <div className="border-t border-arcade-border bg-arcade-panel p-4">
                <PixelButton
                  variant="gold"
                  className="w-full"
                  onClick={() => {
                    gifts.forEach(g => claimGift(g.id));
                  }}
                >
                  Claim All
                </PixelButton>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
