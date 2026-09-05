"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles, X } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { ITEM_CATALOG } from "@/lib/gameData";
import { consumeItemOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import type { Equipment, InventoryItem, InventoryItemCategory, TamerEquipment } from "@/types/game";
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

// Tamer gear (e.g. the Crimson set) is a separate system from Digimon Equipment above — owning a
// piece means wearing it (no per-creature assignment), so every card here shows the "E" badge.
function TamerGearCard({ item, onClick }: { item: TamerEquipment; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <GlowPanel accent="gold" className="flex flex-col items-center gap-1.5 p-3 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame">
          <Image src={item.icon} alt="" width={40} height={40} className="h-9 w-9 object-contain" />
          <EquippedBadge />
        </div>
        <p className="truncate text-[11px] font-semibold text-foreground">{item.name}</p>
        <p className="text-[9px] uppercase tracking-wide text-zinc-500">
          {item.slot} · {item.setName}
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
}: {
  item: InventoryItem;
  quantity: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="text-left">
      <GlowPanel accent="none" className="flex flex-col items-center gap-1.5 p-3 text-center sm:gap-2 sm:p-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light sm:h-16 sm:w-16">
          <ItemIcon item={item} className="h-9 w-9 text-zinc-500 sm:h-11 sm:w-11" />
        </div>
        <p className="truncate text-xs font-semibold text-foreground sm:text-sm">{item.name}</p>
        <RarityBadge rarity={item.rarity} />
        <span className="rounded-full bg-gold px-2.5 py-1 font-arcade text-xs font-bold text-white shadow-sm sm:text-sm">
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
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const markInventorySeen = useGameStore((s) => s.markInventorySeen);
  const activeCreatureId = useGameStore((s) => s.activeCreatureId);
  const creatures = useGameStore((s) => s.creatures);
  const equipItem = useGameStore((s) => s.equipItem);
  const unequipItem = useGameStore((s) => s.unequipItem);
  const enhanceEquipment = useGameStore((s) => s.enhanceEquipment);
  const tickMissionProgress = useGameStore((s) => s.tickMissionProgress);
  const consumeItem = useGameStore((s) => s.consumeItem);
  const regenEnergy = useGameStore((s) => s.regenEnergy);
  const gainCreatureExp = useGameStore((s) => s.gainCreatureExp);

  const [activeTab, setActiveTab] = useState<TabId>("Equipment");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedTamerGear, setSelectedTamerGear] = useState<TamerEquipment | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [useQuantity, setUseQuantity] = useState(1);
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
          <h1 className="font-arcade text-lg glow-text-gold sm:text-xl lg:text-2xl">Inventory</h1>
          <p className="mt-1 text-sm text-zinc-600 sm:text-base">
            Everything you&apos;ve found across Campaign, Survival, and beyond.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <CurrencyPill icon={<GoldCoinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.gold} />
          <CurrencyPill icon={<CrownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.gems} />
          <CurrencyPill icon={<SealCoinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />} value={currencies.sealCoins} />
        </div>
      </div>

      <div className="scrollbar-hidden flex gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 font-arcade text-xs uppercase tracking-wide transition-colors sm:px-4 sm:py-2 sm:text-sm",
              activeTab === tab.id
                ? "border-gold bg-gold text-white"
                : "border-arcade-border bg-arcade-panel-light text-zinc-600 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "Equipment" ? (
        inventory.length === 0 && tamerInventory.length === 0 ? (
          <EmptyTab label="Equipment" />
        ) : (
          <div className="space-y-4">
            {tamerInventory.length > 0 && (
              <div className="space-y-2">
                <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">
                  Tamer Gear — separate from your Digimon&apos;s equipment
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {tamerInventory.map((item) => (
                    <TamerGearCard key={item.id} item={item} onClick={() => setSelectedTamerGear(item)} />
                  ))}
                </div>
              </div>
            )}

            {inventory.length > 0 && (
              <div className="space-y-2">
                {tamerInventory.length > 0 && (
                  <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Digimon Equipment</p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {inventory.map((item) => (
                    <EquipmentCard key={item.id} item={item} onClick={() => setSelectedEquipment(item)} />
                  ))}
                </div>
              </div>
            )}
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
                  onClick={() => {
                    setSelectedItem(item);
                    setUseQuantity(1);
                  }}
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
                  onClick={() => {
                    enhanceEquipment(selectedEquipment.id);
                    tickMissionProgress("task-enhance");
                    syncProgressToServer();
                  }}
                >
                  {selectedEquipment.enhancementLevel >= 10 ? "Max Enhancement" : "Enhance"}
                </PixelButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                aria-label="Close"
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame">
                <Image src={selectedTamerGear.icon} alt="" width={48} height={48} className="h-11 w-11 object-contain" />
                <EquippedBadge />
              </div>

              <p className="mt-3 text-center text-[10px] uppercase tracking-wide text-zinc-500">
                {selectedTamerGear.slot} · {selectedTamerGear.setName} Set
              </p>
              <h2 className="text-center text-xl font-bold text-foreground">{selectedTamerGear.name}</h2>
              <div className="mt-2 flex items-center justify-center gap-2">
                <RarityBadge rarity={selectedTamerGear.rarity} />
              </div>

              {formatTamerStatBonus(selectedTamerGear.statBonus) && (
                <div className="mt-3 rounded-xl border border-arcade-border bg-arcade-panel-light py-2 text-center">
                  <p className="text-[9px] uppercase tracking-wide text-zinc-500">Bonus</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatTamerStatBonus(selectedTamerGear.statBonus)}
                  </p>
                </div>
              )}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-500">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Equipped on your Tamer
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
                    Max
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
                      }
                      setSelectedItem(null);
                    }}
                  >
                    Use (+{(selectedItem.energyRestore as number) * useQuantity} Energy)
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
                Use {useQuantity}x {usingItemForCreature.name} on which Digimon?
              </h2>
              <MultiCreaturePicker
                creatures={creatures}
                selectedIds={pickedCreatureId ? [pickedCreatureId] : []}
                maxCount={1}
                onToggle={(id) => setPickedCreatureId(id)}
                confirmLabel={`Use (+${(usingItemForCreature.creatureExpValue as number) * useQuantity} EXP)`}
                onConfirm={() => {
                  if (!pickedCreatureId) return;
                  if (consumeItem(usingItemForCreature.id, useQuantity)) {
                    gainCreatureExp(pickedCreatureId, (usingItemForCreature.creatureExpValue as number) * useQuantity);
                    consumeItemOnServer(usingItemForCreature.id, useQuantity);
                  }
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
