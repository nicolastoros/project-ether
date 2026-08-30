"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Lock, Check, Pause, RotateCw, Copy } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { TAMER_EQUIPMENT_CATALOG, TAMER_CATALOG, DUNGEON_STAGES } from "@/lib/gameData";
import { grantTamerEquipmentOnServer, syncProgressToServer } from "@/lib/syncProgress";
import type { TamerAvatar, TamerSlotType } from "@/types/game";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { PixelButton } from "@/components/ui/PixelButton";
import { CurrencyPill } from "@/components/ui/CurrencyPill";
import { TamerSprite } from "@/components/ui/TamerSprite";
import { EquippedBadge } from "@/components/ui/EquippedBadge";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { cn, formatTamerStatBonus } from "@/lib/utils";

// Head-to-toe, with the two cosmetic-only slots (no gear exists for them yet) trailing at the end.
const SLOT_ORDER: TamerSlotType[] = ["Hat", "Shoulders", "Chest", "Gloves", "Legs", "Shoes", "Aura", "Wings"];

function campaignClearLabel(stageId: string): string {
  const stage = DUNGEON_STAGES.find((s) => s.id === stageId);
  if (!stage) return "Clear a Campaign stage";
  return `Clear World ${stage.world}-${stage.worldStageNumber}`;
}

function formatAvatarBuffs(avatar: TamerAvatar): string[] {
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
    lines.push(`+${value}% ATK for ${element} types`);
  }
  return lines;
}

export default function TamerPage() {
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerGear = useGameStore((s) => s.equippedTamerGear);
  const equipTamerGear = useGameStore((s) => s.equipTamerGear);
  const unequipTamerGear = useGameStore((s) => s.unequipTamerGear);
  const sealCoins = useGameStore((s) => s.currencies.sealCoins);
  const craftTamerEquipment = useGameStore((s) => s.craftTamerEquipment);
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
  const ownedBySlot = new Map(tamerInventory.map((t) => [t.slot, t]));

  function handleCraft(itemId: string) {
    setCraftingId(itemId);
    const crafted = craftTamerEquipment(itemId);
    if (crafted) {
      grantTamerEquipmentOnServer(itemId);
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
  for (const gear of tamerInventory) {
    if (equippedGearIds.has(gear.id)) {
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
          <h1 className="font-arcade text-lg glow-text-gold">Tamer</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Your own gear — separate from your Digimon&apos;s equipment.
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
              aria-label={spinning ? "Pause rotation" : "Resume rotation"}
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
              <span className="font-arcade text-[9px] text-zinc-400">ID:</span>
              <span className="font-arcade text-[10px] text-white">{profile.name}</span>
              <button
                onClick={handleCopy}
                className="ml-1 text-zinc-400 hover:text-gold transition-colors"
                aria-label="Copy Tamer ID"
              >
                {copied ? (
                  <span className="font-arcade text-[8px] text-emerald-400">COPIED</span>
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
          <div className="w-full space-y-2 rounded-xl border border-arcade-border bg-arcade-panel-light p-4">
            <p className="font-arcade text-[10px] sm:text-xs uppercase tracking-wide text-zinc-500 mb-2 border-b border-arcade-border pb-1">Avatar Buffs</p>
            <div className="flex flex-wrap gap-2">
              {formatAvatarBuffs(equippedTamer).map((line) => (
                <span key={line} className="text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                  {line}
                </span>
              ))}
            </div>
          </div>
          
          <div className="w-full rounded-xl border border-arcade-border bg-arcade-panel-light p-4 mt-2">
            <p className="font-arcade text-[10px] sm:text-xs uppercase tracking-wide text-zinc-500 mb-3 border-b border-arcade-border pb-2">Total Tamer Amplification</p>
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {SLOT_ORDER.map((slot) => {
            const owned = ownedBySlot.get(slot);
            const catalogItem = TAMER_EQUIPMENT_CATALOG.find((t) => t.slot === slot);
            const isEquipped = owned && equippedTamerGear[slot] === owned.id;

            if (owned) {
              return (
                <GlowPanel key={slot} accent={isEquipped ? "gold" : "none"} className="flex flex-col items-center gap-2 p-3 text-center">
                  <div className={cn("relative flex h-16 w-16 items-center justify-center rounded-xl border bg-arcade-panel-light pixel-frame", isEquipped ? "border-gold" : "border-arcade-border")}>
                    <Image src={owned.icon} alt="" width={48} height={48} className={cn("h-11 w-11 object-contain", isEquipped ? "" : "opacity-60")} />
                    {isEquipped && <EquippedBadge />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-arcade text-xs font-bold text-foreground">{slot}</p>
                    <p className="truncate text-[9px] text-zinc-500">
                      {owned.name} · {owned.setName}
                    </p>
                  </div>
                  <RarityBadge rarity={owned.rarity} />
                  {formatTamerStatBonus(owned.statBonus) && (
                    <p className="text-[8px] font-semibold text-emerald-600">{formatTamerStatBonus(owned.statBonus)}</p>
                  )}
                  {isEquipped ? (
                    <div className="w-full mt-1">
                      <span className="inline-flex items-center gap-1 font-arcade text-[8px] uppercase text-emerald-600 mb-1">
                        <Check className="h-2.5 w-2.5" /> Equipped
                      </span>
                      <PixelButton size="sm" variant="outline" className="w-full text-[10px] h-7" onClick={() => unequipTamerGear(slot)}>
                        Unequip
                      </PixelButton>
                    </div>
                  ) : (
                    <div className="w-full mt-1">
                      <PixelButton size="sm" variant="gold" className="w-full text-[10px] h-7" onClick={() => equipTamerGear(owned.id)}>
                        Equip
                      </PixelButton>
                    </div>
                  )}
                </GlowPanel>
              );
            }

            if (!catalogItem) {
              return (
                <GlowPanel
                  key={slot}
                  accent="none"
                  className="flex flex-col items-center justify-center gap-2 p-3 text-center opacity-60"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-arcade-border">
                    <Lock className="h-5 w-5 text-zinc-400" />
                  </div>
                  <p className="font-arcade text-xs font-bold text-zinc-500">{slot}</p>
                  <p className="text-[8px] text-zinc-400">No gear yet</p>
                </GlowPanel>
              );
            }

            const canCraft = catalogItem.source.kind === "craft";
            const cost = catalogItem.source.kind === "craft" ? catalogItem.source.sealCoinCost : null;
            const affordable = cost !== null && sealCoins >= cost;

            return (
              <GlowPanel
                key={slot}
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
                  <p className="font-arcade text-xs font-bold text-zinc-500">{slot}</p>
                  <p className="truncate text-[9px] text-zinc-400">
                    {catalogItem.name} · {catalogItem.setName}
                  </p>
                  {formatTamerStatBonus(catalogItem.statBonus) && (
                    <p className="text-[8px] text-zinc-400">{formatTamerStatBonus(catalogItem.statBonus)}</p>
                  )}
                </div>
                {canCraft ? (
                  <>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-[10px] font-semibold",
                        affordable ? "text-foreground" : "text-red-500"
                      )}
                    >
                      <SealCoinIcon className="h-3 w-3" /> {cost}
                    </span>
                    <PixelButton
                      size="sm"
                      variant="gold"
                      disabled={!affordable || craftingId === catalogItem.id}
                      onClick={() => handleCraft(catalogItem.id)}
                      className="w-full"
                    >
                      Craft
                    </PixelButton>
                  </>
                ) : catalogItem.source.kind === "campaign-clear" ? (
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-500">
                    {campaignClearLabel(catalogItem.source.stageId)}
                  </p>
                ) : null}
              </GlowPanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
