"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Crown, Trophy, Medal } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { STARTER_CREATURES, ITEM_CATALOG } from "@/lib/gameData";
import {
  currentOverclockBoss,
  nextOverclockResetAt,
  OVERCLOCK_REWARD_CHIPSET_AMOUNT,
  OVERCLOCK_REWARD_CHIPSET_ITEM_IDS,
  OVERCLOCK_REWARD_LACRIMA_BY_RANK,
} from "@/lib/overclock";
import { OverclockBattleScreen } from "@/components/combat/OverclockBattleScreen";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { cn, formatNumber } from "@/lib/utils";

const MAX_PARTY = 2;

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  damage: number;
}

interface HistoryEntry {
  weekId: string;
  bossId: string;
  bossName: string;
  bestDamage: number;
  rank: number | null;
}

interface LeaderboardData {
  weekNumber: number;
  bossName: string;
  rankings: LeaderboardEntry[];
  computedAt: number;
  nextUpdateAt: number;
  yourRank: number | null;
  history: HistoryEntry[];
}

/** "Xd Yh" / "Xh Ym" / "Xm" countdown to a timestamp, ticking once a minute — coarse on purpose,
 * this is a "come back later" cue, not a stopwatch. */
function useCountdownTo(targetMs: number | null): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    // Both branches live inside tick() (called once synchronously, then on each interval tick)
    // rather than as a direct setState call in the effect body itself — same shape as
    // lib/useResetCountdown.ts's existing countdown hooks.
    const tick = () => {
      if (!targetMs) {
        setLabel("");
        return;
      }
      const msLeft = Math.max(0, targetMs - Date.now());
      const days = Math.floor(msLeft / 86_400_000);
      const hours = Math.floor((msLeft % 86_400_000) / 3_600_000);
      const minutes = Math.floor((msLeft % 3_600_000) / 60_000);
      if (days > 0) setLabel(`${days}d ${hours}h`);
      else if (hours > 0) setLabel(`${hours}h ${minutes}m`);
      else setLabel(`${minutes}m`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [targetMs]);
  return label;
}

const RANK_ICON: Record<number, typeof Crown> = { 1: Crown, 2: Trophy, 3: Medal };

function RewardTierRow({ rank }: { rank: 1 | 2 | 3 }) {
  const Icon = RANK_ICON[rank];
  const chipItems = OVERCLOCK_REWARD_CHIPSET_ITEM_IDS.map((id) => ITEM_CATALOG.find((i) => i.id === id)).filter(
    (i): i is NonNullable<typeof i> => Boolean(i)
  );
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-arcade-border bg-arcade-panel-light px-3 py-2.5">
      <span className="flex items-center gap-2 font-arcade text-[10px] uppercase tracking-wide text-foreground">
        <Icon className={cn("h-4 w-4", rank === 1 ? "text-gold-bright" : rank === 2 ? "text-zinc-400" : "text-amber-700")} />
        {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} Place
      </span>
      <span className="flex items-center gap-2 text-xs text-zinc-600">
        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
          <Image src="/assets/objects/lacrima.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
          {OVERCLOCK_REWARD_LACRIMA_BY_RANK[rank]}
        </span>
        {chipItems.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1">
            <ItemIcon item={item} className="h-4 w-4" /> {OVERCLOCK_REWARD_CHIPSET_AMOUNT}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Overclock's pre-battle hub — info screen (rank/rewards/history/Start) -> picker (max 2, max 1
 * LR) -> battle -> back to info with a refreshed leaderboard fetch. No energy/Ticket cost at all
 * (unlike every other Challenge trial) — repeatable on purpose, since the whole point is climbing
 * the weekly ranking through as many attempts as the player wants. */
export function OverclockHome() {
  const creatures = useGameStore((s) => s.creatures);
  const isOnExpedition = useGameStore((s) => s.isOnExpedition);
  const overclockBestDamage = useGameStore((s) => s.profile.overclockBestDamage ?? 0);

  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [fighting, setFighting] = useState(false);
  const [battleKey, setBattleKey] = useState(0);

  const boss = currentOverclockBoss();
  const bossCreature = STARTER_CREATURES.find((c) => c.id === boss.creatureId);

  // Used to refresh after a battle (an event handler, not an effect — setLoading(true) there is
  // fine). The initial mount fetch below is a separate, inline effect instead of just calling this
  // directly, since `loading` already starts true — no synchronous setState needed in that effect.
  const fetchLeaderboard = () => {
    setLoading(true);
    fetch("/api/overclock/leaderboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch("/api/overclock/leaderboard")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const nextUpdateLabel = useCountdownTo(data?.nextUpdateAt ?? null);
  const resetLabel = useCountdownTo(nextOverclockResetAt());

  // Max 1 LR among the 2 picks — once one is selected, every OTHER owned LR gets excluded (same
  // Map<id, reason> mechanism MultiCreaturePicker already uses for "ON EXPEDITION").
  const excludedIds = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of creatures) {
      if (isOnExpedition(c.id)) map.set(c.id, "ON EXPEDITION");
    }
    const hasLR = playerIds.some((id) => creatures.find((c) => c.id === id)?.rarity === "LR");
    if (hasLR) {
      for (const c of creatures) {
        if (c.rarity === "LR" && !playerIds.includes(c.id)) map.set(c.id, "MAX 1 LR");
      }
    }
    return map;
  }, [creatures, isOnExpedition, playerIds]);

  if (!bossCreature) {
    return <p className="text-center text-xs text-zinc-500">This week&apos;s boss isn&apos;t available yet.</p>;
  }

  if (fighting) {
    const pickedCreatures = playerIds
      .map((id) => creatures.find((c) => c.id === id))
      .filter((c): c is (typeof creatures)[number] => Boolean(c));
    return (
      <OverclockBattleScreen
        key={battleKey}
        boss={boss}
        bossCreature={bossCreature}
        playerCreatures={pickedCreatures}
        onRematch={() => setBattleKey((k) => k + 1)}
        onExit={() => {
          setFighting(false);
          setPicking(false);
          setPlayerIds([]);
          fetchLeaderboard();
        }}
      />
    );
  }

  if (picking) {
    return (
      <div className="space-y-3">
        <div>
          <button onClick={() => setPicking(false)} className="text-zinc-500 hover:text-white mb-2 text-xs">
             ← Back
          </button>
          <h1 className="font-arcade text-lg glow-text-gold">{boss.name}</h1>
          <p className="text-xs text-zinc-500">Choose up to {MAX_PARTY} creatures — max 1 LR.</p>
        </div>
        <MultiCreaturePicker
          creatures={creatures}
          excludedIds={excludedIds}
          selectedIds={playerIds}
          maxCount={MAX_PARTY}
          onToggle={(id) =>
            setPlayerIds((prev) => {
              if (prev.includes(id)) return prev.filter((x) => x !== id);
              if (prev.length >= MAX_PARTY) return prev;
              return [...prev, id];
            })
          }
          confirmLabel="Start"
          confirmDisabled={playerIds.length === 0}
          onConfirm={() => setFighting(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Overclock</h1>
        <p className="mt-1 text-xs text-zinc-500">A weekly ranked boss — repeat as many times as you want, your best run counts.</p>
      </div>

      {loading ? (
        <LoadingOverlay show label="Loading this week's Overclock..." />
      ) : (
        <>
          <GlowPanel accent="gold" className="flex items-center gap-4 p-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame">
              <CreatureSprite creature={bossCreature} className="h-16 w-16" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-arcade text-[10px] uppercase tracking-wide text-gold-bright">Week {data?.weekNumber ?? "—"}</p>
              <p className="text-base font-semibold text-foreground">{data?.bossName ?? boss.name}</p>
              <p className="text-[10px] text-zinc-500">Ranking updates in {nextUpdateLabel || "…"} · Resets in {resetLabel || "…"}</p>
            </div>
          </GlowPanel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light px-3 py-2">
                <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Your Best This Week</p>
                <p className="font-arcade text-lg text-gold-bright">{formatNumber(overclockBestDamage)}</p>
                {data?.yourRank && <p className="text-[10px] text-zinc-500">Currently rank #{data.yourRank}</p>}
              </div>

              <div className="space-y-1.5">
                <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Rewards</p>
                <RewardTierRow rank={1} />
                <RewardTierRow rank={2} />
                <RewardTierRow rank={3} />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Leaderboard</p>
              <GlowPanel accent="none" className="max-h-64 overflow-y-auto p-2">
                {data && data.rankings.length > 0 ? (
                  <div className="space-y-1">
                    {data.rankings.slice(0, 20).map((entry) => (
                      <div
                        key={entry.userId}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                          entry.rank === data.yourRank ? "bg-gold/15 text-gold-ink font-semibold" : "text-zinc-600"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-arcade text-[10px] text-zinc-400">#{entry.rank}</span>
                          <span className="truncate">{entry.displayName}</span>
                        </span>
                        <span className="shrink-0 font-mono">{formatNumber(entry.damage)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-3 text-center text-xs text-zinc-500">No scores yet this week — be the first!</p>
                )}
              </GlowPanel>

              {data && data.history.length > 0 && (
                <>
                  <p className="pt-2 font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Previous Weeks</p>
                  <div className="space-y-1">
                    {data.history.map((h) => (
                      <div key={h.weekId} className="flex items-center justify-between gap-2 rounded-lg border border-arcade-border bg-arcade-panel-light px-2.5 py-1.5 text-[10px] text-zinc-600">
                        <span>{h.bossName}</span>
                        <span className="flex items-center gap-2">
                          {h.rank && <span className="font-arcade text-gold-bright">#{h.rank}</span>}
                          <span className="font-mono">{formatNumber(h.bestDamage)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setPicking(true)}
        className="mx-auto block w-fit"
      >
        <Image src="/assets/ui/start_button.png" alt="Start" width={2172} height={724} className="h-auto w-48" />
      </button>
    </div>
  );
}
