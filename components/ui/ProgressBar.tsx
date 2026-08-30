"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percent: number;
  color?: "hp" | "energy" | "exp" | "gold";
  label?: React.ReactNode;
  innerText?: string;
  showPercentText?: boolean;
  className?: string;
}

const colorClasses: Record<NonNullable<ProgressBarProps["color"]>, string> = {
  hp: "bg-gradient-to-r from-red-600 to-red-400",
  energy: "bg-gradient-to-r from-neon/70 to-neon",
  exp: "bg-gradient-to-r from-violet-600 to-violet-400",
  gold: "bg-gradient-to-r from-gold to-gold-bright",
};

export function ProgressBar({
  percent,
  color = "exp",
  label,
  innerText,
  showPercentText = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-200 font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
          <span>{label}</span>
          {showPercentText && <span>{clamped}%</span>}
        </div>
      )}
      <div className={cn("relative w-full overflow-hidden rounded-full border border-arcade-border bg-arcade-panel-light", innerText ? "h-3.5" : "h-2.5")}>
        <motion.div
          className={cn("h-full", colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
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
