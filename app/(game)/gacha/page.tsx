"use client";

import { useState } from "react";
import { GACHA_BANNERS, GACHA_CREATURE_POOL, ITEM_CATALOG } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { consumeItemOnServer, grantCreaturesOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { BannerSlider } from "@/components/gacha/BannerSlider";
import { SummonRevealModal } from "@/components/gacha/SummonRevealModal";
import { MenuBannerButton } from "@/components/ui/MenuBannerButton";
import { CrownIcon } from "@/components/icons/CrownIcon";
import type { Creature, GachaBanner, Rarity } from "@/types/game";

/** Pity: guarantees a rarity within N pulls on a given banner currency, so a run of bad luck has
 * a hard ceiling instead of the raw odds letting a player go arbitrarily long empty-handed.
 * Mythic ticket's 20 sits at ~3x its expected-pulls-to-hit (~6.7 pulls at its 15% rate) — a
 * generous safety net without making the base rate feel pointless. LR's 100 is intentionally a
 * much longer grind (~14x its ~7 pull expectation) since LR is the top tier and shouldn't be
 * trivial to guarantee. */
const PITY_CONFIG: Record<string, { threshold: number; targetRarity: Rarity }> = {
  "it-mythic-ticket": { threshold: 20, targetRarity: "Mythic" },
  "it-legendary-ticket": { threshold: 100, targetRarity: "LR" },
};

/** One roll's worth of the original odds table, factored out so rollCreatures can force a
 * specific rarity (the pity guarantee) without duplicating the odds themselves. */
function rollOnePull(creatures: Creature[], banner: GachaBanner, forceRarity: Rarity | null): Creature {
  const allLRs = creatures.filter(c => c.rarity === "LR");
  const allMythics = creatures.filter(c => c.rarity === "Mythic");
  const allSSRs = creatures.filter(c => c.rarity === "SSR");
  const allRares = creatures.filter(c => c.rarity === "Rare");

  const featuredLRs = allLRs.filter(c => banner.featuredIds.includes(c.id));
  const featuredMythics = allMythics.filter(c => banner.featuredIds.includes(c.id));

  if (forceRarity === "LR" && allLRs.length > 0) {
    const pool = featuredLRs.length > 0 ? featuredLRs : allLRs;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (forceRarity === "Mythic" && allMythics.length > 0) {
    const pool = featuredMythics.length > 0 ? featuredMythics : allMythics;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const roll = Math.random() * 100;
  let picked;

  if (banner.currencyItemId === "it-legendary-ticket") {
    if (roll < 5 && featuredLRs.length > 0) picked = featuredLRs[Math.floor(Math.random() * featuredLRs.length)];
    else if (roll < 7 && allLRs.length > 0) picked = allLRs[Math.floor(Math.random() * allLRs.length)];
    else if (roll < 17 && allMythics.length > 0) picked = allMythics[Math.floor(Math.random() * allMythics.length)];
    else if (roll < 47 && allSSRs.length > 0) picked = allSSRs[Math.floor(Math.random() * allSSRs.length)];
    else if (allRares.length > 0) picked = allRares[Math.floor(Math.random() * allRares.length)];
  } else if (banner.currencyItemId === "it-mythic-ticket") {
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
  return picked;
}

/** Rolls `count` pulls, advancing (and satisfying) the banner currency's pity counter one pull
 * at a time — a x10 multi-pull is 10 individual chances to trip the guarantee, not one. */
function rollCreatures(
  creatures: Creature[],
  count: number,
  banner: GachaBanner,
  startingPity: number
): { results: Creature[]; endingPity: number } {
  const config = banner.currencyItemId ? PITY_CONFIG[banner.currencyItemId] : undefined;
  const results: Creature[] = [];
  let pity = startingPity;

  for (let i = 0; i < count; i++) {
    pity += 1;
    const forceRarity = config && pity >= config.threshold ? config.targetRarity : null;
    const picked = rollOnePull(creatures, banner, forceRarity);
    results.push(picked);
    if (config && picked.rarity === config.targetRarity) {
      pity = 0;
    }
  }

  return { results, endingPity: pity };
}

export default function GachaPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const gems = useGameStore((s) => s.currencies.gems);
  const spendGems = useGameStore((s) => s.spendGems);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const grantCreature = useGameStore((s) => s.grantCreature);
  const tickMissionProgress = useGameStore((s) => s.tickMissionProgress);
  const gachaPityCounters = useGameStore((s) => s.gachaPityCounters);
  const setGachaPityCount = useGameStore((s) => s.setGachaPityCount);
  const [results, setResults] = useState<Creature[] | null>(null);

  const banner = GACHA_BANNERS[activeIndex];
  const pityInfo = banner.currencyItemId ? PITY_CONFIG[banner.currencyItemId] : undefined;
  const pityCount = (banner.currencyItemId && gachaPityCounters[banner.currencyItemId]) || 0;
  const currencyItem = banner.currencyItemId ? ITEM_CATALOG.find((i) => i.id === banner.currencyItemId) : undefined;

  const handleSummon = (count: number, cost: number) => {
    if (banner.currencyType === "item" && banner.currencyItemId) {
      if (!consumeItem(banner.currencyItemId, cost)) return;
      // consumeItem above only mutates local state — without this, the spent tickets were never
      // told to the server at all (syncProgressToServer doesn't cover items, only profile/
      // creatures/currencies), so a reload or relogin re-hydrated from the DB's still-unspent
      // count and the tickets silently "came back".
      consumeItemOnServer(banner.currencyItemId, cost);
    } else {
      if (!spendGems(cost)) return;
    }
    const startingPity = (banner.currencyItemId && gachaPityCounters[banner.currencyItemId]) || 0;
    const { results: rolled, endingPity } = rollCreatures(GACHA_CREATURE_POOL, count, banner, startingPity);
    if (banner.currencyItemId) setGachaPityCount(banner.currencyItemId, endingPity);
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

        {currencyItem && (
          <div className="mx-auto mt-2 flex w-fit items-center gap-2 rounded-full border border-arcade-border bg-arcade-panel-light px-3 py-1 lg:px-4 lg:py-1.5">
            <img src={currencyItem.icon} alt={currencyItem.name} className="h-6 w-6 lg:h-7 lg:w-7" />
            <span className="text-sm font-bold text-foreground lg:text-base">{getCurrencyAmount(banner)}</span>
            <span className="text-xs text-zinc-500 lg:text-sm">owned</span>
          </div>
        )}

        {pityInfo && (
          <div className="mx-auto mt-3 max-w-xs lg:max-w-sm">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500 lg:text-sm">
              <span>Pity to guaranteed {pityInfo.targetRarity}</span>
              <span className="font-bold text-gold-bright">{pityCount}/{pityInfo.threshold}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border border-arcade-border bg-arcade-panel-light">
              <div
                className="h-full bg-gradient-to-r from-gold to-gold-bright transition-all duration-500"
                style={{ width: `${Math.min(100, (pityCount / pityInfo.threshold) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-6 lg:gap-4">
          <MenuBannerButton
            image="/assets/events/summon_button.png"
            hasIcon={false}
            label="Summon"
            disabled={getCurrencyAmount(banner) < banner.singlePullCost}
            onClick={() => handleSummon(1, banner.singlePullCost)}
            caption={
              <span className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-600 lg:text-base">
                {currencyItem ? <img src={currencyItem.icon} alt="" className="h-4 w-4 lg:h-8 lg:w-8" /> : <CrownIcon className="h-4 w-4 lg:h-8 lg:w-8" />} {banner.singlePullCost}
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
              <span className="flex items-center justify-center gap-2 text-xs font-semibold text-zinc-600 lg:text-base">
                {currencyItem ? <img src={currencyItem.icon} alt="" className="h-4 w-4 lg:h-8 lg:w-8" /> : <CrownIcon className="h-4 w-4 lg:h-8 lg:w-8" />} {banner.multiPullCost}
              </span>
            }
          />
        </div>
      </div>

      <SummonRevealModal results={results} onClose={() => setResults(null)} />
    </div>
  );
}
