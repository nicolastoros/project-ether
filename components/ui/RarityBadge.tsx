import type { Rarity } from "@/types/game";
import { cn } from "@/lib/utils";

const rarityStyles: Record<Rarity, string> = {
  Common: "bg-rarity-common",
  Rare: "bg-rarity-rare",
  SSR: "bg-rarity-ssr",
  Mythic: "bg-rarity-mythic",
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
