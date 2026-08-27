import type { Rarity } from "@/types/game";
import { cn } from "@/lib/utils";

const rarityStyles: Record<Rarity, string> = {
  Common: "bg-rarity-common",
  Rare: "bg-rarity-rare",
  SSR: "bg-rarity-ssr",
  Mythic: "bg-rarity-mythic",
  // LR is the top rarity, above Mythic — a shimmering prismatic gradient (see .badge-lr-shimmer
  // in globals.css) instead of a flat color, so it visibly reads as a cut above Mythic's badge.
  LR: "badge-lr-shimmer",
};

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-arcade text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm",
        rarityStyles[rarity],
        className
      )}
    >
      {rarity}
    </span>
  );
}
