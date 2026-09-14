"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Lock, Check, Pause, RotateCw, Copy } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { ITEM_CATALOG, TAMER_EQUIPMENT_CATALOG, TAMER_CATALOG, TAMER_SET_EFFECTS, DUNGEON_STAGES } from "@/lib/gameData";
import { consumeItemOnServer, grantTamerEquipmentOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { getActiveTamerSetEffects } from "@/lib/tamerBuffs";
import type { TamerAvatar, TamerEquipment, TamerSlotType } from "@/types/game";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { TamerSprite } from "@/components/ui/TamerSprite";
import { EquippedBadge } from "@/components/ui/EquippedBadge";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { cn, formatTamerStatBonus } from "@/lib/utils";
import { useT } from "@/lib/i18n/useT";
import type { TranslationKey } from "@/lib/i18n/translations";
import { getSetEffectDescription } from "@/lib/i18n/itemDescriptions";

// Head-to-toe display order within a set's own grid.
const SLOT_ORDER: TamerSlotType[] = ["Hat", "Shoulders", "Chest", "Gloves", "Legs", "Shoes", "Aura", "Wings"];

const SLOT_LABEL_KEY: Record<TamerSlotType, TranslationKey> = {
  Hat: "inventory.slot_hat",
  Shoulders: "inventory.slot_shoulders",
  Chest: "inventory.slot_chest",
  Gloves: "inventory.slot_gloves",
  Legs: "inventory.slot_legs",
  Shoes: "inventory.slot_shoes",
  Aura: "inventory.slot_aura",
  Wings: "inventory.slot_wings",
};

// Groups TAMER_EQUIPMENT_CATALOG by setName (Crimson, Aqua, Wind, ...), preserving each set's
// first-appearance order in the catalog — a real set-aware grouping instead of the old flat
// one-card-per-slot layout, which silently collided/hid whenever a second set (e.g. Aqua) reused
// a slot type (e.g. "Chest") that an earlier set (Crimson) already occupied. Computed once at
// module scope since the catalog itself is static.
function groupCatalogBySet(): { setName: string; items: TamerEquipment[] }[] {
  const order: string[] = [];
  const bySet = new Map<string, TamerEquipment[]>();
  for (const item of TAMER_EQUIPMENT_CATALOG) {
    if (!bySet.has(item.setName)) {
      bySet.set(item.setName, []);
      order.push(item.setName);
    }
    bySet.get(item.setName)!.push(item);
  }
  return order.map((setName) => ({
    setName,
    items: [...bySet.get(setName)!].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)),
  }));
}
const EQUIPMENT_SETS = groupCatalogBySet();

function campaignClearLabel(stageId: string, t: ReturnType<typeof useT>): string {
  const stage = DUNGEON_STAGES.find((s) => s.id === stageId);
  if (!stage) return t("tamer.clear_campaign_stage");
  return `${t("tamer.clear_world_prefix")}${stage.world}-${stage.worldStageNumber}`;
}

function formatAvatarBuffs(avatar: TamerAvatar, t: ReturnType<typeof useT>): string[] {
  const lines: string[] = [];
  if (avatar.buffs.hpPercent) lines.push(`+${avatar.buffs.hpPercent}% HP`);
  if (avatar.buffs.atkPercent) lines.push(`+${avatar.buffs.atkPercent}% ATK`);
  if (avatar.buffs.defPercent) lines.push(`+${avatar.buffs.defPercent}% DEF`);
  if (avatar.buffs.spdPercent) lines.push(`+${avatar.buffs.spdPercent}% SPD`);
  if (avatar.buffs.dpPercent) lines.push(`+${avatar.buffs.dpPercent}% DP`);
  if (avatar.buffs.asPercent) lines.push(`+${avatar.buffs.asPercent}% AS`);
  if (avatar.buffs.htPercent) lines.push(`+${avatar.buffs.htPercent}% HT`);
  if (avatar.buffs.cdPercent) lines.push(`+${avatar.buffs.cdPercent}% CD`);
  if (avatar.buffs.scdPercent) lines.push(`+${avatar.buffs.scdPercent}% SCD`);
  if (avatar.buffs.ctPercent) lines.push(`+${avatar.buffs.ctPercent}% CT`);
  for (const [element, value] of Object.entries(avatar.buffs.elementAtkBonus ?? {})) {
    lines.push(`${t("tamer.atk_for_element_prefix")}${value}${t("tamer.atk_for_element_suffix")}${element}${t("tamer.atk_for_element_trail")}`);
  }
  return lines;
}

export default function TamerPage() {
  const t = useT();
  const language = useGameStore((s) => s.language);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerGear = useGameStore((s) => s.equippedTamerGear);
  const equipTamerGear = useGameStore((s) => s.equipTamerGear);
  const unequipTamerGear = useGameStore((s) => s.unequipTamerGear);
  const sealCoins = useGameStore((s) => s.currencies.sealCoins);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const craftTamerEquipment = useGameStore((s) => s.craftTamerEquipment);
  const tickMissionProgress = useGameStore((s) => s.tickMissionProgress);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);
  const profile = useGameStore((s) => s.profile);
  const [craftingId, setCraftingId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(true);
  const [copied, setCopied] = useState(false);
  const markTamerSeen = useGameStore((s) => s.markTamerSeen);
  
  useEffect(() => {
    markTamerSeen();
  }, [markTamerSeen]);

  const equippedTamer = TAMER_CATALOG.find((t) => t.id === equippedTamerId) ?? TAMER_CATALOG[0];
  const ownedByCatalogId = new Map(tamerInventory.map((t) => [t.id, t]));
  const ownedItemQuantityById = new Map(ownedItems.map((o) => [o.itemId, o.quantity]));

  function handleCraft(itemId: string) {
    setCraftingId(itemId);
    const crafted = craftTamerEquipment(itemId);
    if (crafted) {
      grantTamerEquipmentOnServer(itemId);
      // craftTamerEquipment (lib/store.ts) already deducted these costs from local ownedItems —
      // but that's local-only. Every other spend flow in this game (Gacha, Shop, Hidden Potential,
      // Awaken) pairs its local consumeItem with a consumeItemOnServer call for exactly this
      // reason; crafting was the one place missing it, so the chipset cost never actually left
      // user_items server-side — a fresh hydrate (new session, another device, just reloading)
      // silently restored the "spent" chipsets, making every craft here effectively free after the
      // first page reload. Confirmed live on a real account.
      const catalogItem = TAMER_EQUIPMENT_CATALOG.find((t) => t.id === itemId);
      if (catalogItem?.source.kind === "craft-item") {
        for (const cost of catalogItem.source.costs) {
          consumeItemOnServer(cost.itemId, cost.quantity);
        }
      }
      tickMissionProgress("task-enhance");
      syncProgressToServer();
    }
    setCraftingId(null);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(profile.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate aggregated stats
  const tamerBase = equippedTamer?.baseStats ?? {
    hp: 0, atk: 0, def: 0, spd: 0, dp: 0, as: 0, ht: 0, cd: 0, scd: 0, ct: 0
  };

  const levelMultiplier = 1 + (profile.level - 1) * 0.05;
  const scaledTamerHp = (tamerBase.hp * levelMultiplier);
  const scaledTamerAtk = (tamerBase.atk * levelMultiplier);
  const scaledTamerDef = (tamerBase.def * levelMultiplier);
  const scaledTamerSpd = (tamerBase.spd * levelMultiplier);
  const scaledTamerDp = ((tamerBase.dp ?? 0) * levelMultiplier);
  const scaledTamerAs = ((tamerBase.as ?? 0) * levelMultiplier);
  const scaledTamerHt = ((tamerBase.ht ?? 0) * levelMultiplier);
  const scaledTamerCd = ((tamerBase.cd ?? 0) * levelMultiplier);
  const scaledTamerScd = ((tamerBase.scd ?? 0) * levelMultiplier);
  const scaledTamerCt = ((tamerBase.ct ?? 0) * levelMultiplier);

  let hpPercent = equippedTamer.buffs.hpPercent ?? 0;
  let atkPercent = equippedTamer.buffs.atkPercent ?? 0;
  let defPercent = equippedTamer.buffs.defPercent ?? 0;
  let spdPercent = equippedTamer.buffs.spdPercent ?? 0;
  let dpPercent = equippedTamer.buffs.dpPercent ?? 0;
  let asPercent = equippedTamer.buffs.asPercent ?? 0;
  let htPercent = equippedTamer.buffs.htPercent ?? 0;
  let cdPercent = equippedTamer.buffs.cdPercent ?? 0;
  let scdPercent = equippedTamer.buffs.scdPercent ?? 0;
  let ctPercent = equippedTamer.buffs.ctPercent ?? 0;

  const equippedGearIds = new Set(Object.values(equippedTamerGear).filter(Boolean));
  const activeTamerGear = tamerInventory.filter((gear) => equippedGearIds.has(gear.id));
  for (const gear of activeTamerGear) {
    hpPercent += gear.statBonus?.hp ?? 0;
    atkPercent += gear.statBonus?.atk ?? 0;
    defPercent += gear.statBonus?.def ?? 0;
    spdPercent += gear.statBonus?.spd ?? 0;
    dpPercent += gear.statBonus?.dp ?? 0;
    asPercent += gear.statBonus?.as ?? 0;
    htPercent += gear.statBonus?.ht ?? 0;
    cdPercent += gear.statBonus?.cd ?? 0;
    scdPercent += gear.statBonus?.scd ?? 0;
    ctPercent += gear.statBonus?.ct ?? 0;
  }

  // Full-set Set Effects (e.g. Aqua's Crit Rate, Thunder/Ice's ATK) — same rule as
  // lib/tamerBuffs.ts's applyTamerBuffs, kept in sync so this page's numbers match real battle.
  const activeSetEffects = getActiveTamerSetEffects(activeTamerGear);
  for (const effect of activeSetEffects) {
    hpPercent += effect.statBonus?.hp ?? 0;
    atkPercent += effect.statBonus?.atk ?? 0;
    defPercent += effect.statBonus?.def ?? 0;
    spdPercent += effect.statBonus?.spd ?? 0;
    dpPercent += effect.statBonus?.dp ?? 0;
    asPercent += effect.statBonus?.as ?? 0;
    htPercent += effect.statBonus?.ht ?? 0;
    cdPercent += effect.statBonus?.cd ?? 0;
    scdPercent += effect.statBonus?.scd ?? 0;
    ctPercent += effect.statBonus?.ct ?? 0;
  }

  const finalHp = Math.round(scaledTamerHp * (1 + hpPercent / 100));
  const finalAtk = Math.round(scaledTamerAtk * (1 + atkPercent / 100));
  const finalDef = Math.round(scaledTamerDef * (1 + defPercent / 100));
  const finalSpd = Math.round(scaledTamerSpd * (1 + spdPercent / 100));
  const finalDp = Math.round(scaledTamerDp * (1 + dpPercent / 100));
  const finalAs = Math.round(scaledTamerAs * (1 + asPercent / 100));
  const finalHt = Math.round(scaledTamerHt * (1 + htPercent / 100));
  const finalCd = Math.round(scaledTamerCd * (1 + cdPercent / 100));
  const finalScd = Math.round(scaledTamerScd * (1 + scdPercent / 100));
  const finalCt = Math.round(scaledTamerCt * (1 + ctPercent / 100));



  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">{t("nav.tamer")}</h1>
          <p className="mt-1 text-xs text-zinc-500">
            {t("tamer.subtitle")}
          </p>
        </div>
        <CurrencyPill icon={<SealCoinIcon className="h-3.5 w-3.5" />} value={sealCoins} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        <GlowPanel accent="gold" className="flex flex-col items-center gap-3 p-5 text-center lg:sticky lg:top-4">
          <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-2xl border border-gold bg-gradient-to-b from-gold/15 via-gold/5 to-transparent pixel-frame">
            <button
              type="button"
              onClick={() => setSpinning((s) => !s)}
              aria-label={spinning ? t("tamer.pause_rotation") : t("tamer.resume_rotation")}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel/90 text-zinc-500 shadow-sm transition-colors hover:border-gold hover:text-gold-bright"
            >
              {spinning ? <Pause className="h-3.5 w-3.5" /> : <RotateCw className="h-3.5 w-3.5" />}
            </button>
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <TamerSprite
                spriteFolder={equippedTamer.spriteFolder}
                name={equippedTamer.name}
                spin={spinning}
                className="h-52 w-52 drop-shadow-md"
              />
            </motion.div>
          </div>
          <div>
            <p className="font-arcade text-sm font-bold text-foreground">{equippedTamer.name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
              {profile.title} · Lv.{profile.level}
            </p>
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 shadow-md">
              <span className="font-arcade text-[9px] text-zinc-400">{t("tamer.id_label")}</span>
              <span className="font-arcade text-[10px] text-white">{profile.name}</span>
              <button
                onClick={handleCopy}
                className="ml-1 text-zinc-400 hover:text-gold transition-colors"
                aria-label={t("tamer.copy_id")}
              >
                {copied ? (
                  <span className="font-arcade text-[8px] text-emerald-400">{t("tamer.copied")}</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
          <div className="w-full space-y-2 rounded-xl border border-arcade-border bg-arcade-panel-light p-4">
            <p className="font-arcade text-[10px] sm:text-xs uppercase tracking-wide text-zinc-500 mb-2 border-b border-arcade-border pb-1">{t("tamer.avatar_buffs")}</p>
            <div className="flex flex-wrap gap-2">
              {formatAvatarBuffs(equippedTamer, t).map((line) => (
                <span key={line} className="text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                  {line}
                </span>
              ))}
            </div>
          </div>
          
          <div className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light p-4 mt-2">
            <p className="font-arcade text-[10px] sm:text-xs uppercase tracking-wide text-zinc-500 mb-3 border-b border-arcade-border pb-2">{t("tamer.total_amplification")}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">HP</span>
                <span className="font-arcade text-xs sm:text-sm text-emerald-400 drop-shadow-md">+{finalHp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">ATK</span>
                <span className="font-arcade text-xs sm:text-sm text-emerald-400 drop-shadow-md">+{finalAtk.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">DEF</span>
                <span className="font-arcade text-xs sm:text-sm text-emerald-400 drop-shadow-md">+{finalDef.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">SPD</span>
                <span className="font-arcade text-xs sm:text-sm text-emerald-400 drop-shadow-md">+{finalSpd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">DP</span>
                <span className="font-arcade text-xs sm:text-sm text-sky-400 drop-shadow-md">+{finalDp.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">AS</span>
                <span className="font-arcade text-xs sm:text-sm text-sky-400 drop-shadow-md">+{finalAs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">HT</span>
                <span className="font-arcade text-xs sm:text-sm text-sky-400 drop-shadow-md">+{finalHt.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">CD</span>
                <span className="font-arcade text-xs sm:text-sm text-purple-400 drop-shadow-md">+{finalCd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">SCD</span>
                <span className="font-arcade text-xs sm:text-sm text-purple-400 drop-shadow-md">+{finalScd.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900 border border-white/5 shadow-inner rounded-md px-3 py-1.5">
                <span className="font-arcade text-[10px] sm:text-xs text-zinc-300">CT</span>
                <span className="font-arcade text-xs sm:text-sm text-purple-400 drop-shadow-md">+{finalCt.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </GlowPanel>

        <div className="space-y-6">
          {EQUIPMENT_SETS.map(({ setName, items }) => {
            const ownedCount = items.filter((item) => ownedByCatalogId.has(item.id)).length;
            const equippedCount = items.filter((item) => {
              const owned = ownedByCatalogId.get(item.id);
              return owned && equippedTamerGear[item.slot] === owned.id;
            }).length;
            const setEffect = TAMER_SET_EFFECTS[setName];
            const isSetEffectActive = Boolean(setEffect) && equippedCount >= items.length;
            return (
              <div key={setName} className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="font-arcade text-xs uppercase tracking-wide text-foreground">
                    {t("tamer.set_prefix")}{setName}{t("tamer.set_suffix")}
                  </h2>
                  <span className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">
                    {ownedCount}/{items.length}{t("tamer.pieces_suffix")}
                  </span>
                </div>
                {setEffect && (
                  <div
                    className={cn(
                      "flex flex-col gap-1.5 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2",
                      isSetEffectActive
                        ? "border-gold bg-gold/15"
                        : "border-arcade-border bg-arcade-panel-light"
                    )}
                  >
                    <span
                      className={cn(
                        "font-arcade text-[10px] uppercase tracking-wide leading-relaxed",
                        isSetEffectActive ? "text-gold-ink" : "text-zinc-700"
                      )}
                    >
                      <span className={isSetEffectActive ? "text-gold-bright" : "text-zinc-500"}>{t("tamer.set_effect_label")}</span>{" "}
                      {getSetEffectDescription(setName, setEffect.description, language)}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 self-start rounded-full px-2 py-0.5 font-arcade text-[9px] uppercase tracking-wide sm:self-auto",
                        isSetEffectActive
                          ? "bg-gold text-gold-ink"
                          : "bg-zinc-200 text-zinc-600"
                      )}
                    >
                      {isSetEffectActive ? t("tamer.active") : `${equippedCount}/${items.length}${t("tamer.equipped_suffix")}`}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {items.map((catalogItem) => {
                    const slot = catalogItem.slot;
                    const owned = ownedByCatalogId.get(catalogItem.id);
                    const isEquipped = owned && equippedTamerGear[slot] === owned.id;

                    if (owned) {
                      return (
                        <GlowPanel key={catalogItem.id} accent={isEquipped ? "gold" : "none"} className="flex flex-col items-center gap-2 p-3 text-center">
                          <div className={cn("relative flex h-16 w-16 items-center justify-center rounded-xl border bg-arcade-panel-light pixel-frame", isEquipped ? "border-gold" : "border-arcade-border")}>
                            <Image src={owned.icon} alt="" width={48} height={48} className={cn("h-11 w-11 object-contain", isEquipped ? "" : "opacity-60")} />
                            {isEquipped && <EquippedBadge />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-arcade text-xs font-bold text-foreground">{t(SLOT_LABEL_KEY[slot])}</p>
                            <p className="truncate text-[9px] text-zinc-500">{owned.name}</p>
                          </div>
                          <RarityBadge rarity={owned.rarity} />
                          {formatTamerStatBonus(owned.statBonus) && (
                            <p className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold leading-snug text-emerald-700">
                              {formatTamerStatBonus(owned.statBonus)}
                            </p>
                          )}
                          {isEquipped ? (
                            <div className="w-full mt-1">
                              <span className="inline-flex items-center gap-1 font-arcade text-[8px] uppercase text-emerald-600 mb-1">
                                <Check className="h-2.5 w-2.5" /> {t("tamer.equipped")}
                              </span>
                              <PixelButton size="sm" variant="ghost" className="w-full text-[10px] h-7" onClick={() => unequipTamerGear(slot)}>
                                {t("tamer.unequip")}
                              </PixelButton>
                            </div>
                          ) : (
                            <div className="w-full mt-1">
                              <PixelButton size="sm" variant="gold" className="w-full text-[10px] h-7" onClick={() => equipTamerGear(owned.id)}>
                                {t("tamer.equip")}
                              </PixelButton>
                            </div>
                          )}
                        </GlowPanel>
                      );
                    }

                    const canCraft = catalogItem.source.kind === "craft" || catalogItem.source.kind === "craft-item";
                    const catalogItemSource = catalogItem.source;
                    const affordable =
                      catalogItemSource.kind === "craft"
                        ? sealCoins >= catalogItemSource.sealCoinCost
                        : catalogItemSource.kind === "craft-item"
                          ? catalogItemSource.costs.every((cost) => (ownedItemQuantityById.get(cost.itemId) ?? 0) >= cost.quantity)
                          : false;

                    return (
                      <GlowPanel
                        key={catalogItem.id}
                        accent="none"
                        className="flex flex-col items-center gap-2 p-3 text-center"
                      >
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-arcade-border bg-arcade-panel-light pixel-frame">
                          <Image
                            src={catalogItem.icon}
                            alt=""
                            width={48}
                            height={48}
                            className="h-11 w-11 object-contain opacity-40 grayscale"
                          />
                          <Lock className="absolute h-5 w-5 text-zinc-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-arcade text-xs font-bold text-zinc-500">{t(SLOT_LABEL_KEY[slot])}</p>
                          <p className="truncate text-[9px] text-zinc-500">{catalogItem.name}</p>
                          {formatTamerStatBonus(catalogItem.statBonus) && (
                            <p className="mt-1 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold leading-snug text-zinc-600">
                              {formatTamerStatBonus(catalogItem.statBonus)}
                            </p>
                          )}
                        </div>
                        {canCraft ? (
                          <>
                            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
                              {catalogItemSource.kind === "craft" ? (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 font-mono text-sm font-semibold",
                                    affordable ? "text-foreground" : "text-red-500"
                                  )}
                                >
                                  <SealCoinIcon className="h-4 w-4" /> {catalogItemSource.sealCoinCost}
                                </span>
                              ) : catalogItemSource.kind === "craft-item" ? (
                                catalogItemSource.costs.map((cost) => {
                                  const costItem = ITEM_CATALOG.find((i) => i.id === cost.itemId);
                                  if (!costItem) return null;
                                  const short = (ownedItemQuantityById.get(cost.itemId) ?? 0) < cost.quantity;
                                  return (
                                    <span
                                      key={cost.itemId}
                                      className={cn(
                                        "inline-flex items-center gap-1.5 font-mono text-sm font-semibold",
                                        short ? "text-red-500" : "text-foreground"
                                      )}
                                    >
                                      <ItemIcon item={costItem} className="h-4 w-4" /> {cost.quantity}
                                    </span>
                                  );
                                })
                              ) : null}
                            </div>
                            <PixelButton
                              size="sm"
                              variant="gold"
                              disabled={!affordable || craftingId === catalogItem.id}
                              onClick={() => handleCraft(catalogItem.id)}
                              className="w-full"
                            >
                              {t("tamer.craft")}
                            </PixelButton>
                          </>
                        ) : catalogItem.source.kind === "campaign-clear" ? (
                          <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500">
                            {campaignClearLabel(catalogItem.source.stageId, t)}
                          </p>
                        ) : null}
                      </GlowPanel>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
