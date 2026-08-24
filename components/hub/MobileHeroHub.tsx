"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, X, type LucideIcon } from "lucide-react";
import { useActiveCreature, useGameStore } from "@/lib/store";
import { NAV_GROUPS } from "@/lib/navigation";
import { ELEMENT_HERO_GRADIENT } from "@/lib/elementVisuals";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { DailyTaskList } from "@/components/hub/DailyTaskList";
import { cn } from "@/lib/utils";

const COLLECTION_RAIL = NAV_GROUPS.find((g) => g.title === "Collection")?.items ?? [];
const SOCIAL_RAIL = NAV_GROUPS.find((g) => g.title === "Social")?.items ?? [];
const PLAY_MODES = (NAV_GROUPS.find((g) => g.title === "Play")?.items ?? []).filter(
  (item) => item.href !== "/hub"
);

interface RailButtonProps {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: boolean;
}

function RailButton({ label, icon: Icon, href, onClick, badge }: RailButtonProps) {
  const content = (
    <>
      <span className="relative">
        <Icon className="h-4 w-4 text-foreground" />
        {badge && (
          <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 font-arcade text-[7px] text-white ring-2 ring-white">
            !
          </span>
        )}
      </span>
      <span className="font-arcade text-[7px] uppercase tracking-wide text-zinc-600">{label}</span>
    </>
  );
  const className =
    "flex flex-col items-center gap-1 rounded-2xl border border-white/60 bg-white/85 px-2 py-2 shadow-sm backdrop-blur-sm transition-transform active:scale-95";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className="rounded-3xl border border-arcade-border bg-arcade-panel/95 p-3 shadow-xl backdrop-blur-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="font-arcade text-[10px] glow-text-gold">{title}</p>
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-arcade-border text-zinc-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </motion.div>
  );
}

export function MobileHeroHub() {
  const creature = useActiveCreature();
  const dailyTasks = useGameStore((s) => s.dailyTasks);
  const [modesOpen, setModesOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const hasClaimableMission = dailyTasks.some((t) => t.progress >= t.target && !t.claimed);

  return (
    <div
      className={cn(
        "relative h-[min(72vh,600px)] overflow-hidden rounded-b-3xl bg-gradient-to-b",
        ELEMENT_HERO_GRADIENT[creature.element]
      )}
    >
      <motion.div
        aria-hidden
        className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-white/40 blur-2xl"
        animate={{ x: [0, 16, 0], y: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-6 top-24 h-24 w-24 rounded-full bg-white/30 blur-2xl"
        animate={{ x: [0, -14, 0], y: [0, 14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-arcade-bg via-arcade-bg/50 to-transparent" />

      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        {COLLECTION_RAIL.map((item) => (
          <RailButton key={item.href} {...item} />
        ))}
      </div>
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        {SOCIAL_RAIL.map((item) => (
          <RailButton key={item.href} {...item} />
        ))}
        <RailButton
          label="Missions"
          icon={ClipboardList}
          onClick={() => setMissionsOpen(true)}
          badge={hasClaimableMission}
        />
      </div>

      <div className="relative flex h-full flex-col items-center justify-end pb-24 pt-16">
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <CreatureSprite creature={creature} spin className="h-52 w-52 drop-shadow-2xl" />
        </motion.div>
        <div className="mt-1 text-center">
          <CreatureName creature={creature} className="font-arcade text-xs" />
          <p className="text-[10px] uppercase tracking-wide text-zinc-600">Stage {creature.stage} · Lv.{creature.level}</p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
        <AnimatePresence mode="wait">
          {modesOpen ? (
            <BottomSheet key="modes" title="Choose a mode" onClose={() => setModesOpen(false)}>
              <div className="grid grid-cols-2 gap-2">
                {PLAY_MODES.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 rounded-2xl border border-arcade-border bg-arcade-panel-light px-3 py-2.5 transition-colors active:border-gold"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gold-bright" />
                    <span className="font-arcade text-[9px] uppercase tracking-wide text-foreground">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </BottomSheet>
          ) : (
            <motion.button
              key="start"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setModesOpen(true)}
              className="mx-auto flex w-full max-w-[220px] items-center justify-center rounded-full border-b-[3px] border-black/15 bg-gold py-3.5 font-arcade text-sm font-semibold uppercase tracking-widest text-white shadow-lg glow-border-gold"
            >
              Start
            </motion.button>
          )}
        </AnimatePresence>
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
                aria-label="Close"
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-500 shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <DailyTaskList />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
