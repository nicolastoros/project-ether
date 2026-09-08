"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store";
import { EXCHANGE_COST, EXCHANGE_CREATURE_IDS, ITEM_CATALOG, SHOP_LISTINGS, STARTER_CREATURES, TAMER_CATALOG, type ShopListing } from "@/lib/gameData";
import {
  consumeItemOnServer,
  grantCreatureOnServer,
  grantItemOnServer,
  grantTamerAvatarOnServer,
  syncProgressToServer,
} from "@/lib/syncProgress";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { TamerSprite } from "@/components/ui/TamerSprite";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { Plus, Minus } from "lucide-react";
import { cn, todayDateString } from "@/lib/utils";

type Tab = "buy" | "sell" | "exchange";

function listingName(listing: ShopListing): string {
  const { grants } = listing;
  if (grants.kind === "item") {
    const itemId = grants.itemId;
    return ITEM_CATALOG.find((i) => i.id === itemId)?.name ?? listing.id;
  }
  if (grants.kind === "creature") {
    const creatureId = grants.creatureId;
    return STARTER_CREATURES.find((c) => c.id === creatureId)?.name ?? listing.id;
  }
  const tamerId = grants.tamerId;
  return TAMER_CATALOG.find((t) => t.id === tamerId)?.name ?? listing.id;
}

function ListingIcon({ listing }: { listing: ShopListing }) {
  const { grants } = listing;
  if (grants.kind === "item") {
    const itemId = grants.itemId;
    const item = ITEM_CATALOG.find((i) => i.id === itemId);
    if (!item) return null;
    return <ItemIcon item={item} className="h-9 w-9" />;
  }
  if (grants.kind === "creature") {
    const creatureId = grants.creatureId;
    const creature = STARTER_CREATURES.find((c) => c.id === creatureId);
    if (!creature) return null;
    return <CreatureSprite creature={creature} className="h-9 w-9" />;
  }
  const tamerId = grants.tamerId;
  const tamer = TAMER_CATALOG.find((t) => t.id === tamerId);
  if (!tamer) return null;
  return <TamerSprite spriteFolder={tamer.spriteFolder} name={tamer.name} className="h-9 w-9" />;
}

export default function ShopPage() {
  const currencies = useGameStore((s) => s.currencies);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const creatures = useGameStore((s) => s.creatures);
  const profile = useGameStore((s) => s.profile);
  const buyListing = useGameStore((s) => s.buyListing);
  const sellItem = useGameStore((s) => s.sellItem);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const grantCreature = useGameStore((s) => s.grantCreature);
  const [tab, setTab] = useState<Tab>("buy");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>({});

  const getBuyQuantity = (id: string) => buyQuantities[id] || 1;
  const getSellQuantity = (id: string) => sellQuantities[id] || 1;

  // ShopListing.dailyLimit (e.g. Chicken: 6/day) — mirrors ensureFreshShopPurchases in
  // lib/store.ts so the displayed "left today" count matches what buyListing will actually
  // enforce, including the same local-midnight reset.
  const purchasedToday = (listingId: string) =>
    profile.dailyShopPurchasesDate === todayDateString() ? profile.dailyShopPurchases?.[listingId] ?? 0 : 0;
  const remainingToday = (listing: ShopListing) =>
    listing.dailyLimit === undefined ? Infinity : Math.max(0, listing.dailyLimit - purchasedToday(listing.id));

  const updateBuyQuantity = (id: string, delta: number, max: number) => {
    setBuyQuantities((prev) => ({ ...prev, [id]: Math.min(Math.max(1, (prev[id] || 1) + delta), Math.max(1, max)) }));
  };

  const updateSellQuantity = (id: string, delta: number, max: number) => {
    setSellQuantities((prev) => {
      const next = Math.max(1, (prev[id] || 1) + delta);
      return { ...prev, [id]: Math.min(next, max) };
    });
  };

  // Typing a quantity directly (e.g. "1000" for a bulk buy) instead of clicking +/- a thousand
  // times — clamped the same way the +/- buttons already are, just applied all at once. Kept
  // permissive while the field is mid-edit (an empty string, or "0" while backspacing toward a
  // new number) so the input doesn't fight the player's keystrokes; final clamping happens once
  // they actually settle on a value (the Buy/Sell buttons and price math already read the clamped
  // getBuyQuantity/getSellQuantity, not this raw field).
  const setBuyQuantityInput = (id: string, raw: string, max: number) => {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      setBuyQuantities((prev) => ({ ...prev, [id]: 1 }));
      return;
    }
    setBuyQuantities((prev) => ({ ...prev, [id]: Math.min(Math.max(1, Number(digits)), Math.max(1, max)) }));
  };

  const setSellQuantityInput = (id: string, raw: string, max: number) => {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      setSellQuantities((prev) => ({ ...prev, [id]: 1 }));
      return;
    }
    setSellQuantities((prev) => ({ ...prev, [id]: Math.min(Math.max(1, Number(digits)), Math.max(1, max)) }));
  };

  function handleBuy(listing: ShopListing) {
    const quantity = listing.grants.kind === "tamer" ? 1 : getBuyQuantity(listing.id);
    setBusyId(listing.id);
    const bought = buyListing(listing.id, quantity);
    if (bought) {
      if (listing.grants.kind === "item") grantItemOnServer(listing.grants.itemId, (listing.grants.amount ?? 1) * quantity);
      else if (listing.grants.kind === "creature") grantCreatureOnServer(listing.grants.creatureId, quantity);
      else grantTamerAvatarOnServer(listing.grants.tamerId);
      syncProgressToServer();
      setBuyQuantities((prev) => ({ ...prev, [listing.id]: 1 }));
    }
    setBusyId(null);
  }

  function handleSell(itemId: string) {
    const quantity = getSellQuantity(itemId);
    setBusyId(itemId);
    const sold = sellItem(itemId, quantity);
    if (sold) {
      consumeItemOnServer(itemId, quantity);
      syncProgressToServer();
      setSellQuantities((prev) => ({ ...prev, [itemId]: 1 }));
    }
    setBusyId(null);
  }

  function handleExchange(creatureId: string) {
    setBusyId(creatureId);
    if (consumeItem("it-exchange-coin", EXCHANGE_COST)) {
      grantCreature(creatureId, 1);
      consumeItemOnServer("it-exchange-coin", EXCHANGE_COST);
      grantCreatureOnServer(creatureId, 1);
      syncProgressToServer();
    }
    setBusyId(null);
  }

  const sellableItems = ITEM_CATALOG.filter((i) => i.sellPriceGold);
  const ownedQuantityByItemId = new Map(ownedItems.map((o) => [o.itemId, o.quantity]));
  const exchangeCoinBalance = ownedQuantityByItemId.get("it-exchange-coin") ?? 0;
  const exchangeCoinItem = ITEM_CATALOG.find((i) => i.id === "it-exchange-coin");
  const exchangeCreatures = EXCHANGE_CREATURE_IDS.map((id) => STARTER_CREATURES.find((c) => c.id === id)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold sm:text-xl lg:text-2xl">Shop</h1>
          <p className="mt-1 text-sm text-zinc-600 sm:text-base">Buy items, Tamers, skins, and a few Digimon.</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <CurrencyPill icon={<GoldCoinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.gold} />
          <CurrencyPill icon={<CrownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.gems} />
        </div>
      </div>

      <div className="flex gap-1.5 sm:gap-2">
        {(["buy", "sell", "exchange"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-4 py-1.5 font-arcade text-xs uppercase tracking-wide transition-colors sm:px-5 sm:py-2 sm:text-sm",
              tab === t
                ? "border-gold bg-gold text-white"
                : "border-arcade-border bg-arcade-panel-light text-zinc-600 hover:text-foreground"
            )}
          >
            {t === "buy" ? "Buy" : t === "sell" ? "Sell" : "Exchange"}
          </button>
        ))}
      </div>

      {tab === "exchange" && (
        <div className="flex items-center gap-2 rounded-xl border border-arcade-border bg-arcade-panel-light px-4 py-3 text-sm sm:gap-3 sm:px-5 sm:py-4 sm:text-base">
          {exchangeCoinItem && <ItemIcon item={exchangeCoinItem} className="h-6 w-6 sm:h-7 sm:w-7" />}
          <span className="font-semibold text-foreground">{exchangeCoinBalance} Exchange Coins</span>
          <span className="text-zinc-500">— each creature below costs {EXCHANGE_COST}</span>
        </div>
      )}

      {tab === "buy" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
          {SHOP_LISTINGS.map((listing) => {
            const remaining = remainingToday(listing);
            const soldOutToday = listing.dailyLimit !== undefined && remaining <= 0;
            const quantity =
              listing.grants.kind === "tamer" ? 1 : Math.min(getBuyQuantity(listing.id), Math.max(1, remaining));
            const gold = (listing.price.gold ?? 0) * quantity;
            const gems = (listing.price.gems ?? 0) * quantity;
            const affordable = currencies.gold >= gold && currencies.gems >= gems && !soldOutToday;
            return (
              <GlowPanel key={listing.id} accent="none" className="flex flex-col items-center gap-2 p-3 text-center sm:gap-2.5 sm:p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light sm:h-20 sm:w-20 lg:h-24 lg:w-24">
                  <ListingIcon listing={listing} />
                </div>
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">{listingName(listing)}</p>
                <RarityBadge rarity={listing.rarity} className="sm:px-2.5 sm:py-1 sm:text-xs lg:text-sm" />
                <p className="text-xs text-zinc-500 sm:text-sm">{listing.description}</p>
                {listing.dailyLimit !== undefined && (
                  <span className={cn("font-arcade text-[10px] uppercase tracking-wide", soldOutToday ? "text-red-500" : "text-zinc-500")}>
                    {remaining}/{listing.dailyLimit} left today
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-mono text-sm font-semibold sm:text-base",
                    affordable ? "text-foreground" : "text-red-500"
                  )}
                >
                  {gold > 0 && (
                    <>
                      <GoldCoinIcon className="h-4 w-4 sm:h-5 sm:w-5" /> {gold}
                    </>
                  )}
                  {gems > 0 && (
                    <>
                      <CrownIcon className="h-4 w-4 sm:h-5 sm:w-5" /> {gems}
                    </>
                  )}
                </span>
                {listing.grants.kind !== "tamer" && !soldOutToday && (
                  <div className="flex w-full items-center justify-between rounded-md border border-arcade-border bg-arcade-panel-dark overflow-hidden">
                    <button
                      onClick={() => updateBuyQuantity(listing.id, -1, remaining)}
                      className="px-2.5 py-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 sm:px-3 sm:py-2"
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={quantity}
                      onChange={(e) => setBuyQuantityInput(listing.id, e.target.value, remaining)}
                      className="w-12 border-0 bg-transparent text-center font-mono text-sm font-semibold text-foreground outline-none sm:text-base"
                    />
                    <button
                      onClick={() => updateBuyQuantity(listing.id, 1, remaining)}
                      className="px-2.5 py-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 sm:px-3 sm:py-2"
                      disabled={quantity >= remaining}
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                )}
                <PixelButton
                  size="sm"
                  variant="gold"
                  className="w-full mt-1 sm:py-2.5 sm:text-sm"
                  disabled={!affordable || busyId === listing.id}
                  onClick={() => handleBuy(listing)}
                >
                  {soldOutToday ? "Sold out today" : `Buy ${listing.grants.kind !== "tamer" ? quantity : ""}`}
                </PixelButton>
              </GlowPanel>
            );
          })}
        </div>
      ) : tab === "sell" ? (
        sellableItems.length === 0 ? (
          <GlowPanel accent="none" className="flex h-32 items-center justify-center text-xs text-zinc-500">
            Nothing sellable yet.
          </GlowPanel>
        ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
          {sellableItems.map((item) => {
            const owned = ownedQuantityByItemId.get(item.id) ?? 0;
            const maxQuantity = owned;
            const quantity = Math.min(getSellQuantity(item.id), Math.max(1, owned));
            const gold = (item.sellPriceGold ?? 0) * quantity;
            return (
              <GlowPanel key={item.id} accent="none" className="flex flex-col items-center gap-2 p-3 text-center sm:gap-2.5 sm:p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light sm:h-20 sm:w-20 lg:h-24 lg:w-24">
                  <ItemIcon item={item} className="h-11 w-11 sm:h-14 sm:w-14 lg:h-16 lg:w-16" />
                </div>
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">{item.name}</p>
                <span className="rounded-full bg-gold px-2.5 py-1 font-arcade text-xs font-bold text-white sm:text-sm">
                  ×{owned} owned
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground sm:text-base">
                  <GoldCoinIcon className="h-4 w-4 sm:h-5 sm:w-5" /> {gold}
                </span>

                <div className="flex w-full items-center justify-between rounded-md border border-arcade-border bg-arcade-panel-dark overflow-hidden mt-1">
                  <button
                    onClick={() => updateSellQuantity(item.id, -1, maxQuantity)}
                    className="px-2.5 py-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 sm:px-3 sm:py-2"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => setSellQuantityInput(item.id, e.target.value, maxQuantity)}
                    className="w-12 border-0 bg-transparent text-center font-mono text-sm text-zinc-300 outline-none sm:text-base"
                  />
                  <button
                    onClick={() => updateSellQuantity(item.id, 1, maxQuantity)}
                    className="px-2.5 py-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50 sm:px-3 sm:py-2"
                    disabled={quantity >= maxQuantity || maxQuantity === 0}
                  >
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>

                <PixelButton
                  size="sm"
                  variant="ghost"
                  className="w-full mt-1 sm:py-2.5 sm:text-sm"
                  disabled={owned === 0 || busyId === item.id}
                  onClick={() => handleSell(item.id)}
                >
                  Sell {quantity}
                </PixelButton>
              </GlowPanel>
            );
          })}
        </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
          {exchangeCreatures.map((exchangeCreature) => {
            // No cap on how many times this can be bought — copies matter for Hidden Potential
            // and Super Attack training, so redeeming a dupe is intentional, not a mistake.
            const copiesOwned = creatures.find((c) => c.id === exchangeCreature.id)?.copies ?? 0;
            const affordable = exchangeCoinBalance >= EXCHANGE_COST;
            return (
              <GlowPanel key={exchangeCreature.id} accent="none" className="flex flex-col items-center gap-2 p-3 text-center sm:gap-2.5 sm:p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light sm:h-24 sm:w-24 lg:h-28 lg:w-28">
                  <CreatureSprite creature={exchangeCreature} className="h-11 w-11 sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
                </div>
                <p className="truncate text-sm font-semibold text-foreground sm:text-base lg:text-lg">{exchangeCreature.name}</p>
                <RarityBadge rarity={exchangeCreature.rarity} className="sm:px-2.5 sm:py-1 sm:text-xs lg:text-sm" />
                {copiesOwned > 0 && (
                  <span className="rounded-full bg-gold px-2.5 py-1 font-arcade text-xs font-bold text-white sm:text-sm">
                    ×{copiesOwned} owned
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground sm:text-base">
                  {exchangeCoinItem && <ItemIcon item={exchangeCoinItem} className="h-4 w-4 sm:h-5 sm:w-5" />} {EXCHANGE_COST}
                </span>
                <PixelButton
                  size="sm"
                  variant="gold"
                  className="w-full mt-1 sm:py-2.5 sm:text-sm"
                  disabled={!affordable || busyId === exchangeCreature.id}
                  onClick={() => handleExchange(exchangeCreature.id)}
                >
                  Redeem
                </PixelButton>
              </GlowPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
