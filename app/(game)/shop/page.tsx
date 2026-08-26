"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store";
import { ITEM_CATALOG, SHOP_LISTINGS, STARTER_CREATURES, TAMER_CATALOG, type ShopListing } from "@/lib/gameData";
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
import { cn } from "@/lib/utils";

type Tab = "buy" | "sell";

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
  const buyListing = useGameStore((s) => s.buyListing);
  const sellItem = useGameStore((s) => s.sellItem);
  const [tab, setTab] = useState<Tab>("buy");
  const [busyId, setBusyId] = useState<string | null>(null);

  function handleBuy(listing: ShopListing) {
    setBusyId(listing.id);
    const bought = buyListing(listing.id);
    if (bought) {
      if (listing.grants.kind === "item") grantItemOnServer(listing.grants.itemId, 1);
      else if (listing.grants.kind === "creature") grantCreatureOnServer(listing.grants.creatureId);
      else grantTamerAvatarOnServer(listing.grants.tamerId);
      syncProgressToServer();
    }
    setBusyId(null);
  }

  function handleSell(itemId: string) {
    setBusyId(itemId);
    const sold = sellItem(itemId, 1);
    if (sold) {
      consumeItemOnServer(itemId, 1);
      syncProgressToServer();
    }
    setBusyId(null);
  }

  const sellableItems = ITEM_CATALOG.filter((i) => i.sellPriceGold);
  const ownedQuantityByItemId = new Map(ownedItems.map((o) => [o.itemId, o.quantity]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Shop</h1>
          <p className="mt-1 text-xs text-zinc-500">Buy items, Tamers, skins, and a few Digimon.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <CurrencyPill icon={<GoldCoinIcon className="h-3.5 w-3.5" />} value={currencies.gold} />
          <CurrencyPill icon={<CrownIcon className="h-3.5 w-3.5" />} value={currencies.gems} />
        </div>
      </div>

      <div className="flex gap-1.5">
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-4 py-1.5 font-arcade text-[10px] uppercase tracking-wide transition-colors",
              tab === t
                ? "border-gold bg-gold/10 text-gold-bright"
                : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:text-foreground"
            )}
          >
            {t === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      {tab === "buy" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {SHOP_LISTINGS.map((listing) => {
            const gold = listing.price.gold ?? 0;
            const gems = listing.price.gems ?? 0;
            const affordable = currencies.gold >= gold && currencies.gems >= gems;
            return (
              <GlowPanel key={listing.id} accent="none" className="flex flex-col items-center gap-1.5 p-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light">
                  <ListingIcon listing={listing} />
                </div>
                <p className="truncate text-[11px] font-semibold text-foreground">{listingName(listing)}</p>
                <RarityBadge rarity={listing.rarity} />
                <p className="text-[9px] text-zinc-500">{listing.description}</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-mono text-[10px] font-semibold",
                    affordable ? "text-foreground" : "text-red-500"
                  )}
                >
                  {gold > 0 && (
                    <>
                      <GoldCoinIcon className="h-3 w-3" /> {gold}
                    </>
                  )}
                  {gems > 0 && (
                    <>
                      <CrownIcon className="h-3 w-3" /> {gems}
                    </>
                  )}
                </span>
                <PixelButton
                  size="sm"
                  variant="gold"
                  className="w-full"
                  disabled={!affordable || busyId === listing.id}
                  onClick={() => handleBuy(listing)}
                >
                  Buy
                </PixelButton>
              </GlowPanel>
            );
          })}
        </div>
      ) : sellableItems.length === 0 ? (
        <GlowPanel accent="none" className="flex h-32 items-center justify-center text-xs text-zinc-500">
          Nothing sellable yet.
        </GlowPanel>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {sellableItems.map((item) => {
            const owned = ownedQuantityByItemId.get(item.id) ?? 0;
            return (
              <GlowPanel key={item.id} accent="none" className="flex flex-col items-center gap-1.5 p-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light">
                  <ItemIcon item={item} className="h-9 w-9" />
                </div>
                <p className="truncate text-[11px] font-semibold text-foreground">{item.name}</p>
                <span className="rounded-full border border-gold/60 bg-gold/10 px-1.5 py-0.5 font-arcade text-[8px] font-semibold text-gold-bright">
                  ×{owned} owned
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-foreground">
                  <GoldCoinIcon className="h-3 w-3" /> {item.sellPriceGold}
                </span>
                <PixelButton
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  disabled={owned === 0 || busyId === item.id}
                  onClick={() => handleSell(item.id)}
                >
                  Sell 1
                </PixelButton>
              </GlowPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
