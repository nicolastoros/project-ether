import { thisOverclockWeekStartDateString } from "@/lib/utils";

/** One weekly Overclock boss — `creatureId` points into STARTER_CREATURES (lib/gameData.ts), same
 * as RaidBoss.creatureId. Plain, isomorphic data (no client/server-only deps), so both the client
 * store and server API routes/lib/db/bigquery.ts import this same module and always agree on which
 * boss/week it is — the server never trusts a client-sent week id when scoring. */
export interface OverclockBoss {
  id: string;
  name: string;
  creatureId: string;
}

// Cycles forever — week 4 is Cyber Knight again, week 5 Imperial Guardian, etc. Order matches
// exactly what the user specified: Cyber Knight, then Imperial Guardian, then Dragon Lord.
export const OVERCLOCK_BOSS_ROTATION: OverclockBoss[] = [
  { id: "overclock-cyber-knight", name: "Cyber Knight", creatureId: "cr-ov-cyber-knight" },
  { id: "overclock-imperial-guardian", name: "Imperial Guardian", creatureId: "cr-ov-imperial-guardian" },
  { id: "overclock-dragon-lord", name: "Dragon Lord", creatureId: "cr-ov-dragon-lord" },
];

// The most recent Friday as of building this feature — the week starting on this date is Week 1,
// per the user's own framing ("como partiremos ahora, será Week 1"). Only ever bump this if the
// actual launch slips to a later Friday.
const OVERCLOCK_EPOCH = "2026-09-11";

/** "YYYY-MM-DD" of the current Overclock week's own Friday boundary — the value stored alongside a
 * player's best score (UserProfile.overclockWeekId) and the leaderboard's own weekId, so "is this
 * stale" is just a string comparison, same idiom as every other weekly/daily boundary in this
 * codebase (see lib/store.ts's ensureFreshWeeklyEventAttempts and friends). */
export function currentOverclockWeekId(): string {
  return thisOverclockWeekStartDateString();
}

/** The weekId immediately before the given one — weeks are always exact 7-day increments from
 * OVERCLOCK_EPOCH, so this is just "7 days earlier" in YYYY-MM-DD form. Used server-side to find
 * the week whose leaderboard just closed (and whose top 3 are due their rewards) the moment
 * anyone's first leaderboard read of a new week comes in — see lib/db/bigquery.ts's
 * getOverclockLeaderboard. */
export function previousOverclockWeekId(weekId: string): string {
  const d = new Date(`${weekId}T00:00:00`);
  d.setDate(d.getDate() - 7);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 1-indexed — the week containing OVERCLOCK_EPOCH is Week 1. Negative/zero never happens in
 * practice (epoch is in the past by the time this ships) but floors at 1 defensively. */
export function currentOverclockWeekNumber(referenceDate: Date = new Date()): number {
  const epoch = new Date(`${OVERCLOCK_EPOCH}T00:00:00`);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = referenceDate.getTime() - epoch.getTime();
  return Math.max(1, 1 + Math.floor(diff / msPerWeek));
}

export function getOverclockBossForWeek(weekNumber: number): OverclockBoss {
  const idx = (weekNumber - 1) % OVERCLOCK_BOSS_ROTATION.length;
  return OVERCLOCK_BOSS_ROTATION[idx];
}

/** Same as getOverclockBossForWeek, but keyed off a weekId string (e.g. one already stored in a
 * DB row) instead of a live weekNumber — for resolving which boss a *past* week belonged to. */
export function getOverclockBossForWeekId(weekId: string): OverclockBoss {
  const epoch = new Date(`${OVERCLOCK_EPOCH}T00:00:00`);
  const target = new Date(`${weekId}T00:00:00`);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNumber = Math.max(1, 1 + Math.round((target.getTime() - epoch.getTime()) / msPerWeek));
  return getOverclockBossForWeek(weekNumber);
}

/** Convenience — the boss for right now, exactly what both the pre-battle hub and the battle
 * screen itself need. */
export function currentOverclockBoss(): OverclockBoss {
  return getOverclockBossForWeek(currentOverclockWeekNumber());
}

/** Epoch ms of the next Friday 00:00 (local time) — what the pre-battle hub's "resets in" countdown
 * counts down to. Client-only concern (a countdown display), so this is local-clock-based like
 * every other client-facing reset countdown in this game (lib/useResetCountdown.ts). */
export function nextOverclockResetAt(referenceDate: Date = new Date()): number {
  const d = new Date(referenceDate);
  const dayOfWeek = d.getDay();
  const daysSinceFriday = (dayOfWeek + 2) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysSinceFriday + 7);
  return d.getTime();
}

// How much stronger the boss gets after each of its own turns, applied as a flat multiplier to
// both its ATK (when it strikes) and DEF (when it's struck) via BattleCombatant.statBuffs — see
// components/combat/OverclockBattleScreen.tsx's resolveTurn. A first-pass number, tune after
// playtesting.
export const OVERCLOCK_ESCALATION_PER_BOSS_TURN = 0.08;

// Reward tiers — Lacrima scales by placement, chipsets are flat and identical for every top-3
// finisher (confirmed with the user). Golden chipsets are deliberately excluded (not usable yet).
export const OVERCLOCK_REWARD_CHIPSET_AMOUNT = 50;
export const OVERCLOCK_REWARD_CHIPSET_ITEM_IDS = ["it-chipset-blue", "it-chipset-green", "it-chipset-purple"];
export const OVERCLOCK_REWARD_LACRIMA_BY_RANK: Record<1 | 2 | 3, number> = { 1: 100, 2: 80, 3: 50 };
