"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ClipboardList, X } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { NAV_GROUPS } from "@/lib/navigation";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { NewBadge } from "@/components/ui/NewBadge";
import { DailyTaskList } from "@/components/hub/DailyTaskList";
import { useT } from "@/lib/i18n/useT";

const RAIL_ITEMS = [
  ...(NAV_GROUPS.find((g) => g.titleKey === "nav.collection")?.items ?? []),
  ...(NAV_GROUPS.find((g) => g.titleKey === "nav.social")?.items ?? []),
];

/** Mobile Hub's secondary navigation — Monsters/Formations/Inventory/Tamer/Shop/Trophies/Friends/
 * Guild/Missions. Used to live as two columns pinned on top of the hero banner (top-3 left/right),
 * squeezing the promo art into a narrow center strip and fighting it for attention. Moved down here
 * as its own horizontally-scrolling rail instead — same "row of small icon+label chips below the
 * banner" pattern real gacha home screens use (Dokkan's own Missions/News/Character-List strip),
 * so the hero gets its full width back and this stays reachable without cramming 9 buttons onto it. */
export function QuickAccessRail() {
  const t = useT();
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dailyTasks = useGameStore((s) => s.dailyTasks);
  const hasClaimableMission = dailyTasks.some((task) => task.progress >= task.target && !task.claimed);
  const hasUnseenInventory = useGameStore((s) => s.hasUnseenInventory);
  const hasUnseenTamer = useGameStore((s) => s.hasUnseenTamer);
  const pendingGuildInvitesCount = useGameStore((s) => s.pendingGuildInvitesCount);

  const hasBadge = (href: string) => {
    if (href === "/inventory") return hasUnseenInventory;
    if (href === "/tamer") return hasUnseenTamer;
    if (href === "/guild") return pendingGuildInvitesCount > 0;
    return false;
  };

  // Nothing in this row hinted it scrolled at all — reported live: a player never noticed Friends/
  // Guild/Missions existed past Trophies, since the row just stopped at the edge of the phone
  // screen like a complete, unscrollable set. Two cues fix that without needing an explicit
  // "scroll me" label: a one-time native scroll nudge right after mount (peeks the next chip, then
  // settles back), and a persistent edge fade + chevron that only renders while there's still
  // unscrolled content to the right — both disappear on their own once the row is fully scrolled.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 4) return;
    const nudge = setTimeout(() => {
      el.scrollTo({ left: 56, behavior: "smooth" });
      setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 550);
    }, 500);
    return () => clearTimeout(nudge);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const updateAtEnd = () => setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    updateAtEnd();
    el.addEventListener("scroll", updateAtEnd, { passive: true });
    window.addEventListener("resize", updateAtEnd);
    return () => {
      el.removeEventListener("scroll", updateAtEnd);
      window.removeEventListener("resize", updateAtEnd);
    };
  }, []);

  return (
    <>
      <div className="relative">
        <div ref={scrollerRef} className="scrollbar-hidden -mx-3 flex gap-2.5 overflow-x-auto px-3 pb-1 pt-3">
          {RAIL_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="shrink-0">
              <GlowPanel
                accent="none"
                className="flex w-16 flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2.5 transition-colors active:scale-95"
              >
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold-bright">
                  <item.icon className="h-4 w-4" />
                  {hasBadge(item.href) && <NewBadge className="-right-1 -top-1 h-3.5 w-3.5" />}
                </span>
                <span className="w-full truncate text-center font-arcade text-[7px] uppercase tracking-wide text-zinc-600">
                  {t(item.labelKey)}
                </span>
              </GlowPanel>
            </Link>
          ))}
          <button type="button" onClick={() => setMissionsOpen(true)} className="shrink-0">
            <GlowPanel
              accent="none"
              className="flex w-16 flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2.5 transition-colors active:scale-95"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-neon/10 text-neon-ink">
                <ClipboardList className="h-4 w-4" />
                {hasClaimableMission && <NewBadge className="-right-1 -top-1 h-3.5 w-3.5" />}
              </span>
              <span className="w-full truncate text-center font-arcade text-[7px] uppercase tracking-wide text-zinc-600">
                {t("hub.missions_label")}
              </span>
            </GlowPanel>
          </button>
        </div>

        {!atEnd && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-end bg-gradient-to-l from-arcade-bg to-transparent pr-0.5">
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 shadow-sm"
            >
              <ChevronRight className="h-3.5 w-3.5 text-gold-bright" />
            </motion.div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {missionsOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMissionsOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative max-h-[75vh] w-full max-w-md overflow-y-auto"
            >
              <button
                onClick={() => setMissionsOpen(false)}
                aria-label={t("common.close")}
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-500 shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <DailyTaskList />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
