"use client";

import { motion } from "framer-motion";

interface SegmentedHpBarProps {
  percent: number;
  label?: React.ReactNode;
  innerText?: string;
  /** The "100 bars of life" ask — purely a presentation detail over a normal large HP pool, not
   * 100 literal sequential mini-fights. Rendered as one repeating-gradient overlay instead of 100
   * real DOM ticks, for the identical visual read at zero extra render cost. */
  segments?: number;
}

/** Overclock's own boss HP bar (components/combat/CombatantCard.tsx's `segmentedHp` prop) — same
 * red gradient/label/innerText conventions as the shared ProgressBar, just with visible tick
 * marks so a boss with a very large HP pool still reads as "made of many bars", per the user's
 * own framing ("100 barras de vida"). */
export function SegmentedHpBar({ percent, label, innerText, segments = 100 }: SegmentedHpBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-600 font-semibold">
          <span>{label}</span>
        </div>
      )}
      <div className="relative w-full h-3.5 overflow-hidden rounded-full border border-arcade-border bg-arcade-panel-light">
        <motion.div
          className="h-full bg-gradient-to-r from-red-600 to-red-400"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent calc(100%/${segments} - 1px), rgba(0,0,0,0.35) calc(100%/${segments} - 1px), rgba(0,0,0,0.35) calc(100%/${segments}))`,
          }}
        />
        {innerText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[9px] leading-none font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] tracking-wider">
              {innerText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
