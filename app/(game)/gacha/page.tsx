"use client";

import { useState } from "react";
import { Gem } from "lucide-react";
import { GACHA_BANNERS } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { BannerSlider } from "@/components/gacha/BannerSlider";
import { SummonRevealModal } from "@/components/gacha/SummonRevealModal";
import { PixelButton } from "@/components/ui/PixelButton";
import type { Creature } from "@/types/game";

function rollCreatures(pool: Creature[], count: number): Creature[] {
  return Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);
}

export default function GachaPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const creatures = useGameStore((s) => s.creatures);
  const gems = useGameStore((s) => s.currencies.gems);
  const spendGems = useGameStore((s) => s.spendGems);
  const [results, setResults] = useState<Creature[] | null>(null);

  const banner = GACHA_BANNERS[activeIndex];

  const handleSummon = (count: number, cost: number) => {
    if (!spendGems(cost)) return;
    setResults(rollCreatures(creatures, count));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Summon</h1>
        <p className="mt-1 text-xs text-zinc-500">Swipe through the banners and try your luck.</p>
      </div>

      <div className="mx-auto max-w-lg lg:max-w-3xl">
        <BannerSlider banners={GACHA_BANNERS} activeIndex={activeIndex} onChange={setActiveIndex} />

        <div className="mt-3 text-center lg:mt-5">
          <h2 className="text-lg font-bold text-foreground lg:text-2xl">{banner.name}</h2>
          <p className="text-xs text-zinc-500 lg:text-sm">{banner.tagline}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-6 lg:gap-4">
          <PixelButton
            variant="ghost"
            disabled={gems < banner.singlePullCost}
            onClick={() => handleSummon(1, banner.singlePullCost)}
            className="flex flex-col items-center gap-1 py-3 lg:py-4 lg:text-base"
          >
            <span>Summon x1</span>
            <span className="flex items-center gap-1 text-[10px] font-normal normal-case text-zinc-500 lg:text-xs">
              <Gem className="h-3 w-3 text-neon" /> {banner.singlePullCost}
            </span>
          </PixelButton>
          <PixelButton
            variant="gold"
            disabled={gems < banner.multiPullCost}
            onClick={() => handleSummon(banner.multiPullCount, banner.multiPullCost)}
            className="flex flex-col items-center gap-1 py-3 lg:py-4 lg:text-base"
          >
            <span>Summon x{banner.multiPullCount}</span>
            <span className="flex items-center gap-1 text-[10px] font-normal normal-case text-white/80 lg:text-xs">
              <Gem className="h-3 w-3" /> {banner.multiPullCost}
            </span>
          </PixelButton>
        </div>
      </div>

      <SummonRevealModal results={results} onClose={() => setResults(null)} />
    </div>
  );
}
