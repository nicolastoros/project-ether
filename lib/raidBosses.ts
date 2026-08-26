import type { Creature } from "@/types/game";
import { STARTER_CREATURES } from "@/lib/gameData";

export interface RaidBoss {
  id: string;
  name: string;
  description: string;
  creatureId: string;
  staminaCost: number;
  rewardGold: number;
  rewardExp: number;
  /** 0-100 — a chance at one Evolution/Crafting item from ITEM_CATALOG on victory. */
  itemDropChance: number;
}

// A flat one-off power multiplier, not campaignEnemies.ts's per-stage tapering — raids aren't a
// stage ladder, just one big fight meant to noticeably outclass anything in Campaign so far.
function scaleRaidBoss(base: Creature, level: number): Creature {
  return {
    ...base,
    level,
    baseStats: {
      hp: Math.round(base.baseStats.hp * 6),
      atk: Math.round(base.baseStats.atk * 2),
      def: Math.round(base.baseStats.def * 1.8),
      spd: Math.round(base.baseStats.spd * 1.2),
    },
  };
}

export const RAID_BOSSES: RaidBoss[] = [
  {
    id: "raid-elder-silver-dragon",
    name: "Elder Silver Dragon",
    description: "An ancient Mythic dragon, far beyond anything Campaign has thrown at you yet.",
    creatureId: "cr-silver-dragon",
    staminaCost: 20,
    rewardGold: 5000,
    rewardExp: 1500,
    itemDropChance: 40,
  },
];

/** Builds this boss's actual battle-ready Creature — scaled stats, boosted level. */
export function getRaidBossCreature(boss: RaidBoss): Creature {
  const base = STARTER_CREATURES.find((c) => c.id === boss.creatureId);
  if (!base) throw new Error(`Unknown raid boss creature id: ${boss.creatureId}`);
  return scaleRaidBoss(base, base.level + 28);
}
