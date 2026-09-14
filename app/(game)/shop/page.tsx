"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Coins, Minus, Plus } from "lucide-react";
import { useGameStore } from "@/lib/store";
import {
  EXCHANGE_COST,
  EXCHANGE_CREATURE_IDS,
  ITEM_CATALOG,
  PREMIUM_SHOP_ITEMS,
  SHOP_LISTINGS,
  STARTER_CREATURES,
  TAMER_CATALOG,
  TAMER_EQUIPMENT_CATALOG,
  type ShopListing,
} from "@/lib/gameData";
import {
  consumeItemOnServer,
  grantCreatureOnServer,
  grantItemOnServer,
  grantTamerAvatarOnServer,
  grantTamerEquipmentOnServer,
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
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { cn, formatTamerStatBonus, thisWeekStartDateString, todayDateString } from "@/lib/utils";

// The Buy grid used to be one long, un-sectioned scroll of every listing. Split into browsable
// categories (a real marketplace layout) instead — "Featured" catches the two premium/gems-priced
// offers (the cosmetic Skin, the two gem-bought Creatures) that don't fit any of the other 4 named
// buckets, so nothing silently disappears from the shop. Armor and Exchange aren't derived from
// SHOP_LISTINGS at all (see below).
type BuySection = "featured" | "consumables" | "orbs" | "materials";
const SECTION_TABS: { id: BuySection | "armor" | "exchange" | "premium"; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "consumables", label: "Consumables" },
  { id: "orbs", label: "Orbs" },
  { id: "materials", label: "Materials" },
  { id: "armor", label: "Armor" },
  { id: "exchange", label: "Exchange" },
  { id: "premium", label: "Premium" },
];
type Tab = (typeof SECTION_TABS)[number]["id"] | "sell";

function categoryOf(listing: ShopListing): BuySection {
  const grants = listing.grants;
  if (grants.kind !== "item") return "featured"; // Tamer avatars — premium highlights
  const item = ITEM_CATALOG.find((i) => i.id === grants.itemId);
  if (!item) return "featured";
  if (item.icon?.includes("/orbs/")) return "orbs";
  if (item.category === "Skin") return "featured";
  if (item.category === "Evolution" || item.category === "Crafting") return "materials";
  return "consumables"; // Consumable, Quest, or anything else
}

const LISTINGS_BY_SECTION: Record<BuySection, ShopListing[]> = {
  featured: [],
  consumables: [],
  orbs: [],
  materials: [],
};
for (const listing of SHOP_LISTINGS) {
  LISTINGS_BY_SECTION[categoryOf(listing)].push(listing);
}

// Enough to fill 3 rows at the widest (4-col) breakpoint without an endless scroll — everything
// past this becomes a numbered page instead (see PageNumbers below), per the request to cap how
// much any one section shows at once.
const PAGE_SIZE = 12;

function paginate<T>(items: T[], page: number): { pageItems: T[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * PAGE_SIZE;
  return { pageItems: items.slice(start, start + PAGE_SIZE), totalPages, page: clamped };
}

function PageNumbers({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 pt-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-500 transition-colors hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full font-arcade text-[11px] font-semibold transition-colors",
            p === page ? "bg-gold text-white" : "border border-arcade-border bg-arcade-panel-light text-zinc-500 hover:text-foreground"
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        aria-label="Next page"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel-light text-zinc-500 transition-colors hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EmptyShopState({ label }: { label: string }) {
  return (
    <GlowPanel accent="none" className="flex h-32 items-center justify-center px-6 text-center text-xs text-zinc-500">
      {label}
    </GlowPanel>
  );
}

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

function isShopTab(value: string | null): value is Tab {
  return SECTION_TABS.some((s) => s.id === value) || value === "sell";
}

function ShopPageContent() {
  // Deep-link support for the TopStatusBar's "+" button next to the gems pill (?tab=premium) —
  // same mount-time-only pattern as EventsHub.tsx's own ?tab= link (isTabId there, isShopTab here).
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const currencies = useGameStore((s) => s.currencies);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const creatures = useGameStore((s) => s.creatures);
  const profile = useGameStore((s) => s.profile);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const buyListing = useGameStore((s) => s.buyListing);
  const sellItem = useGameStore((s) => s.sellItem);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const grantCreature = useGameStore((s) => s.grantCreature);
  const craftTamerEquipment = useGameStore((s) => s.craftTamerEquipment);
  const tickMissionProgress = useGameStore((s) => s.tickMissionProgress);
  const [tab, setTab] = useState<Tab>(isShopTab(initialTab) ? initialTab : "featured");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>({});
  const [sectionPage, setSectionPage] = useState<Partial<Record<Tab, number>>>({});

  const pageFor = (id: Tab) => sectionPage[id] ?? 1;
  const setPageFor = (id: Tab, page: number) => setSectionPage((prev) => ({ ...prev, [id]: page }));

  const getBuyQuantity = (id: string) => buyQuantities[id] || 1;
  const getSellQuantity = (id: string) => sellQuantities[id] || 1;

  // ShopListing.dailyLimit/weeklyLimit (e.g. Chicken: 6/day, Orbs: 10/week) — mirrors
  // ensureFreshShopPurchases/ensureFreshWeeklyShopPurchases in lib/store.ts so the displayed
  // "left today"/"left this week" count matches what buyListing will actually enforce, including
  // the same local-midnight / local-Monday reset.
  const limitInfoFor = (listing: ShopListing): { remaining: number; limit: number; period: "day" | "week" } | null => {
    if (listing.dailyLimit !== undefined) {
      const purchased = profile.dailyShopPurchasesDate === todayDateString() ? profile.dailyShopPurchases?.[listing.id] ?? 0 : 0;
      return { remaining: Math.max(0, listing.dailyLimit - purchased), limit: listing.dailyLimit, period: "day" };
    }
    if (listing.weeklyLimit !== undefined) {
      const purchased =
        profile.weeklyShopPurchasesDate === thisWeekStartDateString() ? profile.weeklyShopPurchases?.[listing.id] ?? 0 : 0;
      return { remaining: Math.max(0, listing.weeklyLimit - purchased), limit: listing.weeklyLimit, period: "week" };
    }
    return null;
  };

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

  function handleCraftArmor(itemId: string) {
    setBusyId(itemId);
    const crafted = craftTamerEquipment(itemId);
    if (crafted) {
      grantTamerEquipmentOnServer(itemId);
      tickMissionProgress("task-enhance");
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
  const ownedGearIds = new Set(tamerInventory.map((t) => t.id));

  function renderBuyListing(listing: ShopListing) {
    const limitInfo = limitInfoFor(listing);
    const remaining = limitInfo?.remaining ?? Infinity;
    const soldOut = limitInfo !== null && limitInfo.remaining <= 0;
    const periodLabel = limitInfo?.period === "week" ? "this week" : "today";
    const quantity = listing.grants.kind === "tamer" ? 1 : Math.min(getBuyQuantity(listing.id), Math.max(1, remaining));
    const gold = (listing.price.gold ?? 0) * quantity;
    const gems = (listing.price.gems ?? 0) * quantity;
    const affordable = currencies.gold >= gold && currencies.gems >= gems && !soldOut;
    return (
      <GlowPanel key={listing.id} accent="none" className="flex flex-col items-center gap-2 p-3 text-center sm:gap-2.5 sm:p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light sm:h-20 sm:w-20 lg:h-24 lg:w-24">
          <ListingIcon listing={listing} />
        </div>
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">{listingName(listing)}</p>
        <RarityBadge rarity={listing.rarity} className="sm:px-2.5 sm:py-1 sm:text-xs lg:text-sm" />
        <p className="text-xs text-zinc-500 sm:text-sm">{listing.description}</p>
        {limitInfo && (
          <span className={cn("font-arcade text-[10px] uppercase tracking-wide", soldOut ? "text-red-500" : "text-zinc-500")}>
            {limitInfo.remaining}/{limitInfo.limit} left {periodLabel}
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
        {listing.grants.kind !== "tamer" && !soldOut && (
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
          {soldOut ? `Sold out ${periodLabel}` : `Buy ${listing.grants.kind !== "tamer" ? quantity : ""}`}
        </PixelButton>
      </GlowPanel>
    );
  }

  function renderSellCard(item: (typeof sellableItems)[number]) {
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
  }

  function renderExchangeCard(exchangeCreature: (typeof exchangeCreatures)[number]) {
    // No cap on how many times this can be bought — copies matter for Hidden Potential and Super
    // Attack training, so redeeming a dupe is intentional, not a mistake.
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
  }

  // Armor isn't sold outright — it's earned (Campaign clears, Events > Challenge trials) or
  // crafted with Seal Coins. This section browses the whole TAMER_EQUIPMENT_CATALOG either way,
  // with a working Craft button for anything actually craftable, so "Armor" isn't a dead end.
  function renderArmorCard(gear: (typeof TAMER_EQUIPMENT_CATALOG)[number]) {
    const owned = ownedGearIds.has(gear.id);
    const canCraft = gear.source.kind === "craft" || gear.source.kind === "craft-item";
    const gearSource = gear.source;
    const affordable =
      gearSource.kind === "craft"
        ? currencies.sealCoins >= gearSource.sealCoinCost
        : gearSource.kind === "craft-item"
          ? gearSource.costs.every((cost) => (ownedQuantityByItemId.get(cost.itemId) ?? 0) >= cost.quantity)
          : false;
    return (
      <GlowPanel key={gear.id} accent={owned ? "gold" : "none"} className="flex flex-col items-center gap-2 p-3 text-center sm:gap-2.5 sm:p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light sm:h-20 sm:w-20 lg:h-24 lg:w-24">
          <Image
            src={gear.icon}
            alt=""
            width={64}
            height={64}
            className={cn("h-11 w-11 object-contain sm:h-14 sm:w-14", !owned && !canCraft && "opacity-40 grayscale")}
          />
        </div>
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">{gear.name}</p>
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">{gear.setName} · {gear.slot}</p>
        <RarityBadge rarity={gear.rarity} className="sm:px-2.5 sm:py-1 sm:text-xs" />
        {formatTamerStatBonus(gear.statBonus) && (
          <p className="text-[10px] font-semibold text-emerald-600">{formatTamerStatBonus(gear.statBonus)}</p>
        )}
        {owned ? (
          <span className="rounded-full bg-gold px-2.5 py-1 font-arcade text-xs font-bold text-white sm:text-sm">Owned</span>
        ) : canCraft ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
              {gearSource.kind === "craft" ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-mono text-sm font-semibold sm:text-base",
                    affordable ? "text-foreground" : "text-red-500"
                  )}
                >
                  <SealCoinIcon className="h-4 w-4 sm:h-5 sm:w-5" /> {gearSource.sealCoinCost}
                </span>
              ) : gearSource.kind === "craft-item" ? (
                gearSource.costs.map((cost) => {
                  const costItem = ITEM_CATALOG.find((i) => i.id === cost.itemId);
                  if (!costItem) return null;
                  const short = (ownedQuantityByItemId.get(cost.itemId) ?? 0) < cost.quantity;
                  return (
                    <span
                      key={cost.itemId}
                      className={cn(
                        "inline-flex items-center gap-1.5 font-mono text-sm font-semibold sm:text-base",
                        short ? "text-red-500" : "text-foreground"
                      )}
                    >
                      <ItemIcon item={costItem} className="h-4 w-4 sm:h-5 sm:w-5" /> {cost.quantity}
                    </span>
                  );
                })
              ) : null}
            </div>
            <PixelButton
              size="sm"
              variant="gold"
              className="w-full mt-1 sm:py-2.5 sm:text-sm"
              disabled={!affordable || busyId === gear.id}
              onClick={() => handleCraftArmor(gear.id)}
            >
              Craft
            </PixelButton>
          </>
        ) : (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {gear.source.kind === "campaign-clear" ? "Earned from Campaign" : null}
          </p>
        )}
      </GlowPanel>
    );
  }

  // Real-money Premium Shop — every listing is a preview ahead of actual payment integration, so
  // every button here is permanently disabled with a "Coming Soon" label instead of doing anything.
  function renderPremiumCard(item: (typeof PREMIUM_SHOP_ITEMS)[number]) {
    return (
      <GlowPanel key={item.id} accent="none" className="flex flex-col items-center gap-2 p-3 text-center sm:gap-2.5 sm:p-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light sm:h-20 sm:w-20 lg:h-24 lg:w-24">
          <Image src={item.icon} alt="" width={64} height={64} className="h-11 w-11 object-contain sm:h-14 sm:w-14" />
        </div>
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">{item.name}</p>
        <p className="text-[10px] text-zinc-500">{item.description}</p>
        <PixelButton size="sm" variant="neon" className="w-full mt-1 sm:py-2.5 sm:text-sm" disabled>
          Coming Soon
        </PixelButton>
      </GlowPanel>
    );
  }

  const buyItems =
    SECTION_TABS.some((s) => s.id === tab) && tab !== "armor" && tab !== "exchange" && tab !== "premium"
      ? LISTINGS_BY_SECTION[tab as BuySection]
      : [];
  const buyPagination = paginate(buyItems, pageFor(tab));
  const sellPagination = paginate(sellableItems, pageFor("sell"));
  const exchangePagination = paginate(exchangeCreatures, pageFor("exchange"));
  const armorPagination = paginate(TAMER_EQUIPMENT_CATALOG, pageFor("armor"));
  const premiumPagination = paginate(PREMIUM_SHOP_ITEMS, pageFor("premium"));

  return (
    // The market street backdrop itself now lives one level up, in AppShell.tsx's
    // ROUTE_BACKDROPS — it swaps in behind the whole screen (TopStatusBar/main/BottomNav) with a
    // fade whenever the route is /shop, instead of being confined to this page's own content box.
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-arcade text-lg glow-text-gold sm:text-xl lg:text-2xl">Shop</h1>
            <p className="mt-1 text-sm text-zinc-600 sm:text-base">Buy items, Tamers, skins, and a few Creatures.</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CurrencyPill icon={<GoldCoinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.gold} />
            <CurrencyPill icon={<CrownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.gems} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {SECTION_TABS.map((s) => (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 font-arcade text-xs uppercase tracking-wide transition-colors sm:px-5 sm:py-2 sm:text-sm",
                  tab === s.id
                    ? "border-gold bg-gold text-white"
                    : "border-arcade-border bg-arcade-panel-light text-zinc-600 hover:text-foreground"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setTab("sell")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-arcade text-xs uppercase tracking-wide transition-colors sm:px-5 sm:py-2 sm:text-sm",
              tab === "sell"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-arcade-border bg-arcade-panel-light text-zinc-600 hover:text-foreground"
            )}
          >
            <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Sell
          </button>
        </div>

        {tab === "exchange" && (
          <div className="flex items-center gap-2 rounded-xl border border-arcade-border bg-arcade-panel-light px-4 py-3 text-sm sm:gap-3 sm:px-5 sm:py-4 sm:text-base">
            {exchangeCoinItem && <ItemIcon item={exchangeCoinItem} className="h-6 w-6 sm:h-7 sm:w-7" />}
            <span className="font-semibold text-foreground">{exchangeCoinBalance} Exchange Coins</span>
            <span className="text-zinc-500">— each creature below costs {EXCHANGE_COST}</span>
          </div>
        )}

        {tab === "premium" && (
          <div className="rounded-xl border border-neon/40 bg-neon/10 px-4 py-3 text-sm sm:px-5 sm:py-4 sm:text-base">
            <span className="font-semibold text-foreground">Lacrima — real-money currency.</span>{" "}
            <span className="text-zinc-500">Purchases aren&apos;t open yet — check back soon.</span>
          </div>
        )}

        {tab === "sell" ? (
          sellableItems.length === 0 ? (
            <EmptyShopState label="Nothing sellable yet." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
                {sellPagination.pageItems.map(renderSellCard)}
              </div>
              <PageNumbers page={sellPagination.page} totalPages={sellPagination.totalPages} onChange={(p) => setPageFor("sell", p)} />
            </>
          )
        ) : tab === "exchange" ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
              {exchangePagination.pageItems.map(renderExchangeCard)}
            </div>
            <PageNumbers page={exchangePagination.page} totalPages={exchangePagination.totalPages} onChange={(p) => setPageFor("exchange", p)} />
          </>
        ) : tab === "armor" ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
              {armorPagination.pageItems.map(renderArmorCard)}
            </div>
            <PageNumbers page={armorPagination.page} totalPages={armorPagination.totalPages} onChange={(p) => setPageFor("armor", p)} />
          </>
        ) : tab === "premium" ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
              {premiumPagination.pageItems.map(renderPremiumCard)}
            </div>
            <PageNumbers page={premiumPagination.page} totalPages={premiumPagination.totalPages} onChange={(p) => setPageFor("premium", p)} />
          </>
        ) : buyItems.length === 0 ? (
          <EmptyShopState label="Nothing in this category yet — check back soon!" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
              {buyPagination.pageItems.map(renderBuyListing)}
            </div>
            <PageNumbers page={buyPagination.page} totalPages={buyPagination.totalPages} onChange={(p) => setPageFor(tab, p)} />
          </>
        )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopPageContent />
    </Suspense>
  );
}
