"use client";

import { useState } from "react";
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
  if (avatar.buffs.hpPercent) lines.push(`+${avatar.buffs.hpPercent}% HP to all Digimon`);
  if (avatar.buffs.atkPercent) lines.push(`+${avatar.buffs.atkPercent}% ATK to all Digimon`);
  if (avatar.buffs.defPercent) lines.push(`+${avatar.buffs.defPercent}% DEF to all Digimon`);
  if (avatar.buffs.spdPercent) lines.push(`+${avatar.buffs.spdPercent}% SPD to all Digimon`);
  for (const [element, value] of Object.entries(avatar.buffs.elementAtkBonus ?? {})) {
    lines.push(`+${value}% ATK for ${element}-type Digimon`);
  }
  return lines;
}

export default function TamerPage() {
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const sealCoins = useGameStore((s) => s.currencies.sealCoins);
  const craftTamerEquipment = useGameStore((s) => s.craftTamerEquipment);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);
  const profile = useGameStore((s) => s.profile);
  const [craftingId, setCraftingId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(true);
  const [copied, setCopied] = useState(false);

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
          <div className="w-full space-y-1.5 rounded-xl border border-arcade-border bg-arcade-panel-light p-3">
            <p className="font-arcade text-[9px] uppercase tracking-wide text-zinc-500">Buffs</p>
            {formatAvatarBuffs(equippedTamer).map((line) => (
              <p key={line} className="text-[11px] font-semibold text-emerald-600">
                {line}
              </p>
            ))}
          </div>
        </GlowPanel>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {SLOT_ORDER.map((slot) => {
            const owned = ownedBySlot.get(slot);
            const catalogItem = TAMER_EQUIPMENT_CATALOG.find((t) => t.slot === slot);

            if (owned) {
              return (
                <GlowPanel key={slot} accent="gold" className="flex flex-col items-center gap-2 p-3 text-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame">
                    <Image src={owned.icon} alt="" width={48} height={48} className="h-11 w-11 object-contain" />
                    <EquippedBadge />
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
                  <span className="inline-flex items-center gap-1 font-arcade text-[8px] uppercase text-emerald-600">
                    <Check className="h-2.5 w-2.5" /> Equipped
                  </span>
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
