"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useGameStore } from "@/lib/store";
import { creatureSellValue, sortCreaturesByRarity } from "@/lib/gameData";
import { sellCreatureOnServer } from "@/lib/syncProgress";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { BackButton } from "@/components/ui/BackButton";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { CreatureName } from "@/components/ui/CreatureName";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";

export default function SellMonsterPage() {
  const t = useT();
  const creatures = useGameStore((s) => s.creatures);
  const sellCreature = useGameStore((s) => s.sellCreature);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const getQuantity = (id: string, max: number) => Math.min(quantities[id] || 1, Math.max(1, max));
  const updateQuantity = (id: string, delta: number, max: number) => {
    setQuantities((prev) => {
      const next = Math.max(1, Math.min((prev[id] || 1) + delta, max));
      return { ...prev, [id]: next };
    });
  };

  const handleSell = (creatureId: string, quantity: number) => {
    setBusyId(creatureId);
    const sold = sellCreature(creatureId, quantity);
    if (sold) {
      sellCreatureOnServer(creatureId, quantity);
      setQuantities((prev) => ({ ...prev, [creatureId]: 1 }));
      toast.success(`${t("formations.sold_success_prefix")}${quantity}${t("formations.sold_success_suffix")}`);
    } else {
      toast.error(t("formations.sell_error_last_copy"));
    }
    setBusyId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 lg:gap-4">
        <BackButton href="/formations" label={t("dex.back_to_formation_menu")} />
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">{t("formations.tile_sell_monster")}</h1>
          <p className="mt-1 text-xs text-zinc-500">{t("formations.trade_for_gold")}</p>
        </div>
      </div>

      {creatures.length === 0 ? (
        <GlowPanel accent="none" className="flex h-32 items-center justify-center text-xs text-zinc-500">
          {t("formations.nothing_to_sell")}
        </GlowPanel>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sortCreaturesByRarity(creatures).map((creature) => {
            const maxQuantity = creature.copies;
            const quantity = getQuantity(creature.id, maxQuantity);
            const unitValue = creatureSellValue(creature);
            return (
              <GlowPanel key={creature.id} accent="none" className="flex flex-col items-center gap-1.5 p-2.5 text-center sm:p-3">
                <div
                  className={cn(
                    "flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-gold bg-gradient-to-b pixel-frame",
                    ELEMENT_GRADIENT[creature.element]
                  )}
                >
                  <CreatureSprite creature={creature} className="h-4/5 w-4/5 text-gold-bright" />
                </div>
                <CreatureName creature={creature} className="truncate text-xs font-semibold sm:text-sm" />
                <div className="flex items-center gap-1.5">
                  <RarityBadge rarity={creature.rarity} />
                  {creature.copies > 1 && (
                    <span className="rounded-full border border-gold/60 bg-gold/10 px-1.5 py-0.5 font-arcade text-[8px] font-semibold text-gold-bright">
                      ×{creature.copies}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-foreground">
                  <GoldCoinIcon className="h-3 w-3" /> {unitValue}{t("formations.per_each_suffix")}
                </span>

                <div className="mt-1 flex w-full items-center justify-between overflow-hidden rounded-md border border-arcade-border bg-arcade-panel-dark">
                  <button
                    onClick={() => updateQuantity(creature.id, -1, maxQuantity)}
                    className="px-2 py-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center font-mono text-[10px] text-zinc-300">{quantity}</span>
                  <button
                    onClick={() => updateQuantity(creature.id, 1, maxQuantity)}
                    className="px-2 py-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
                    disabled={quantity >= maxQuantity}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <PixelButton
                  size="sm"
                  variant="ghost"
                  className="mt-1 w-full !text-red-500 hover:!bg-red-500/10"
                  disabled={busyId === creature.id}
                  onClick={() => handleSell(creature.id, quantity)}
                >
                  {t("formations.sell_prefix")}{quantity}
                </PixelButton>
              </GlowPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
