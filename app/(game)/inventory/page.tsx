"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { creatureLevelCap, ITEM_CATALOG } from "@/lib/gameData";
import { consumeItemOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import type { InventoryItem, InventoryItemCategory, TamerEquipment } from "@/types/game";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { EquippedBadge } from "@/components/ui/EquippedBadge";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { cn, formatTamerStatBonus } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import { getItemName, getItemDescription } from "@/lib/i18n/itemDescriptions";
import type { TranslationKey } from "@/lib/i18n/translations";

type TabId = "Gear" | InventoryItemCategory;

const TAB_LABEL_KEY: Record<TabId, TranslationKey> = {
  Gear: "inventory.tab_gear",
  Consumable: "inventory.tab_consumable",
  Quest: "inventory.tab_quest",
  Evolution: "inventory.tab_evolution",
  Skin: "inventory.tab_skin",
  Crafting: "inventory.tab_crafting",
};

const TABS: TabId[] = ["Gear", "Consumable", "Quest", "Evolution", "Skin", "Crafting"];

const SLOT_LABEL_KEY: Record<string, TranslationKey> = {
  Hat: "inventory.slot_hat",
  Shoulders: "inventory.slot_shoulders",
  Chest: "inventory.slot_chest",
  Gloves: "inventory.slot_gloves",
  Legs: "inventory.slot_legs",
  Shoes: "inventory.slot_shoes",
  Aura: "inventory.slot_aura",
  Wings: "inventory.slot_wings",
};

// Owning a piece of Tamer gear means wearing it (no per-creature assignment), so every card here
// shows the "E" badge.
function TamerGearCard({
  item,
  onClick,
  t,
}: {
  item: TamerEquipment;
  onClick: () => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <button onClick={onClick} className="text-left">
      <GlowPanel accent="gold" className="flex flex-col items-center gap-1.5 p-3 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame">
          <Image src={item.icon} alt="" width={40} height={40} className="h-9 w-9 object-contain" />
          <EquippedBadge />
        </div>
        <p className="truncate text-[11px] font-semibold text-foreground">{item.name}</p>
        <p className="text-[9px] uppercase tracking-wide text-zinc-500">
          {t(SLOT_LABEL_KEY[item.slot] ?? "inventory.slot_hat")} · {item.setName}
        </p>
        <RarityBadge rarity={item.rarity} />
        {formatTamerStatBonus(item.statBonus) && (
          <p className="text-[8px] font-semibold text-emerald-600">{formatTamerStatBonus(item.statBonus)}</p>
        )}
      </GlowPanel>
    </button>
  );
}

function ItemCard({
  item,
  quantity,
  onClick,
  language,
}: {
  item: InventoryItem;
  quantity: number;
  onClick: () => void;
  language: "en" | "es";
}) {
  return (
    <button onClick={onClick} className="text-left">
      <GlowPanel accent="none" className="flex flex-col items-center gap-1.5 p-3 text-center sm:gap-2 sm:p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light sm:h-16 sm:w-16">
          <ItemIcon item={item} className="h-9 w-9 text-zinc-500 sm:h-11 sm:w-11" />
        </div>
        <p className="truncate text-xs font-semibold text-foreground sm:text-sm">{getItemName(item, language)}</p>
        <RarityBadge rarity={item.rarity} />
        <span className="rounded-full bg-gold px-2.5 py-1 font-arcade text-xs font-bold text-white shadow-sm sm:text-sm">
          ×{quantity}
        </span>
      </GlowPanel>
    </button>
  );
}

function EmptyTab({ label, t }: { label: string; t: ReturnType<typeof useT> }) {
  return (
    <GlowPanel accent="none" className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
      <p className="text-xs text-zinc-500">
        {t("inventory.empty_prefix")}
        {label.toLowerCase()}
        {t("inventory.empty_suffix")}
      </p>
      <p className="text-[10px] text-zinc-400">{t("inventory.empty_hint")}</p>
    </GlowPanel>
  );
}

export default function InventoryPage() {
  const t = useT();
  const language = useGameStore((s) => s.language);
  const currencies = useGameStore((s) => s.currencies);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const markInventorySeen = useGameStore((s) => s.markInventorySeen);
  const creatures = useGameStore((s) => s.creatures);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const regenEnergy = useGameStore((s) => s.regenEnergy);
  const gainCreatureExp = useGameStore((s) => s.gainCreatureExp);

  const [activeTab, setActiveTab] = useState<TabId>("Gear");
  const [selectedTamerGear, setSelectedTamerGear] = useState<TamerEquipment | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [useQuantity, setUseQuantity] = useState(1);
  const [usingItemForCreature, setUsingItemForCreature] = useState<InventoryItem | null>(null);
  const [pickedCreatureId, setPickedCreatureId] = useState<string | null>(null);

  // A creature already at its level cap can't gain any more EXP (applyExpGain in lib/store.ts is
  // a no-op past creatureLevelCap) — without this, picking one here still consumed the item for
  // literally zero effect, with no warning at all. Excluded here (not filtered out) so the reason
  // is visible instead of the creature just silently disappearing from the list.
  const maxLevelCreatureIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of creatures) {
      if (c.level >= creatureLevelCap(c)) map.set(c.id, t("common.badge_max_level"));
    }
    return map;
  }, [creatures, t]);

  useEffect(() => {
    markInventorySeen();
  }, [markInventorySeen]);

  const ownedQuantityByItemId = new Map(ownedItems.map((o) => [o.itemId, o.quantity]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold sm:text-xl lg:text-2xl">{t("inventory.title")}</h1>
          <p className="mt-1 text-sm text-zinc-600 sm:text-base">
            {t("inventory.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <CurrencyPill icon={<GoldCoinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.gold} />
          <CurrencyPill icon={<CrownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.gems} />
          <CurrencyPill icon={<SealCoinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.sealCoins} />
        </div>
      </div>

      <div className="scrollbar-hidden flex gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {TABS.map((tabId) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 font-arcade text-xs uppercase tracking-wide transition-colors sm:px-4 sm:py-2 sm:text-sm",
              activeTab === tabId
                ? "border-gold bg-gold text-white"
                : "border-arcade-border bg-arcade-panel-light text-zinc-600 hover:text-foreground"
            )}
          >
            {t(TAB_LABEL_KEY[tabId])}
          </button>
        ))}
      </div>

      {activeTab === "Gear" ? (
        tamerInventory.length === 0 ? (
          <EmptyTab label={t("inventory.tab_gear")} t={t} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {tamerInventory.map((item) => (
              <TamerGearCard key={item.id} item={item} onClick={() => setSelectedTamerGear(item)} t={t} />
            ))}
          </div>
        )
      ) : (
        (() => {
          const categoryItems = ITEM_CATALOG.filter((i) => i.category === activeTab).filter((i) =>
            ownedQuantityByItemId.has(i.id)
          );
          if (categoryItems.length === 0) return <EmptyTab label={t(TAB_LABEL_KEY[activeTab])} t={t} />;
          return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {categoryItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  quantity={ownedQuantityByItemId.get(item.id) ?? 0}
                  onClick={() => {
                    setSelectedItem(item);
                    setUseQuantity(1);
                  }}
                  language={language}
                />
              ))}
            </div>
          );
        })()
      )}

      <AnimatePresence>
        {selectedTamerGear && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTamerGear(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative w-full max-w-sm rounded-t-3xl border border-arcade-border bg-arcade-panel p-4 shadow-xl sm:rounded-3xl"
            >
              <button
                onClick={() => setSelectedTamerGear(null)}
                aria-label={t("common.close")}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame">
                <Image src={selectedTamerGear.icon} alt="" width={48} height={48} className="h-11 w-11 object-contain" />
                <EquippedBadge />
              </div>

              <p className="mt-3 text-center text-[10px] uppercase tracking-wide text-zinc-500">
                {t(SLOT_LABEL_KEY[selectedTamerGear.slot] ?? "inventory.slot_hat")} · {t("inventory.set_prefix")}
                {selectedTamerGear.setName}
                {t("inventory.set_suffix")}
              </p>
              <h2 className="text-center text-xl font-bold text-foreground">{selectedTamerGear.name}</h2>
              <div className="mt-2 flex items-center justify-center gap-2">
                <RarityBadge rarity={selectedTamerGear.rarity} />
              </div>

              {formatTamerStatBonus(selectedTamerGear.statBonus) && (
                <div className="mt-3 rounded-xl border border-arcade-border bg-arcade-panel-light py-2 text-center">
                  <p className="text-[9px] uppercase tracking-wide text-zinc-500">{t("inventory.bonus")}</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatTamerStatBonus(selectedTamerGear.statBonus)}
                  </p>
                </div>
              )}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> {t("inventory.equipped_on_tamer")}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative w-full max-w-sm rounded-t-3xl border border-arcade-border bg-arcade-panel p-4 shadow-xl sm:rounded-3xl"
            >
              <button
                onClick={() => setSelectedItem(null)}
                aria-label={t("common.close")}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{selectedItem.category}</p>
              <h2 className="text-xl font-bold text-foreground">{getItemName(selectedItem, language)}</h2>
              <div className="mt-2 flex items-center gap-2">
                <RarityBadge rarity={selectedItem.rarity} />
                <span className="font-arcade text-[10px] text-zinc-500">
                  ×{ownedQuantityByItemId.get(selectedItem.id) ?? 0}
                  {t("inventory.owned_suffix")}
                </span>
              </div>
              <p className="mt-3 text-xs text-zinc-600">{getItemDescription(selectedItem, language)}</p>

              {(selectedItem.energyRestore || selectedItem.creatureExpValue) && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-arcade-border bg-arcade-panel-light p-2">
                  <button 
                    disabled={useQuantity <= 1} 
                    onClick={() => setUseQuantity(q => q - 1)} 
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 font-bold disabled:opacity-50"
                  >
                    -
                  </button>
                  <span className="font-arcade text-sm text-foreground">{useQuantity}</span>
                  <button 
                    disabled={useQuantity >= (ownedQuantityByItemId.get(selectedItem.id) ?? 0)} 
                    onClick={() => setUseQuantity(q => q + 1)} 
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 font-bold disabled:opacity-50"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setUseQuantity(ownedQuantityByItemId.get(selectedItem.id) ?? 0)}
                    className="text-[10px] font-bold uppercase text-zinc-500 hover:text-foreground"
                  >
                    {t("inventory.max")}
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-2">
                {selectedItem.energyRestore && (
                  <PixelButton
                    variant="gold"
                    className="w-full"
                    onClick={() => {
                      if (consumeItem(selectedItem.id, useQuantity)) {
                        regenEnergy((selectedItem.energyRestore as number) * useQuantity);
                        consumeItemOnServer(selectedItem.id, useQuantity);
                        // consumeItemOnServer only persists the item side — without this, the
                        // energy gained here only lives in local state until GameGate's next
                        // periodic sync (or is lost entirely if the tab closes before then).
                        syncProgressToServer();
                      }
                      setSelectedItem(null);
                    }}
                  >
                    {t("inventory.use_energy_prefix")}{(selectedItem.energyRestore as number) * useQuantity}{t("inventory.use_energy_suffix")}
                  </PixelButton>
                )}
                {selectedItem.creatureExpValue && (
                  <PixelButton
                    variant="gold"
                    className="w-full"
                    onClick={() => {
                      setUsingItemForCreature(selectedItem);
                      setSelectedItem(null);
                    }}
                  >
                    {t("inventory.use_on_creature")}
                  </PixelButton>
                )}
                {selectedItem.sellPriceGold && (
                  <p className="text-center text-[10px] text-zinc-500">
                    {t("inventory.sell_prefix")}{selectedItem.sellPriceGold}{t("inventory.sell_suffix")}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {usingItemForCreature && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setUsingItemForCreature(null);
                setPickedCreatureId(null);
              }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              // max-h-[85vh] + the inner overflow-y-auto below (same idiom as CreatureDetailModal):
              // this used to have no height cap at all, so with 40+ creatures the whole PAGE
              // scrolled to see the list instead of the modal, and the title/close button scrolled
              // away with it — the close button became unreachable without scrolling back up.
              className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-arcade-border bg-arcade-panel shadow-xl sm:rounded-3xl"
            >
              <button
                onClick={() => {
                  setUsingItemForCreature(null);
                  setPickedCreatureId(null);
                }}
                aria-label={t("common.close")}
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="shrink-0 px-4 pr-12 pt-4 text-sm font-bold text-foreground">
                {t("inventory.use_on_which_prefix")}{useQuantity}{t("inventory.use_on_which_mid")}{getItemName(usingItemForCreature, language)}{t("inventory.use_on_which_suffix")}
              </h2>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <MultiCreaturePicker
                  creatures={creatures}
                  excludedIds={maxLevelCreatureIds}
                  selectedIds={pickedCreatureId ? [pickedCreatureId] : []}
                  maxCount={1}
                  onToggle={(id) => setPickedCreatureId(id)}
                  confirmLabel={`${t("inventory.use_exp_prefix")}${(usingItemForCreature.creatureExpValue as number) * useQuantity}${t("inventory.use_exp_suffix")}`}
                  onConfirm={() => {
                    if (!pickedCreatureId) return;
                    if (consumeItem(usingItemForCreature.id, useQuantity)) {
                      gainCreatureExp(pickedCreatureId, (usingItemForCreature.creatureExpValue as number) * useQuantity);
                      consumeItemOnServer(usingItemForCreature.id, useQuantity);
                      // Same reasoning as the energy-item Use button above — persist the EXP gain
                      // right away instead of leaving it to the next periodic sync.
                      syncProgressToServer();
                    }
                    setUsingItemForCreature(null);
                    setPickedCreatureId(null);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
