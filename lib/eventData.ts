import type { Creature, Element, Rarity } from "@/types/game";
import { RARITY_SORT_ORDER, STARTER_CREATURES } from "@/lib/gameData";

export interface EventDifficulty {
  id: string;
  name: string; // "Hard", "Super", "Super2", "Super3"
  staminaCost: number;
  recommendedLevel: number;
  enemyRarity: string; // "Common to Rare", "SSR", "Mythic", "LR"
  /** Per element — a win grants this many of EVERY element's Orb at this size (7 colors), not
   * just one. See getEventEnemyTeam/app/(game)/combat/page.tsx's eventRewards construction. */
  rewardAmount: { small: number; medium: number; large: number };
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  /** Resets weekly (local Monday) — see ensureFreshWeeklyEventAttempts in lib/store.ts. */
  maxWeeklyAttempts: number;
  difficulties: EventDifficulty[];
}

// Consolidated from 7 separate per-element events (each with its own daily attempt pool that,
// once used up, silently never re-enabled the Start button again — see ensureFreshWeeklyEventAttempts's
// comment) into one event that pays out every element's Orbs on every win, with a weekly attempt
// pool instead of daily. Same 4 difficulty tiers as before, same per-color reward amounts each
// tier already granted for its one fixed element — now just multiplied across all 7 colors.
export const ORB_EVENTS: GameEvent[] = [
  {
    id: "event-orb-training",
    name: "Hidden Training",
    description: "Defeat elemental enemies to earn Orbs of every element for Potential Training.",
    maxWeeklyAttempts: 6,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 5, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 40, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 5, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 60, medium: 20, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 5, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 80, medium: 40, large: 10 } },
      { id: "super3", name: "Super3", staminaCost: 5, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 100, medium: 60, large: 20 } },
    ]
  },
];

// Never obtainable through the gacha (raid-exclusive) — see lib/gameData.ts's GACHA_CREATURE_POOL
// comment. Orb Event enemies must come from the same "real, player-collectible roster" pool,
// not from raid bosses, so this mirrors that filter here too.
const EVENT_ENEMY_POOL = STARTER_CREATURES.filter((c) => !c.spriteFolder?.includes("/raid_bosses/"));

// Maps each difficulty's advertised enemyRarity band (shown to the player right on the difficulty
// card) to the real Rarity to search the roster for.
const ENEMY_RARITY_TARGET: Record<string, Rarity> = {
  "Common/Rare": "Rare",
  SSR: "SSR",
  Mythic: "Mythic",
  LR: "LR",
};

// Escalating stat curve across this event system's own 4 difficulty ids ("hard" is the easiest
// tier here, not Campaign's "Hard") — same shape as difficultyTiers.ts's TIER_STAT_MULTIPLIERS
// (HP scaled hardest) since that curve was already tuned to feel right, just re-keyed to this
// event system's own id vocabulary instead of borrowing Campaign's Easy/Medium/Hard/Super ids.
const EVENT_TIER_MULTIPLIERS: Record<string, { hp: number; atk: number; def: number; spd: number }> = {
  hard: { hp: 1, atk: 1, def: 1, spd: 1 },
  super: { hp: 2.4, atk: 1.35, def: 1.2, spd: 1.1 },
  super2: { hp: 4.5, atk: 1.75, def: 1.4, spd: 1.2 },
  super3: { hp: 8, atk: 2.3, def: 1.6, spd: 1.3 },
};

// Every element this event's enemies can be drawn from now that the event itself grants Orbs of
// every color instead of just one — see pickEventElementPair below.
export const ALL_ORB_ELEMENTS: Element[] = ["Fire", "Water", "Nature", "Light", "Dark", "Electric", "Neutral"];

/** Picks the roster creature closest to `targetRarity` among `element` matches (falling back to
 * the whole non-raid-boss roster for elements with thin/no coverage, e.g. Neutral has none at
 * all) — "closest" so a gap in the roster (no Fire LR yet, no Neutral anything) degrades to the
 * nearest rarity instead of silently changing element. */
function pickEnemyTemplate(element: Element, targetRarity: Rarity, exclude: Set<string>): Creature {
  const sameElement = EVENT_ENEMY_POOL.filter((c) => c.element === element && !exclude.has(c.id));
  const pool = sameElement.length > 0 ? sameElement : EVENT_ENEMY_POOL.filter((c) => !exclude.has(c.id));
  const sorted = [...pool].sort(
    (a, b) =>
      Math.abs(RARITY_SORT_ORDER[a.rarity] - RARITY_SORT_ORDER[targetRarity]) -
      Math.abs(RARITY_SORT_ORDER[b.rarity] - RARITY_SORT_ORDER[targetRarity])
  );
  return sorted[0] ?? EVENT_ENEMY_POOL[0];
}

/** Builds a real, on-theme enemy pair for an Orb Event fight — no longer pinned to one fixed
 * element (the event itself no longer is, since it pays out every color on a win), so this now
 * picks two different random elements each fight, scaled by this event system's own tier curve.
 * Replaces the previous approach (app/(game)/combat/page.tsx faking a
 * `{world:1, worldStageNumber:8}` DungeonStage just to reuse Campaign's getStageEnemyTeam), which
 * meant every Orb Event, on every difficulty, fought the exact same 2 enemies (Campaign World 1's
 * boss line-up) at a fixed "Easy" scaling regardless of the difficulty tier actually picked. */
export function getEventEnemyTeam(diff: EventDifficulty): [Creature, Creature] {
  const targetRarity = ENEMY_RARITY_TARGET[diff.enemyRarity] ?? "Rare";
  const mult = EVENT_TIER_MULTIPLIERS[diff.id] ?? EVENT_TIER_MULTIPLIERS.hard;

  const [elA, elB] = [...ALL_ORB_ELEMENTS].sort(() => Math.random() - 0.5);
  const first = pickEnemyTemplate(elA, targetRarity, new Set());
  const second = pickEnemyTemplate(elB, targetRarity, new Set([first.id]));

  const scale = (base: Creature): Creature => ({
    ...base,
    level: diff.recommendedLevel,
    baseStats: {
      hp: Math.round(base.baseStats.hp * mult.hp),
      atk: Math.round(base.baseStats.atk * mult.atk),
      def: Math.round(base.baseStats.def * mult.def),
      spd: Math.round(base.baseStats.spd * mult.spd),
    },
  });

  return [scale(first), scale(second)];
}
