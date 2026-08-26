"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Compass, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/lib/store";
import { EXPEDITION_DEFS, ITEM_CATALOG, type ExpeditionDef } from "@/lib/gameData";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { partyPower } from "@/lib/power";
import { startExpeditionOnServer, collectExpeditionOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { formatNumber } from "@/lib/utils";

const MAX_EXPEDITION_PARTY = 6;

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface CollectResult {
  success: boolean;
  gold: number;
  sealCoins: number;
  items: { itemId: string; quantity: number }[];
}

export default function ExpeditionsPage() {
  const creatures = useGameStore((s) => s.creatures);
  const activeExpeditions = useGameStore((s) => s.activeExpeditions);
  const isOnExpedition = useGameStore((s) => s.isOnExpedition);
  const startExpedition = useGameStore((s) => s.startExpedition);
  const collectExpedition = useGameStore((s) => s.collectExpedition);

  const [pickingDef, setPickingDef] = useState<ExpeditionDef | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<CollectResult | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Ticks once a second so countdowns + "Collect" enabling stay live without a manual refresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const excludedIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of creatures) {
      if (isOnExpedition(c.id)) set.add(c.id);
    }
    return set;
  }, [creatures, isOnExpedition]);

  const selectedPower = useMemo(
    () => partyPower(selectedIds.map((id) => creatures.find((c) => c.id === id)).filter((c): c is (typeof creatures)[number] => Boolean(c))),
    [selectedIds, creatures]
  );

  if (pickingDef) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">{pickingDef.name}</h1>
          <p className="text-xs text-zinc-500">
            Send up to {MAX_EXPEDITION_PARTY} creatures — stronger/higher-level picks raise your
            success chance. Party power: {formatNumber(selectedPower)} / needs ~{formatNumber(pickingDef.requiredPower)}
          </p>
        </div>
        <MultiCreaturePicker
          creatures={creatures}
          excludedIds={excludedIds}
          selectedIds={selectedIds}
          maxCount={MAX_EXPEDITION_PARTY}
          onToggle={(id) =>
            setSelectedIds((prev) => {
              if (prev.includes(id)) return prev.filter((x) => x !== id);
              if (prev.length >= MAX_EXPEDITION_PARTY) return prev;
              return [...prev, id];
            })
          }
          confirmLabel="Send"
          onConfirm={() => {
            const expedition = startExpedition(pickingDef.id, selectedIds);
            if (expedition) startExpeditionOnServer(expedition);
            setPickingDef(null);
            setSelectedIds([]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Expeditions</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Send creatures out for gold, items, and Seal Coins — they finish after a set time.
        </p>
      </div>

      {activeExpeditions.length > 0 && (
        <div className="space-y-2">
          <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Out Now</p>
          {activeExpeditions.map((expedition) => {
            const def = EXPEDITION_DEFS.find((d) => d.id === expedition.defId);
            if (!def) return null;
            const remaining = expedition.startedAt + expedition.durationMs - now;
            const ready = remaining <= 0;
            return (
              <GlowPanel key={expedition.id} accent={ready ? "neon" : "none"} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">{def.name}</p>
                  <p className="text-[10px] text-zinc-500">
                    {expedition.creatureIds.length} creature{expedition.creatureIds.length > 1 ? "s" : ""} sent
                  </p>
                </div>
                {ready ? (
                  <PixelButton
                    variant="neon"
                    size="sm"
                    onClick={() => {
                      const outcome = collectExpedition(expedition.id);
                      if (outcome) {
                        collectExpeditionOnServer(expedition.id);
                        syncProgressToServer();
                        setResult(outcome);
                      }
                    }}
                  >
                    Collect
                  </PixelButton>
                ) : (
                  <span className="font-mono text-xs text-zinc-500">{formatCountdown(remaining)}</span>
                )}
              </GlowPanel>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Available</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {EXPEDITION_DEFS.map((def) => (
            <GlowPanel key={def.id} accent="gold" className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold bg-gold/10">
                  <Compass className="h-4 w-4 text-gold-bright" />
                </div>
                <div className="min-w-0">
                  <p className="font-arcade text-xs font-bold text-foreground">{def.name}</p>
                  <p className="text-[10px] text-zinc-500">{formatDuration(def.durationMs)}</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600">
                {def.baseSuccessRate}% base success · needs ~{formatNumber(def.requiredPower)} power
              </p>
              <p className="inline-flex items-center gap-1 text-[10px] text-foreground">
                <GoldCoinIcon className="h-3 w-3" /> {formatNumber(def.rewardGoldMin)}-{formatNumber(def.rewardGoldMax)}
              </p>
              <PixelButton
                variant="gold"
                size="sm"
                className="mt-1 w-full"
                onClick={() => {
                  setPickingDef(def);
                  setSelectedIds([]);
                }}
              >
                Send
              </PixelButton>
            </GlowPanel>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <GlowPanel accent={result.success ? "gold" : "none"} className="w-full max-w-sm space-y-3 p-5 text-center">
                <button
                  onClick={() => setResult(null)}
                  aria-label="Close"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-arcade-border bg-white text-zinc-500 shadow-sm hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <h2 className={result.success ? "font-arcade text-sm glow-text-gold" : "font-arcade text-sm text-zinc-500"}>
                  {result.success ? "Expedition Successful!" : "Expedition Failed"}
                </h2>
                {result.success ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-3 text-xs text-zinc-600">
                      <span className="inline-flex items-center gap-1">
                        <GoldCoinIcon className="h-3.5 w-3.5" /> +{formatNumber(result.gold)}
                      </span>
                      {result.sealCoins > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <SealCoinIcon className="h-3.5 w-3.5" /> +{result.sealCoins}
                        </span>
                      )}
                    </div>
                    {result.items.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {result.items.map((drop, i) => {
                          const item = ITEM_CATALOG.find((it) => it.id === drop.itemId);
                          if (!item) return null;
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-full border border-arcade-border bg-arcade-panel-light px-2 py-1 text-[10px] text-foreground"
                            >
                              <ItemIcon item={item} className="h-3 w-3" /> +{drop.quantity} {item.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <Check className="mx-auto h-6 w-6 text-emerald-600" />
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">Your team came back empty-handed this time.</p>
                )}
                <PixelButton variant="gold" className="w-full" onClick={() => setResult(null)}>
                  Nice
                </PixelButton>
              </GlowPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
