"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { ITEM_CATALOG } from "@/lib/gameData";
import { consumeItemOnServer } from "@/lib/syncProgress";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import type { Equipment, InventoryItem, InventoryItemCategory } from "@/types/game";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { CrownIcon } from "@/components/icons/CrownIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { cn } from "@/lib/utils";

type TabId = "Equipment" | InventoryItemCategory;

const TABS: { id: TabId; label: string }[] = [
  { id: "Equipment", label: "Equipment" },
  { id: "Consumable", label: "Consumables" },
  { id: "Quest", label: "Quest" },
  { id: "Evolution", label: "Evolution" },
  { id: "Skin", label: "Skins" },
  { id: "Crafting", label: "Crafting" },
];

function EquipmentCard({ item, onClick }: { item: Equipment; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <GlowPanel accent={item.equippedTo ? "gold" : "none"} className="flex flex-col items-center gap-1.5 p-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light">
          <Sparkles className="h-6 w-6 text-zinc-400" />
        </div>
        <p className="truncate text-[11px] font-semibold text-foreground">{item.name}</p>
        <p className="text-[9px] uppercase tracking-wide text-zinc-500">
          {item.slot} · +{item.enhancementLevel}
        </p>
        <RarityBadge rarity={item.rarity} />
        {item.equippedTo && (
          <span className="inline-flex items-center gap-0.5 font-arcade text-[7px] uppercase text-emerald-600">
            <Check className="h-2.5 w-2.5" /> Equipped
          </span>
        )}
      </GlowPanel>
    </button>
  );
}

function ItemCard({
  item,
  quantity,
  onClick,
}: {
  item: InventoryItem;
  quantity: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left">
      <GlowPanel accent="none" className="flex flex-col items-center gap-1.5 p-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light">
          <ItemIcon item={item} className="h-9 w-9 text-zinc-500" />
        </div>
        <p className="truncate text-[11px] font-semibold text-foreground">{item.name}</p>
        <RarityBadge rarity={item.rarity} />
        <span className="rounded-full border border-gold/60 bg-gold/10 px-1.5 py-0.5 font-arcade text-[8px] font-semibold text-gold-bright">
          ×{quantity}
        </span>
      </GlowPanel>
    </button>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <GlowPanel accent="none" className="flex h-40 flex-col items-center justify-center gap-1.5 text-center">
      <p className="text-xs text-zinc-500">No {label.toLowerCase()} yet.</p>
      <p className="text-[10px] text-zinc-400">Clear Campaign and Survival stages to find some.</p>
    </GlowPanel>
  );
}

export default function InventoryPage() {
  const currencies = useGameStore((s) => s.currencies);
  const inventory = useGameStore((s) => s.inventory);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const markInventorySeen = useGameStore((s) => s.markInventorySeen);
  const activeCreatureId = useGameStore((s) => s.activeCreatureId);
  const creatures = useGameStore((s) => s.creatures);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const enhanceEquipment = useGameStore((s) => s.enhanceEquipment);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const regenEnergy = useGameStore((s) => s.regenEnergy);
  const gainCreatureExp = useGameStore((s) => s.gainCreatureExp);

  const [activeTab, setActiveTab] = useState<TabId>("Equipment");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [usingItemForCreature, setUsingItemForCreature] = useState<InventoryItem | null>(null);
  const [pickedCreatureId, setPickedCreatureId] = useState<string | null>(null);

  useEffect(() => {
    markInventorySeen();
  }, [markInventorySeen]);

  const ownedQuantityByItemId = new Map(ownedItems.map((o) => [o.itemId, o.quantity]));
  const equippedToCreature = selectedEquipment
    ? creatures.find((c) => c.id === selectedEquipment.equippedTo)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Inventory</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Everything you&apos;ve found across Campaign, Survival, and beyond.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <CurrencyPill icon={<GoldCoinIcon className="h-3.5 w-3.5" />} value={currencies.gold} />
          <CurrencyPill icon={<CrownIcon className="h-3.5 w-3.5" />} value={currencies.gems} />
          <CurrencyPill icon={<SealCoinIcon className="h-3.5 w-3.5" />} value={currencies.sealCoins} />
        </div>
      </div>

      <div className="scrollbar-hidden flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 font-arcade text-[10px] uppercase tracking-wide transition-colors",
              activeTab === tab.id
                ? "border-gold bg-gold/10 text-gold-bright"
                : "border-arcade-border bg-arcade-panel-light text-zinc-500 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "Equipment" ? (
        inventory.length === 0 ? (
          <EmptyTab label="Equipment" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {inventory.map((item) => (
              <EquipmentCard key={item.id} item={item} onClick={() => setSelectedEquipment(item)} />
            ))}
          </div>
        )
      ) : (
        (() => {
          const categoryItems = ITEM_CATALOG.filter((i) => i.category === activeTab).filter((i) =>
            ownedQuantityByItemId.has(i.id)
          );
          if (categoryItems.length === 0) return <EmptyTab label={activeTab} />;
          return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {categoryItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  quantity={ownedQuantityByItemId.get(item.id) ?? 0}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          );
        })()
      )}

      <AnimatePresence>
        {selectedEquipment && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEquipment(null)}
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
                onClick={() => setSelectedEquipment(null)}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{selectedEquipment.slot}</p>
              <h2 className="text-xl font-bold text-foreground">{selectedEquipment.name}</h2>
              <div className="mt-2 flex items-center gap-2">
                <RarityBadge rarity={selectedEquipment.rarity} />
                <span className="font-arcade text-[10px] text-zinc-500">+{selectedEquipment.enhancementLevel}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {Object.entries(selectedEquipment.baseStats).map(([stat, value]) => (
                  <div key={stat} className="rounded-xl border border-arcade-border bg-arcade-panel-light py-2 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-zinc-500">{stat}</p>
                    <p className="font-mono text-sm font-semibold text-foreground">+{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {selectedEquipment.equippedTo ? (
                  <>
                    <p className="text-center text-[11px] text-zinc-500">
                      Equipped to {equippedToCreature?.name ?? "a creature"}
                    </p>
                    <PixelButton
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        unequipItem(selectedEquipment.equippedTo as string, selectedEquipment.id);
                        setSelectedEquipment(null);
                      }}
                    >
                      Unequip
                    </PixelButton>
                  </>
                ) : (
                  <PixelButton
                    variant="gold"
                    className="w-full"
                    disabled={!activeCreatureId}
                    onClick={() => {
                      equipItem(activeCreatureId, selectedEquipment.id);
                      setSelectedEquipment(null);
                    }}
                  >
                    Equip to active creature
                  </PixelButton>
                )}
                <PixelButton
                  variant="ghost"
                  className="w-full"
                  disabled={selectedEquipment.enhancementLevel >= 10}
                  onClick={() => enhanceEquipment(selectedEquipment.id)}
                >
                  {selectedEquipment.enhancementLevel >= 10 ? "Max Enhancement" : "Enhance"}
                </PixelButton>
              </div>
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
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{selectedItem.category}</p>
              <h2 className="text-xl font-bold text-foreground">{selectedItem.name}</h2>
              <div className="mt-2 flex items-center gap-2">
                <RarityBadge rarity={selectedItem.rarity} />
                <span className="font-arcade text-[10px] text-zinc-500">
                  ×{ownedQuantityByItemId.get(selectedItem.id) ?? 0} owned
                </span>
              </div>
              <p className="mt-3 text-xs text-zinc-600">{selectedItem.description}</p>

              <div className="mt-4 space-y-2">
                {selectedItem.energyRestore && (
                  <PixelButton
                    variant="gold"
                    className="w-full"
                    onClick={() => {
                      regenEnergy(selectedItem.energyRestore as number);
                      consumeItem(selectedItem.id, 1);
                      consumeItemOnServer(selectedItem.id, 1);
                      setSelectedItem(null);
                    }}
                  >
                    Use (+{selectedItem.energyRestore} Energy)
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
                    Use on a Digimon
                  </PixelButton>
                )}
                {selectedItem.sellPriceGold && (
                  <p className="text-center text-[10px] text-zinc-500">
                    Sell this in the Shop for {selectedItem.sellPriceGold} gold.
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
              className="relative w-full max-w-md space-y-3 rounded-t-3xl border border-arcade-border bg-arcade-panel p-4 shadow-xl sm:rounded-3xl"
            >
              <button
                onClick={() => {
                  setUsingItemForCreature(null);
                  setPickedCreatureId(null);
                }}
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-bold text-foreground">
                Use {usingItemForCreature.name} on which Digimon?
              </h2>
              <MultiCreaturePicker
                creatures={creatures}
                selectedIds={pickedCreatureId ? [pickedCreatureId] : []}
                maxCount={1}
                onToggle={(id) => setPickedCreatureId(id)}
                confirmLabel="Use"
                onConfirm={() => {
                  if (!pickedCreatureId) return;
                  gainCreatureExp(pickedCreatureId, usingItemForCreature.creatureExpValue as number);
                  consumeItem(usingItemForCreature.id, 1);
                  consumeItemOnServer(usingItemForCreature.id, 1);
                  setUsingItemForCreature(null);
                  setPickedCreatureId(null);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
