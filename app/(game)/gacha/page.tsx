"use client";

import { useState } from "react";
import { GACHA_BANNERS, GACHA_CREATURE_POOL } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { grantCreaturesOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { BannerSlider } from "@/components/gacha/BannerSlider";
import { SummonRevealModal } from "@/components/gacha/SummonRevealModal";
import { MenuBannerButton } from "@/components/ui/MenuBannerButton";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { TicketIcon } from "lucide-react";
import type { Creature, GachaBanner } from "@/types/game";

function rollCreatures(creatures: Creature[], count: number, banner: GachaBanner): Creature[] {
  const result: Creature[] = [];
  const allLRs = creatures.filter(c => c.rarity === "LR");
  const allMythics = creatures.filter(c => c.rarity === "Mythic");
  const allSSRs = creatures.filter(c => c.rarity === "SSR");
  const allRares = creatures.filter(c => c.rarity === "Rare");

  const featuredLRs = allLRs.filter(c => banner.featuredIds.includes(c.id));
  const featuredMythics = allMythics.filter(c => banner.featuredIds.includes(c.id));

  for (let i = 0; i < count; i++) {
    const roll = Math.random() * 100;
    let picked;

    if (banner.currencyItemId === "it-legendary-ticket") {
      if (roll < 5 && featuredLRs.length > 0) picked = featuredLRs[Math.floor(Math.random() * featuredLRs.length)];
      else if (roll < 7 && allLRs.length > 0) picked = allLRs[Math.floor(Math.random() * allLRs.length)];
      else if (roll < 17 && allMythics.length > 0) picked = allMythics[Math.floor(Math.random() * allMythics.length)];
      else if (roll < 47 && allSSRs.length > 0) picked = allSSRs[Math.floor(Math.random() * allSSRs.length)];
      else if (allRares.length > 0) picked = allRares[Math.floor(Math.random() * allRares.length)];
    } else if (banner.currencyItemId === "it-mythic-ticket") {
      // Mythic-ticket banner caps out at Mythic — LR (Omega, Abaddo, etc.) never drops here,
      // only from the dedicated LR banners.
      if (roll < 7 && featuredMythics.length > 0) picked = featuredMythics[Math.floor(Math.random() * featuredMythics.length)];
      else if (roll < 15 && allMythics.length > 0) picked = allMythics[Math.floor(Math.random() * allMythics.length)];
      else if (roll < 45 && allSSRs.length > 0) picked = allSSRs[Math.floor(Math.random() * allSSRs.length)];
      else if (allRares.length > 0) picked = allRares[Math.floor(Math.random() * allRares.length)];
    } else {
      if (roll < 3 && allMythics.length > 0) picked = allMythics[Math.floor(Math.random() * allMythics.length)];
      else if (roll < 15 && allSSRs.length > 0) picked = allSSRs[Math.floor(Math.random() * allSSRs.length)];
      else if (allRares.length > 0) picked = allRares[Math.floor(Math.random() * allRares.length)];
    }

    if (!picked) picked = creatures[0];
    
    result.push(picked);
  }
  return result;
}

export default function GachaPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const gems = useGameStore((s) => s.currencies.gems);
  const spendGems = useGameStore((s) => s.spendGems);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const grantCreature = useGameStore((s) => s.grantCreature);
  const tickMissionProgress = useGameStore((s) => s.tickMissionProgress);
  const [results, setResults] = useState<Creature[] | null>(null);

  const banner = GACHA_BANNERS[activeIndex];

  const handleSummon = (count: number, cost: number) => {
    if (banner.currencyType === "item" && banner.currencyItemId) {
      if (!consumeItem(banner.currencyItemId, cost)) return;
    } else {
      if (!spendGems(cost)) return;
    }
    const rolled = rollCreatures(GACHA_CREATURE_POOL, count, banner);
    rolled.forEach(c => grantCreature(c.id));
    // Persisting the pull itself was missing entirely — rolled creatures only ever lived in local
    // state, silently vanishing on the next refresh (same class of bug as the gift-claim issue
    // fixed earlier). Batched (not one grantCreatureOnServer call per pull) since a x10 pull can
    // easily hit BigQuery's per-table concurrent-DML limit — see grantCreaturesOnServer's comment.
    grantCreaturesOnServer(rolled.map((c) => c.id));
    tickMissionProgress("task-gacha");
    syncProgressToServer();
    setResults(rolled);
  };

  const getCurrencyAmount = (b: GachaBanner) => {
    if (b.currencyType === "item" && b.currencyItemId) {
      return ownedItems.find(i => i.itemId === b.currencyItemId)?.quantity || 0;
    }
    return gems;
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
          <MenuBannerButton
            image="/assets/events/summon_button.png"
            hasIcon={false}
            label="Summon"
            disabled={getCurrencyAmount(banner) < banner.singlePullCost}
            onClick={() => handleSummon(1, banner.singlePullCost)}
            caption={
              <span className="flex items-center justify-center gap-1 text-[10px] font-normal text-zinc-500 lg:text-xs">
                {banner.currencyType === "item" ? <TicketIcon className="h-3 w-3" /> : <CrownIcon className="h-3 w-3" />} {banner.singlePullCost}
              </span>
            }
          />
          <MenuBannerButton
            image="/assets/events/summon_button.png"
            hasIcon={false}
            label="Multi-Summon"
            disabled={getCurrencyAmount(banner) < banner.multiPullCost}
            onClick={() => handleSummon(banner.multiPullCount, banner.multiPullCost)}
            caption={
              <span className="flex items-center justify-center gap-1 text-[10px] font-normal text-zinc-500 lg:text-xs">
                {banner.currencyType === "item" ? <TicketIcon className="h-3 w-3" /> : <CrownIcon className="h-3 w-3" />} {banner.multiPullCost}
              </span>
            }
          />
        </div>
      </div>

      <SummonRevealModal results={results} onClose={() => setResults(null)} />
    </div>
  );
}
