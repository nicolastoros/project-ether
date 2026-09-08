"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Lock, Star, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { useGameStore } from "@/lib/store";
import { ITEM_CATALOG } from "@/lib/gameData";
import { syncProgressToServer } from "@/lib/syncProgress";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn } from "@/lib/utils";

interface DailyLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DailyLoginStatus {
  today: string;
  dayOfMonth: number;
  claimedDates: string[];
  claimedToday: boolean;
  todayReward: { itemId: string; quantity: number }[];
}

const DAYS_IN_CALENDAR = 30;

function itemIcon(itemId: string): string | undefined {
  return ITEM_CATALOG.find((i) => i.id === itemId)?.icon;
}
function itemName(itemId: string): string {
  return ITEM_CATALOG.find((i) => i.id === itemId)?.name ?? itemId;
}

/** A 30-day monthly login calendar — every day grants a full spread of Orbs + 5 Mythic Tickets,
 * every 5th day additionally grants 20 Legendary Tickets. Deliberately server-driven end to end
 * (see app/api/user/daily-login/*): the reward is real currency, and both "today" and "already
 * claimed" have to be server truth or a player could just edit their system clock (or replay a
 * claim) to collect every day's reward at once. Missing a day isn't recoverable — that cell just
 * renders as "missed" once its date is in the past and wasn't claimed, exactly as asked: no
 * catch-up. */
export function DailyLoginModal({ isOpen, onClose }: DailyLoginModalProps) {
  const grantItem = useGameStore((s) => s.grantItem);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<DailyLoginStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/user/daily-login");
      setStatus(res.ok ? await res.json() : null);
      setLoading(false);
    })();
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleClaim = async () => {
    if (!status || status.claimedToday || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch("/api/user/daily-login/claim", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.granted) {
        toast.error(data.granted === false ? "Already claimed today!" : "Couldn't claim right now.");
        setStatus((s) => (s ? { ...s, claimedToday: true, claimedDates: [...s.claimedDates, s.today] } : s));
        return;
      }
      const items: { itemId: string; quantity: number }[] = data.items;
      items.forEach((it) => grantItem(it.itemId, it.quantity));
      syncProgressToServer();
      setStatus((s) => (s ? { ...s, claimedToday: true, claimedDates: [...s.claimedDates, s.today] } : s));
      toast.success("Daily Login reward claimed!");
    } finally {
      setClaiming(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-arcade-border bg-arcade-panel shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-arcade-border p-5">
              <h2 className="flex items-center gap-2 font-arcade text-lg glow-text-gold">
                <CalendarDays className="h-6 w-6" /> Daily Login Rewards
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-arcade-border text-zinc-500 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {loading || !status ? (
                <p className="py-10 text-center text-sm text-zinc-500">Loading...</p>
              ) : (
                <>
                  <p className="mb-4 text-center text-sm text-zinc-500">
                    Log in every day for Orbs and Tickets — every 5th day adds a Legendary Ticket bonus.
                    Miss a day and it&apos;s gone, so don&apos;t skip!
                  </p>

                  <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-6 sm:gap-3">
                    {Array.from({ length: DAYS_IN_CALENDAR }, (_, i) => i + 1).map((day) => {
                      const dateStr = status.today.slice(0, 8) + String(day).padStart(2, "0");
                      const isBonus = day % 5 === 0;
                      const isClaimed = status.claimedDates.includes(dateStr);
                      const isToday = day === status.dayOfMonth;
                      const isFuture = day > status.dayOfMonth;
                      const isMissed = !isFuture && !isToday && !isClaimed;

                      return (
                        <div
                          key={day}
                          className={cn(
                            "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center",
                            isToday && !isClaimed && "border-gold bg-gold/10 shadow-[0_0_0_2px_rgba(255,184,77,0.3)]",
                            isClaimed && "border-emerald-400/50 bg-emerald-400/10",
                            isMissed && "border-arcade-border bg-arcade-panel-light opacity-40",
                            isFuture && "border-arcade-border bg-arcade-panel-light opacity-70"
                          )}
                        >
                          {isBonus && (
                            <Star className="absolute -right-1.5 -top-1.5 h-5 w-5 fill-gold-bright text-gold-bright drop-shadow" />
                          )}
                          <span className="font-arcade text-xs font-semibold text-zinc-500 sm:text-sm">D{day}</span>
                          {isClaimed ? (
                            <Check className="h-6 w-6 text-emerald-500" />
                          ) : isMissed ? (
                            <X className="h-5 w-5 text-zinc-400" />
                          ) : isFuture ? (
                            <Lock className="h-5 w-5 text-zinc-400" />
                          ) : (
                            <span className="h-5 w-5 animate-pulse rounded-full bg-gold-bright" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl border border-arcade-border bg-arcade-panel-light p-4">
                    <p className="mb-3 text-center font-arcade text-xs uppercase tracking-wide text-zinc-500">
                      Today&apos;s Reward (Day {status.dayOfMonth}{status.dayOfMonth % 5 === 0 ? " — Bonus!" : ""})
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {status.todayReward
                        .filter((it) => it.itemId.includes("ticket"))
                        .map((it) => (
                          <div
                            key={it.itemId}
                            className="flex items-center gap-1.5 rounded-full border border-arcade-border bg-arcade-panel px-3 py-1.5"
                          >
                            {itemIcon(it.itemId) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={itemIcon(it.itemId)} alt="" className="h-6 w-6 object-contain" />
                            )}
                            <span className="text-xs font-semibold text-foreground">
                              {itemName(it.itemId)} ×{it.quantity}
                            </span>
                          </div>
                        ))}
                      <div className="flex items-center gap-1.5 rounded-full border border-arcade-border bg-arcade-panel px-3 py-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          + every Orb type (300 / 150 / 50)
                        </span>
                      </div>
                    </div>
                  </div>

                  <PixelButton
                    className="mt-5 w-full py-3 text-sm"
                    variant={status.claimedToday ? "ghost" : "gold"}
                    disabled={status.claimedToday || claiming}
                    onClick={handleClaim}
                  >
                    {status.claimedToday ? "Claimed for today" : claiming ? "Claiming..." : "Claim Today's Reward"}
                  </PixelButton>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
