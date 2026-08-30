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
function scaleRaidBoss(base: Creature, level: number, bossId: string): Creature {
  let hpMult = 0.5;
  let statMult = 0.4;

  if (bossId.includes("-super3")) {
    hpMult = 2.5; // lvl 100
    statMult = 1.2;
  } else if (bossId.includes("-super2")) {
    hpMult = 1.5; // lvl 80
    statMult = 0.9;
  } else if (bossId.includes("-super")) {
    hpMult = 0.8; // lvl 50
    statMult = 0.6;
  }

  return {
    ...base,
    level,
    baseStats: {
      hp: Math.round(base.baseStats.hp * hpMult),
      atk: Math.round(base.baseStats.atk * statMult),
      def: Math.round(base.baseStats.def * statMult),
      spd: Math.round(base.baseStats.spd * statMult),
    },
  };
}

export const RAID_BOSSES: RaidBoss[] = [
  {
    id: "raid-crimson-paladin-hard",
    name: "Crimson Paladin (Hard)",
    description: "The Holy Knight awakens. Bring a full team to survive.",
    creatureId: "cr-crimson-paladin",
    staminaCost: 0,
    rewardGold: 10000,
    rewardExp: 5000,
    itemDropChance: 50,
  },
  {
    id: "raid-crimson-paladin-super",
    name: "Crimson Paladin (Super)",
    description: "The Holy Knight unleashes true power. Unfathomable HP.",
    creatureId: "cr-crimson-paladin",
    staminaCost: 0,
    rewardGold: 25000,
    rewardExp: 15000,
    itemDropChance: 70,
  },
  {
    id: "raid-crimson-paladin-super2",
    name: "Crimson Paladin (Super2)",
    description: "A catastrophic challenge. Requires perfected Digimon.",
    creatureId: "cr-crimson-paladin",
    staminaCost: 0,
    rewardGold: 50000,
    rewardExp: 30000,
    itemDropChance: 90,
  },
  {
    id: "raid-crimson-paladin-super3",
    name: "Crimson Paladin (Super3)",
    description: "The ultimate trial. Only the absolute strongest can prevail.",
    creatureId: "cr-crimson-paladin",
    staminaCost: 0,
    rewardGold: 100000,
    rewardExp: 80000,
    itemDropChance: 100,
  },
  {
    id: "raid-elder-silver-dragon",
    name: "Elder Silver Dragon",
    description: "An ancient Mythic dragon, far beyond anything Campaign has thrown at you yet.",
    creatureId: "cr-silver-dragon",
    staminaCost: 0,
    rewardGold: 5000,
    rewardExp: 1500,
    itemDropChance: 40,
  },
];

/** Builds this boss's actual battle-ready Creature — scaled stats, boosted level. */
export function getRaidBossCreature(boss: RaidBoss): Creature {
  const base = STARTER_CREATURES.find((c) => c.id === boss.creatureId);
  if (!base) throw new Error(`Unknown raid boss creature id: ${boss.creatureId}`);
  
  let bossLevel = 40;
  if (boss.id.includes("-super3")) bossLevel = 100;
  else if (boss.id.includes("-super2")) bossLevel = 80;
  else if (boss.id.includes("-super")) bossLevel = 50;

  return scaleRaidBoss(base, bossLevel, boss.id);
}
