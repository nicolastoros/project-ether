import type { DifficultyTier, DungeonProgress, DungeonStage } from "@/types/game";

/** Ordered so DIFFICULTY_TIERS[i - 1] is always "the tier you must clear to unlock tier i". */
export const DIFFICULTY_TIERS: DifficultyTier[] = ["Easy", "Medium", "Hard", "Super"];

/** HP is scaled hardest — that's what actually buys a fight the extra turns a Resonance-gated
 * Ultimate needs to come online. ATK also climbs meaningfully now so raw stat-checks alone can't
 * brute-force every tier with a single spammed skill — the jump from Hard to Super in particular
 * is meant to be a real wall that pushes the player toward upgrading/leveling their team, not a
 * cosmetic difficulty label. Easy is 1/1/1 on purpose: it's identical to the pre-tier stage
 * behavior, so every existing Campaign save's Easy-tier progress means exactly what it always did. */
export const TIER_STAT_MULTIPLIERS: Record<DifficultyTier, { hp: number; atk: number; def: number }> = {
  Easy: { hp: 1, atk: 1, def: 1 },
  Medium: { hp: 2.4, atk: 1.35, def: 1.2 },
  Hard: { hp: 4.5, atk: 1.75, def: 1.4 },
  Super: { hp: 8, atk: 2.3, def: 1.6 },
};

// Scaled up alongside the steeper stat curve above — clearing a genuinely harder tier should pay
// off proportionally more, not just feel harder for the same loot.
export const TIER_REWARD_MULTIPLIERS: Record<DifficultyTier, number> = {
  Easy: 1,
  Medium: 1.8,
  Hard: 3.2,
  Super: 5.5,
};

/** Easy keeps the plain base id (so every stage's existing dg-stage-N id and save data is
 * untouched); higher tiers get a suffixed composite id, e.g. "dg-stage-12-hard". */
export function tierStageId(baseId: string, tier: DifficultyTier): string {
  return tier === "Easy" ? baseId : `${baseId}-${tier.toLowerCase()}`;
}

const TIER_SUFFIX_TO_TIER: Record<string, DifficultyTier> = {
  medium: "Medium",
  hard: "Hard",
  super: "Super",
};

/** Inverse of tierStageId — recovers the base stage id and tier from a (possibly composite) id
 * coming off the URL (see app/(game)/combat/page.tsx). */
export function parseTierStageId(id: string): { baseId: string; tier: DifficultyTier } {
  for (const [suffix, tier] of Object.entries(TIER_SUFFIX_TO_TIER)) {
    if (id.endsWith(`-${suffix}`)) {
      return { baseId: id.slice(0, -(suffix.length + 1)), tier };
    }
  }
  return { baseId: id, tier: "Easy" };
}

/** Produces the on-the-fly stage variant for a given tier — same content (world/stage position,
 * stamina cost, recommended power), scaled rewards, and a composite id. Enemy stat scaling itself
 * lives in lib/campaignEnemies.ts (getStageEnemyTeam reads stage.tier). */
export function getTierStage(baseStage: DungeonStage, tier: DifficultyTier): DungeonStage {
  if (tier === "Easy") return baseStage;
  const rewardMult = TIER_REWARD_MULTIPLIERS[tier];
  return {
    ...baseStage,
    id: tierStageId(baseStage.id, tier),
    tier,
    rewardGold: Math.round(baseStage.rewardGold * rewardMult),
    rewardExp: Math.round(baseStage.rewardExp * rewardMult),
    equipmentDropChance: Math.min(80, Math.round(baseStage.equipmentDropChance * (1 + (rewardMult - 1) * 0.4))),
  };
}

/** Whether `tier` is playable on `baseStage` right now. `baseStage` must be the store-overridden
 * object (real isLocked/isCleared from dungeon.highestStageCleared — see CampaignHome.tsx),
 * not a raw DUNGEON_STAGES entry. Medium/Hard/Super each require the previous tier's own
 * dungeon.stageStars entry to exist, independent of progress on any other stage. */
export function isTierUnlocked(baseStage: DungeonStage, tier: DifficultyTier, dungeon: DungeonProgress): boolean {
  if (tier === "Easy") return !baseStage.isLocked;
  const tierIndex = DIFFICULTY_TIERS.indexOf(tier);
  const previousTier = DIFFICULTY_TIERS[tierIndex - 1];
  return Boolean(dungeon.stageStars[tierStageId(baseStage.id, previousTier)]);
}
