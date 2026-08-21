import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";

interface CurrencyPillProps {
  icon: LucideIcon;
  value: number;
  iconClassName?: string;
  className?: string;
}

export function CurrencyPill({ icon: Icon, value, iconClassName, className }: CurrencyPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-arcade-border bg-arcade-panel-light px-3 py-1",
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClassName)} />
      <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
        {formatNumber(value)}
      </span>
    </div>
  );
}
