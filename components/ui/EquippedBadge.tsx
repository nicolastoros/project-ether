import { cn } from "@/lib/utils";

/** Small "E" corner badge for an equipped item's icon — drop inside a `relative` icon box.
 * Currently only used for Tamer gear, where owning a piece means wearing it (see
 * types/game.ts's TamerEquipment comment), so every owned piece is equipped. */
export function EquippedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 font-arcade text-[9px] font-bold text-white shadow-sm ring-2 ring-white",
        className
      )}
      aria-label="Equipped"
      title="Equipped"
    >
      E
    </span>
  );
}
