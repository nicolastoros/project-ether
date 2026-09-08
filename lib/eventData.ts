import type { Creature, Element, Rarity } from "@/types/game";
import { RARITY_SORT_ORDER, STARTER_CREATURES } from "@/lib/gameData";

export interface EventDifficulty {
  id: string;
  name: string; // "Hard", "Super", "Super2", "Super3"
  staminaCost: number;
  recommendedLevel: number;
  enemyRarity: string; // "Common to Rare", "SSR", "Mythic", "LR"
  rewardAmount: { small: number; medium: number; large: number };
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  element: Element;
  maxDailyAttempts: number;
  difficulties: EventDifficulty[];
}

export const ORB_EVENTS: GameEvent[] = [
  {
    id: "event-orb-fire",
    name: "Blazing Fire Orbs",
    description: "Defeat Fire enemies to earn Fire Orbs for Potential Training.",
    element: "Fire",
    maxDailyAttempts: 4,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 5, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 40, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 5, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 60, medium: 20, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 5, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 80, medium: 40, large: 10 } },
      { id: "super3", name: "Super3", staminaCost: 5, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 100, medium: 60, large: 20 } },
    ]
  },
  {
    id: "event-orb-water",
    name: "Crashing Water Orbs",
    description: "Defeat Water enemies to earn Water Orbs for Potential Training.",
    element: "Water",
    maxDailyAttempts: 4,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 5, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 40, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 5, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 60, medium: 20, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 5, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 80, medium: 40, large: 10 } },
      { id: "super3", name: "Super3", staminaCost: 5, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 100, medium: 60, large: 20 } },
    ]
  },
  {
    id: "event-orb-nature",
    name: "Blooming Nature Orbs",
    description: "Defeat Nature enemies to earn Nature Orbs for Potential Training.",
    element: "Nature",
    maxDailyAttempts: 4,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 5, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 40, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 5, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 60, medium: 20, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 5, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 80, medium: 40, large: 10 } },
      { id: "super3", name: "Super3", staminaCost: 5, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 100, medium: 60, large: 20 } },
    ]
  },
  {
    id: "event-orb-light",
    name: "Radiant Light Orbs",
    description: "Defeat Light enemies to earn Light Orbs for Potential Training.",
    element: "Light",
    maxDailyAttempts: 4,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 5, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 40, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 5, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 60, medium: 20, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 5, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 80, medium: 40, large: 10 } },
      { id: "super3", name: "Super3", staminaCost: 5, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 100, medium: 60, large: 20 } },
    ]
  },
  {
    id: "event-orb-dark",
    name: "Abyssal Dark Orbs",
    description: "Defeat Dark enemies to earn Dark Orbs for Potential Training.",
    element: "Dark",
    maxDailyAttempts: 4,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 5, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 40, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 5, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 60, medium: 20, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 5, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 80, medium: 40, large: 10 } },
      { id: "super3", name: "Super3", staminaCost: 5, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 100, medium: 60, large: 20 } },
    ]
  },
  {
    id: "event-orb-electric",
    name: "Sparking Electric Orbs",
    description: "Defeat Electric enemies to earn Electric Orbs for Potential Training.",
    element: "Electric",
    maxDailyAttempts: 4,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 5, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 40, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 5, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 60, medium: 20, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 5, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 80, medium: 40, large: 10 } },
      { id: "super3", name: "Super3", staminaCost: 5, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 100, medium: 60, large: 20 } },
    ]
  },
  {
    id: "event-orb-neutral",
    name: "Basic Neutral Orbs",
    description: "Defeat Neutral enemies to earn Neutral Orbs for Potential Training.",
    element: "Neutral",
    maxDailyAttempts: 4,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 5, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 40, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 5, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 60, medium: 20, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 5, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 80, medium: 40, large: 10 } },
      { id: "super3", name: "Super3", staminaCost: 5, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 100, medium: 60, large: 20 } },
    ]
  }
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

/** Builds a real, on-theme enemy pair for an Orb Event fight — matching the event's own element
 * and the difficulty's advertised enemyRarity, scaled by this event system's own tier curve.
 * Replaces the previous approach (app/(game)/combat/page.tsx faking a
 * `{world:1, worldStageNumber:8}` DungeonStage just to reuse Campaign's getStageEnemyTeam), which
 * meant every Orb Event, on every element and every difficulty, fought the exact same 2 enemies
 * (Campaign World 1's boss line-up) at a fixed "Easy" scaling regardless of the difficulty tier
 * actually picked. */
export function getEventEnemyTeam(event: GameEvent, diff: EventDifficulty): [Creature, Creature] {
  const targetRarity = ENEMY_RARITY_TARGET[diff.enemyRarity] ?? "Rare";
  const mult = EVENT_TIER_MULTIPLIERS[diff.id] ?? EVENT_TIER_MULTIPLIERS.hard;

  const first = pickEnemyTemplate(event.element, targetRarity, new Set());
  const second = pickEnemyTemplate(event.element, targetRarity, new Set([first.id]));

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
