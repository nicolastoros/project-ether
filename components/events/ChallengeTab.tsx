"use client";

import { useMemo, useState } from "react";
import { Lock, Zap } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { CHALLENGE_EVENTS, RAID_BOSSES, getRaidEnemyCreatures, type RaidBoss, type RaidEvent } from "@/lib/raidBosses";
import { ITEM_CATALOG, STARTER_CREATURES } from "@/lib/gameData";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import { RaidBattleScreen } from "@/components/combat/RaidBattleScreen";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { cn, formatNumber, todayDateString } from "@/lib/utils";
import { useSyncGate } from "@/lib/useSyncGate";

const MAX_PARTY = 4;

// Orange for Hard, a bright crimson-red for Super — a Dokkan-style "the tier name itself tells you
// how dangerous this is" cue, keyed off the same -hard/-super id suffixes RaidBoss ids already use
// elsewhere (see ExtremeBattlesTab's getDifficultyImage).
function tierColorClass(bossId: string): string {
  if (bossId.includes("-super")) return "text-red-600 drop-shadow-[0_0_6px_rgba(220,38,38,0.65)]";
  if (bossId.includes("-hard")) return "text-orange-500";
  return "text-foreground";
}

/** Every Challenge trial is a real NvN team fight (not one scaled-up "boss"), but they aren't all
 * equally stacked — Scarlet Inferno Super really is all-Mythic, the others mix in SSR/Rare/Common,
 * so this checks the actual roster instead of assuming. */
function allMythic(creatureIds: string[]): boolean {
  return creatureIds.every((id) => STARTER_CREATURES.find((c) => c.id === id)?.rarity === "Mythic");
}

/** "Challenge" tab of the Events hub (see EventsHub.tsx) — Dokkan-style set-piece trials. Each
 * event is a real 3v3 team fight (Hard/Super or Super/Super2 tiers) that grants a flat chipset
 * reward on win — see RaidBoss.bonusItemRewards — spent crafting that set's Tamer gear in the Shop.
 * Reuses the exact same picker/battle flow as ExtremeBattlesTab.tsx, just keyed off CHALLENGE_EVENTS
 * instead of RAID_EVENTS, and with a locked "Coming Soon" state for events that have no boss yet. */
export function ChallengeTab() {
  const creatures = useGameStore((s) => s.creatures);
  const isOnExpedition = useGameStore((s) => s.isOnExpedition);
  const energy = useGameStore((s) => s.currencies.energy);
  const spendEnergy = useGameStore((s) => s.spendEnergy);
  const profile = useGameStore((s) => s.profile);
  const consumeChallengeAttempt = useGameStore((s) => s.consumeChallengeAttempt);

  const [selectedEvent, setSelectedEvent] = useState<RaidEvent | null>(null);
  const [pickingBoss, setPickingBoss] = useState<RaidBoss | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [fightingBoss, setFightingBoss] = useState<RaidBoss | null>(null);
  const [battleKey, setBattleKey] = useState(0);
  const { gating, runGated } = useSyncGate();

  const excludedIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of creatures) {
      if (isOnExpedition(c.id)) map.set(c.id, "ON EXPEDITION");
    }
    return map;
  }, [creatures, isOnExpedition]);

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
        onRematch={() => {
          // A Rematch is a real second fight, not a free retry — it must spend a Ticket exactly
          // like the initial "Challenge" click did, or the daily limit would be meaningless (just
          // keep tapping Rematch forever on your first Ticket). If none are left, drop all the way
          // back to the boss list (not just the picker — see onExit's own comment) so the
          // "No Tickets left today" banner is what the player actually sees.
          if (selectedEvent?.dailyAttemptLimit !== undefined) {
            if (!consumeChallengeAttempt(selectedEvent.id, selectedEvent.dailyAttemptLimit)) {
              setFightingBoss(null);
              setPickingBoss(null);
              setPlayerIds([]);
              return;
            }
          }
          setBattleKey((k) => k + 1);
        }}
        onExit={() => {
          // Must also clear pickingBoss, not just fightingBoss — otherwise "Return to Raids" drops
          // the player back into the character picker (pickingBoss stays truthy) instead of the
          // boss/difficulty list, letting them hit "Start Trial" again straight from there and
          // start a brand new fight without ever going through the Ticket-consuming "Challenge"
          // button again. That was a genuine free-attempts loophole, not just a wrong destination.
          setFightingBoss(null);
          setPickingBoss(null);
          setPlayerIds([]);
        }}
      />
    );
  }

  if (pickingBoss) {
    // Data-driven party cap: a boss with a fixed multi-enemy team (creatureIds, e.g. Scarlet
    // Inferno Super's 3 Mythics) caps the party at that same size for a true NvN fight; every
    // other boss keeps the classic "bring up to 4" raid party.
    const maxPartySize = pickingBoss.creatureIds?.length ?? MAX_PARTY;
    return (
      <div className="space-y-3">
        <div>
          <button onClick={() => setPickingBoss(null)} className="text-zinc-500 hover:text-white mb-2 text-xs">
             ← Back
          </button>
          <h1 className={cn("font-arcade text-lg", tierColorClass(pickingBoss.id))}>{pickingBoss.name}</h1>
          <p className="text-xs text-zinc-500">Choose up to {maxPartySize} creatures for this trial.</p>
        </div>
        <MultiCreaturePicker
          creatures={creatures}
          excludedIds={excludedIds}
          selectedIds={playerIds}
          maxCount={maxPartySize}
          onToggle={(id) =>
            setPlayerIds((prev) => {
              if (prev.includes(id)) return prev.filter((x) => x !== id);
              if (prev.length >= maxPartySize) return prev;
              return [...prev, id];
            })
          }
          confirmLabel="Start Trial"
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
    const eventBosses = RAID_BOSSES.filter((b) => selectedEvent.bossIds.includes(b.id));
    // Same "don't trust the raw stored count, re-check the date first" rule as every other daily/
    // weekly attempt counter in this app (see ExtraTab's identical comment) — otherwise this would
    // show yesterday's leftover count instead of today's fresh one until an attempt is actually made.
    const attemptsUsedToday =
      selectedEvent.dailyAttemptLimit !== undefined && profile.dailyChallengeAttemptsDate === todayDateString()
        ? profile.dailyChallengeAttempts?.[selectedEvent.id] ?? 0
        : 0;
    const attemptsLeft = selectedEvent.dailyAttemptLimit !== undefined ? selectedEvent.dailyAttemptLimit - attemptsUsedToday : null;
    const outOfAttempts = attemptsLeft !== null && attemptsLeft <= 0;

    return (
      <div className="space-y-4">
        <div>
          <button onClick={() => setSelectedEvent(null)} className="text-zinc-500 hover:text-white mb-2 text-xs">
             ← Back to Events
          </button>
          <h1 className="font-arcade text-lg glow-text-gold">{selectedEvent.name}</h1>
          <p className="mt-1 text-xs text-zinc-500">{selectedEvent.description}</p>
        </div>

        {selectedEvent.bannerImage && (
          <div className="rounded-xl border border-arcade-border overflow-hidden bg-black flex items-center justify-center">
            <img src={selectedEvent.bannerImage} alt={selectedEvent.name} className="w-full max-w-[600px] h-auto object-cover" />
          </div>
        )}

        {attemptsLeft !== null && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-center font-arcade text-xs uppercase tracking-wide",
              outOfAttempts
                ? "border-red-500/40 bg-red-500/10 text-red-500"
                : "border-arcade-border bg-arcade-panel-light text-foreground"
            )}
          >
            {outOfAttempts
              ? "No Tickets left today — come back tomorrow"
              : `${attemptsLeft}/${selectedEvent.dailyAttemptLimit} Tickets left today (shared across every tier below)`}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {eventBosses.map((boss) => (
            <GlowPanel key={boss.id} accent="gold" className="flex flex-col sm:flex-row gap-4 p-4 items-center relative overflow-hidden bg-arcade-panel-light/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              <div className="min-w-0 flex-1 text-center sm:text-left z-10">
                <p className={cn("font-arcade text-sm font-bold", tierColorClass(boss.id))}>{boss.name}</p>
                <p className="text-xs text-zinc-400 mt-1">{boss.description}</p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-zinc-500 mt-2">
                  <span className="inline-flex items-center gap-1 font-arcade">
                    <Zap className="h-3 w-3 text-neon" /> {boss.staminaCost} STAMINA
                  </span>
                  <span className="inline-flex items-center gap-1 font-arcade">
                    <GoldCoinIcon className="h-3 w-3" /> {formatNumber(boss.rewardGold)} GOLD
                  </span>
                  {boss.creatureIds && (
                    <span className={cn("inline-flex items-center gap-1 font-arcade", allMythic(boss.creatureIds) && "text-red-600")}>
                      {boss.creatureIds.length}v{boss.creatureIds.length}
                      {allMythic(boss.creatureIds) && " · ALL MYTHIC"}
                    </span>
                  )}
                </div>

                {boss.bonusItemRewards && boss.bonusItemRewards.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                    {boss.bonusItemRewards.map((reward) => {
                      const rewardItem = ITEM_CATALOG.find((i) => i.id === reward.itemId);
                      if (!rewardItem) return null;
                      return (
                        <span
                          key={reward.itemId}
                          className="inline-flex items-center gap-1.5 rounded-full border border-arcade-border bg-arcade-panel px-2.5 py-1 font-arcade text-[10px] font-semibold text-foreground"
                        >
                          <ItemIcon item={rewardItem} className="h-3.5 w-3.5" /> +{reward.amount} {rewardItem.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <PixelButton
                variant="gold"
                className="w-full sm:w-32 shrink-0 z-10 mt-2 sm:mt-0"
                disabled={energy < boss.staminaCost || outOfAttempts}
                onClick={() => {
                  if (selectedEvent.dailyAttemptLimit !== undefined) {
                    if (!consumeChallengeAttempt(selectedEvent.id, selectedEvent.dailyAttemptLimit)) return;
                  }
                  setPickingBoss(boss);
                  setPlayerIds([]);
                }}
              >
                {outOfAttempts ? "No Tickets" : "Challenge"}
              </PixelButton>
            </GlowPanel>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Set Trials</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Win a trial for a chance at that set&apos;s Tamer gear pieces. More sets forge soon!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CHALLENGE_EVENTS.map((evt) => {
          const isLocked = evt.bossIds.length === 0;
          return (
            <button
              key={evt.id}
              disabled={isLocked}
              onClick={() => !isLocked && setSelectedEvent(evt)}
              className={
                isLocked
                  ? "group relative overflow-hidden rounded-xl border-2 border-arcade-border bg-arcade-panel-light text-left cursor-default"
                  : "group relative overflow-hidden rounded-xl border-2 border-arcade-border bg-arcade-panel-light text-left transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-gold hover:shadow-gold/30"
              }
            >
              {evt.bannerImage && (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-black">
                  <img
                    src={evt.bannerImage}
                    alt={evt.name}
                    // object-contain (not cover) — these banners are full title art with text
                    // running edge-to-edge, so cropping to fill the box (cover) was clipping
                    // letters off the sides at some widths. Contain always shows the whole banner,
                    // at any viewport size, at the cost of thin letterboxing when an image's own
                    // aspect ratio doesn't exactly match the box's.
                    className={cn(
                      "h-full w-full object-contain",
                      isLocked && "opacity-40 grayscale"
                    )}
                  />
                </div>
              )}

              {isLocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/60">
                    <Lock className="h-5 w-5 text-zinc-300" />
                  </div>
                  <span className="font-arcade text-[10px] uppercase tracking-wide text-zinc-300">Coming Soon</span>
                </div>
              )}

              {/* Dark gradient overlay for text readability */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-6">
                <p className="font-arcade text-xs text-white">{evt.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
