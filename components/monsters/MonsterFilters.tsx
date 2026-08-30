import { cn } from "@/lib/utils";
import { ELEMENT_ICON } from "@/lib/elementVisuals";
import type { Element, Rarity } from "@/types/game";
import { RarityBadge } from "@/components/ui/RarityBadge";

const ELEMENTS = Object.keys(ELEMENT_ICON) as Element[];
const RARITIES: Rarity[] = ["Common", "Rare", "SSR", "Mythic", "LR"];

export function ElementFilterGroup({
  selected,
  onToggle,
}: {
  selected: Set<Element>;
  onToggle: (el: Element) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Type</p>
      <div className="flex flex-col gap-1.5">
        {ELEMENTS.map((el) => {
          const Icon = ELEMENT_ICON[el];
          const active = selected.has(el);
          return (
            <button
              key={el}
              onClick={() => onToggle(el)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs transition-colors",
                active
                  ? "border-gold bg-gold/10 text-gold-bright"
                  : "border-arcade-border bg-arcade-panel-light text-zinc-600 hover:border-gold/60"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {el}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RarityLevelFilterGroup({
  selectedRarities,
  onToggleRarity,
  minLevel,
  maxLevel,
  onMinLevelChange,
  onMaxLevelChange,
}: {
  selectedRarities: Set<Rarity>;
  onToggleRarity: (r: Rarity) => void;
  minLevel: string;
  maxLevel: string;
  onMinLevelChange: (v: string) => void;
  onMaxLevelChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Rarity</p>
        <div className="flex flex-wrap gap-1.5">
          {RARITIES.map((r) => {
            const active = selectedRarities.has(r);
            return (
              <button key={r} onClick={() => onToggleRarity(r)} aria-pressed={active}>
                <RarityBadge rarity={r} className={cn("transition-opacity", !active && "opacity-35 grayscale")} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Level</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            placeholder="Min"
            value={minLevel}
            onChange={(e) => onMinLevelChange(e.target.value)}
            className="w-full rounded-lg border border-arcade-border bg-arcade-panel-light px-2 py-1.5 text-xs text-foreground outline-none focus:border-gold"
          />
          <span className="text-zinc-500">–</span>
          <input
            type="number"
            min={1}
            placeholder="Max"
            value={maxLevel}
            onChange={(e) => onMaxLevelChange(e.target.value)}
            className="w-full rounded-lg border border-arcade-border bg-arcade-panel-light px-2 py-1.5 text-xs text-foreground outline-none focus:border-gold"
          />
        </div>
      </div>
    </div>
  );
}
