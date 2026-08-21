"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percent: number;
  color?: "hp" | "energy" | "exp" | "gold";
  label?: string;
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
  showPercentText = false,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-500">
          <span>{label}</span>
          {showPercentText && <span>{clamped}%</span>}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-arcade-border bg-arcade-panel-light">
        <motion.div
          className={cn("h-full", colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
