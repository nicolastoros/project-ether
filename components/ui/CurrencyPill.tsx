import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

interface CurrencyPillProps {
  /** An already-rendered icon element, e.g. <GoldCoinIcon className="h-3.5 w-3.5" /> or a Lucide
   * icon like <Coins className="h-3.5 w-3.5" /> — size it directly rather than via iconClassName. */
  icon: ReactNode;
  value: number;
  className?: string;
}

export function CurrencyPill({ icon, value, className }: CurrencyPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-arcade-border bg-arcade-panel-light px-3 py-1",
        className
      )}
    >
      {icon}
      <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
        {formatNumber(value)}
      </span>
    </div>
  );
}
