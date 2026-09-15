"use client";

import { useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { RAID_BOSSES, RAID_EVENTS, getRaidEnemyCreatures, type RaidBoss, type RaidEvent } from "@/lib/raidBosses";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import { RaidBattleScreen } from "@/components/combat/RaidBattleScreen";
import { BattleControls } from "@/components/combat/BattleControls";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { formatNumber } from "@/lib/utils";
import { useSyncGate } from "@/lib/useSyncGate";
import { getRaidBossDescription, getRaidEventDescription } from "@/lib/i18n/raidDescriptions";
import { useT } from "@/lib/i18n/useT";

const MAX_RAID_PARTY = 4;

function getDifficultyImage(bossId: string) {
  if (bossId.includes("-super3")) return "/assets/events/super3.png";
  if (bossId.includes("-super2")) return "/assets/events/super2.png";
  if (bossId.includes("-super")) return "/assets/events/super.png";
  if (bossId.includes("-hard")) return "/assets/events/hard.png";
  return null;
}

/** "Extreme Battles" tab of the Events hub (see EventsHub.tsx) — was the standalone /raid page
 * (its own sidebar nav item) before Events grew Dokkan-style category tabs; moved here as-is
 * since it already grants Awaken Coins on a win, matching this category's "medals for Awakening"
 * purpose exactly. */
export function ExtremeBattlesTab() {
  const creatures = useGameStore((s) => s.creatures);
  const isOnExpedition = useGameStore((s) => s.isOnExpedition);
  const energy = useGameStore((s) => s.currencies.energy);
  const spendEnergy = useGameStore((s) => s.spendEnergy);
  const language = useGameStore((s) => s.language);
  const t = useT();

  const [selectedEvent, setSelectedEvent] = useState<RaidEvent | null>(null);
  const [pickingBoss, setPickingBoss] = useState<RaidBoss | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [fightingBoss, setFightingBoss] = useState<RaidBoss | null>(null);
  const [battleKey, setBattleKey] = useState(0);
  const { gating, runGated } = useSyncGate();

  const excludedIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of creatures) {
      if (isOnExpedition(c.id)) map.set(c.id, t("common.badge_on_expedition"));
    }
    return map;
  }, [creatures, isOnExpedition, t]);

  if (fightingBoss) {
    const playerCreatures = playerIds
      .map((id) => creatures.find((c) => c.id === id))
      .filter((c): c is (typeof creatures)[number] => Boolean(c));
    return (
      <RaidBattleScreen
        key={battleKey}
        boss={fightingBoss}
        bossCreatures={getRaidEnemyCreatures(fightingBoss)}
        playerCreatures={playerCreatures}
        onRematch={() => setBattleKey((k) => k + 1)}
        onExit={() => {
          setFightingBoss(null);
          setPlayerIds([]);
        }}
      />
    );
  }

  if (pickingBoss) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-3">
          <div>
            <button onClick={() => setPickingBoss(null)} className="text-zinc-500 hover:text-white mb-2 text-xs">
               ← {t("common.back_to_stages")}
            </button>
            <h1 className="font-arcade text-lg glow-text-gold">{pickingBoss.name}</h1>
            <p className="text-xs text-zinc-500">
              {t("battle.choose_up_to_prefix")}{MAX_RAID_PARTY}{t("battle.choose_up_to_raid_suffix")}
            </p>
          </div>
          <BattleControls />
        </div>
        <MultiCreaturePicker
          creatures={creatures}
          excludedIds={excludedIds}
          selectedIds={playerIds}
          maxCount={MAX_RAID_PARTY}
          onToggle={(id) =>
            setPlayerIds((prev) => {
              if (prev.includes(id)) return prev.filter((x) => x !== id);
              if (prev.length >= MAX_RAID_PARTY) return prev;
              return [...prev, id];
            })
          }
          confirmLabel={t("battle.start_raid")}
          confirmDisabled={playerIds.length === 0 || energy < pickingBoss.staminaCost}
          onConfirm={() =>
            runGated(() => {
              if (!spendEnergy(pickingBoss.staminaCost)) return;
              setFightingBoss(pickingBoss);
            })
          }
        />
        <LoadingOverlay show={gating} />
      </div>
    );
  }

  if (selectedEvent) {
    const eventBosses = RAID_BOSSES.filter(b => selectedEvent.bossIds.includes(b.id));
    return (
      <div className="space-y-4">
        <div>
          <button onClick={() => setSelectedEvent(null)} className="text-zinc-500 hover:text-white mb-2 text-xs">
             ← {t("common.back_to_events")}
          </button>
          <h1 className="font-arcade text-lg glow-text-gold">{selectedEvent.name}</h1>
          <p className="mt-1 text-xs text-zinc-500">{getRaidEventDescription(selectedEvent, language)}</p>
        </div>

        {selectedEvent.bannerImage && (
          <div className="rounded-xl border border-arcade-border overflow-hidden bg-black flex items-center justify-center">
             <img src={selectedEvent.bannerImage} alt={selectedEvent.name} className="w-full max-w-[600px] h-auto object-cover" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {eventBosses.map((boss) => {
            const diffImg = getDifficultyImage(boss.id);
            return (
              <GlowPanel key={boss.id} accent="gold" className="flex flex-col sm:flex-row gap-4 p-4 items-center relative overflow-hidden bg-arcade-panel-light/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                {diffImg && (
                  <div className="w-32 h-14 sm:w-40 sm:h-16 shrink-0 relative flex justify-center items-center">
                    <img
                      src={diffImg}
                      className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] pointer-events-none transition-transform group-hover:scale-105"
                      alt="Difficulty"
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1 text-center sm:text-left z-10">
                  <p className="font-arcade text-sm font-bold text-foreground glow-text-gold">{boss.name.replace(/\s*\(.*\)\s*/, '')}</p>
                  <p className="text-xs text-zinc-400 mt-1">{getRaidBossDescription(boss, language)}</p>

                  <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-zinc-500 mt-2">
                    <span className="inline-flex items-center gap-1 font-arcade">
                      <Zap className="h-3 w-3 text-neon" /> {boss.staminaCost} {t("battle.stamina_label")}
                    </span>
                    <span className="inline-flex items-center gap-1 font-arcade">
                      <GoldCoinIcon className="h-3 w-3" /> {formatNumber(boss.rewardGold)} {t("battle.gold_label")}
                    </span>
                  </div>
                </div>

                <PixelButton
                  variant="gold"
                  className="w-full sm:w-32 shrink-0 z-10 mt-2 sm:mt-0"
                  disabled={energy < boss.staminaCost}
                  onClick={() => {
                    setPickingBoss(boss);
                    setPlayerIds([]);
                  }}
                >
                  {t("battle.challenge_button")}
                </PixelButton>
              </GlowPanel>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">{t("raid.events_title")}</h1>
        <p className="mt-1 text-xs text-zinc-500">{t("raid.events_subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {RAID_EVENTS.map((evt) => (
          <button
            key={evt.id}
            onClick={() => setSelectedEvent(evt)}
            className="group relative overflow-hidden rounded-xl border-2 border-arcade-border bg-arcade-panel-light text-left transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-gold hover:shadow-gold/30"
          >
            {evt.bannerImage ? (
              <img src={evt.bannerImage} alt={evt.name} className="w-full h-auto max-h-[190px] object-cover object-[center_75%]" />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center p-4">
                 <p className="font-arcade text-base text-gold glow-text-gold">{evt.name}</p>
              </div>
            )}

            {/* Dark gradient overlay for text readability */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-6">
               <p className="font-arcade text-xs text-white">{evt.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
