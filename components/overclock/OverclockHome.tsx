"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Crown, Trophy, Medal, RefreshCw, Swords } from "lucide-react";
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
import { useT } from "@/lib/i18n/useT";

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
  totalPlayers: number;
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

function RewardTierRow({ rank, t }: { rank: 1 | 2 | 3; t: ReturnType<typeof useT> }) {
  const Icon = RANK_ICON[rank];
  const chipItems = OVERCLOCK_REWARD_CHIPSET_ITEM_IDS.map((id) => ITEM_CATALOG.find((i) => i.id === id)).filter(
    (i): i is NonNullable<typeof i> => Boolean(i)
  );
  const placeLabel = rank === 1 ? t("overclock.place_1st") : rank === 2 ? t("overclock.place_2nd") : t("overclock.place_3rd");
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-arcade-border bg-arcade-panel-light px-3 py-3">
      <span className="flex items-center gap-2 font-arcade text-[11px] uppercase tracking-wide text-foreground sm:text-xs">
        <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", rank === 1 ? "text-gold-bright" : rank === 2 ? "text-zinc-400" : "text-amber-700")} />
        {placeLabel}{t("overclock.place_suffix")}
      </span>
      <span className="flex items-center gap-3 text-sm text-zinc-600">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Image src="/assets/objects/lacrima.png" alt="" width={20} height={20} className="h-5 w-5 object-contain sm:h-6 sm:w-6" />
          {OVERCLOCK_REWARD_LACRIMA_BY_RANK[rank]}
        </span>
        {chipItems.map((item) => (
          <span key={item.id} className="inline-flex items-center gap-1.5">
            <ItemIcon item={item} className="h-5 w-5 sm:h-6 sm:w-6" /> {OVERCLOCK_REWARD_CHIPSET_AMOUNT}
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
  const t = useT();
  const creatures = useGameStore((s) => s.creatures);
  const isOnExpedition = useGameStore((s) => s.isOnExpedition);
  const overclockBestDamage = useGameStore((s) => s.profile.overclockBestDamage ?? 0);
  const myUserId = useGameStore((s) => s.profile.id);

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
      if (isOnExpedition(c.id)) map.set(c.id, t("common.badge_on_expedition"));
    }
    const hasLR = playerIds.some((id) => creatures.find((c) => c.id === id)?.rarity === "LR");
    if (hasLR) {
      for (const c of creatures) {
        if (c.rarity === "LR" && !playerIds.includes(c.id)) map.set(c.id, t("common.badge_max_one_lr"));
      }
    }
    return map;
  }, [creatures, isOnExpedition, playerIds, t]);

  if (!bossCreature) {
    return <p className="text-center text-xs text-zinc-500">{t("overclock.boss_unavailable")}</p>;
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
             {t("overclock.back")}
          </button>
          <h1 className="font-arcade text-lg glow-text-gold">{boss.name}</h1>
          <p className="text-xs text-zinc-500">{t("overclock.choose_up_to_prefix")}{MAX_PARTY}{t("overclock.choose_up_to_suffix")}</p>
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
          confirmLabel={t("overclock.start")}
          confirmDisabled={playerIds.length === 0}
          onConfirm={() => setFighting(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold sm:text-xl">{t("overclock.title")}</h1>
        <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{t("overclock.subtitle")}</p>
      </div>

      {loading ? (
        <LoadingOverlay show label={t("overclock.loading")} />
      ) : (
        <>
          <GlowPanel accent="gold" className="flex items-center gap-4 p-4" data-tour="overclock-boss">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-gold bg-arcade-panel-light pixel-frame sm:h-24 sm:w-24">
              <CreatureSprite creature={bossCreature} className="h-16 w-16 sm:h-20 sm:w-20" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-arcade text-[11px] uppercase tracking-wide text-gold-bright sm:text-xs">{t("overclock.week_prefix")}{data?.weekNumber ?? "—"}</p>
              <p className="text-base font-semibold text-foreground sm:text-lg">{data?.bossName ?? boss.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{t("overclock.ranking_updates_prefix")}{nextUpdateLabel || "…"}{t("overclock.resets_in_mid")}{resetLabel || "…"}</p>
            </div>
          </GlowPanel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-xl border border-arcade-border bg-arcade-panel-light px-3 py-3" data-tour="overclock-best">
                <p className="font-arcade text-[11px] uppercase tracking-wide text-zinc-500 sm:text-xs">{t("overclock.your_best_this_week")}</p>
                <p className="font-arcade text-xl text-gold-bright sm:text-2xl">{formatNumber(overclockBestDamage)}</p>
                {data?.yourRank ? (
                  <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                    {t("overclock.currently_rank_prefix")}<span className="font-semibold text-gold-ink">#{data.yourRank}</span>{t("overclock.of_suffix")}{formatNumber(data.totalPlayers)}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{t("overclock.not_ranked_yet")}</p>
                )}
              </div>

              <div className="space-y-1.5" data-tour="overclock-rewards">
                <p className="font-arcade text-[11px] uppercase tracking-wide text-zinc-500 sm:text-xs">{t("overclock.rewards")}</p>
                <RewardTierRow rank={1} t={t} />
                <RewardTierRow rank={2} t={t} />
                <RewardTierRow rank={3} t={t} />
              </div>
            </div>

            <div className="space-y-1.5" data-tour="overclock-leaderboard">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-arcade text-[11px] uppercase tracking-wide text-zinc-500 sm:text-xs">{t("overclock.leaderboard")}</p>
                {/* The server only actually recomputes once its own 2h window has passed (see
                    getOverclockLeaderboard) — this button doesn't bypass that, it just re-runs the
                    same check on demand instead of making the player wait for a passive countdown
                    or a full page reload to find out whether it moved. Given its own pulsing glow
                    (not just a static outline) so it reads as a real action, not a stray label. */}
                <motion.button
                  type="button"
                  onClick={fetchLeaderboard}
                  animate={{
                    boxShadow: [
                      "0 0 0px rgba(255,184,77,0.35)",
                      "0 0 14px rgba(255,184,77,0.85)",
                      "0 0 0px rgba(255,184,77,0.35)",
                    ],
                  }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  whileTap={{ scale: 0.94 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-bright to-gold px-3.5 py-2 font-arcade text-[10px] uppercase tracking-wide text-white sm:text-[11px]"
                >
                  <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {t("overclock.update_ranking")}
                </motion.button>
              </div>
              <GlowPanel accent="none" className="max-h-64 overflow-y-auto p-2">
                {data && data.rankings.length > 0 ? (
                  <div className="space-y-1">
                    {data.rankings.slice(0, 20).map((entry) => (
                      <div
                        key={entry.userId}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm",
                          entry.userId === myUserId ? "bg-gold/15 text-gold-ink font-semibold" : "text-zinc-600"
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="font-arcade text-[10px] text-zinc-400 sm:text-[11px]">#{entry.rank}</span>
                          <span className="truncate">{entry.displayName}</span>
                        </span>
                        <span className="shrink-0 font-mono">{formatNumber(entry.damage)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-3 text-center text-xs text-zinc-500 sm:text-sm">{t("overclock.no_scores_yet")}</p>
                )}
              </GlowPanel>

              {/* Own standing, called out separately, whenever it wouldn't otherwise show up in
                  the Top 20 list above — the whole point is knowing how far off you are even when
                  you're nowhere near the visible board. */}
              {data?.yourRank && data.yourRank > 20 && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-xs sm:text-sm">
                  <span className="flex items-center gap-2 font-semibold text-gold-ink">
                    <span className="font-arcade text-[10px] sm:text-[11px]">#{data.yourRank}</span>
                    {t("overclock.your_rank_prefix")}{formatNumber(data.totalPlayers)}
                  </span>
                  <span className="shrink-0 font-mono text-gold-ink">{formatNumber(overclockBestDamage)}</span>
                </div>
              )}

              {data && data.history.length > 0 && (
                <>
                  <p className="pt-2 font-arcade text-[11px] uppercase tracking-wide text-zinc-500 sm:text-xs">{t("overclock.previous_weeks")}</p>
                  <div className="space-y-1">
                    {data.history.map((h) => (
                      <div key={h.weekId} className="flex items-center justify-between gap-2 rounded-lg border border-arcade-border bg-arcade-panel-light px-2.5 py-1.5 text-[11px] text-zinc-600 sm:text-xs">
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

      <motion.button
        type="button"
        onClick={() => setPicking(true)}
        data-tour="overclock-start"
        animate={{
          scale: [1, 1.03, 1],
          boxShadow: [
            "0 0 10px rgba(255,184,77,0.5)",
            "0 0 26px rgba(255,184,77,0.9)",
            "0 0 10px rgba(255,184,77,0.5)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mx-auto flex w-fit items-center gap-2 rounded-full bg-gradient-to-br from-gold-bright to-gold px-8 py-3 font-arcade text-sm uppercase tracking-widest text-white sm:px-10 sm:text-base"
      >
        <Swords className="h-5 w-5 sm:h-6 sm:w-6" />
        {t("overclock.battle")}
      </motion.button>
    </div>
  );
}
