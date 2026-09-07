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
    id: "raid-storm-eagle-hard",
    name: "Storm Thunder Eagle (Hard)",
    description: "The Storm Eagle awakens. Bring a full team to survive.",
    creatureId: "cr-storm-eagle",
    staminaCost: 0,
    rewardGold: 8000,
    rewardExp: 3000,
    itemDropChance: 50,
  },
  {
    id: "raid-storm-eagle-super",
    name: "Storm Thunder Eagle (Super)",
    description: "The Storm Eagle unleashes its full fury. Unrelenting lightning storms.",
    creatureId: "cr-storm-eagle",
    staminaCost: 0,
    rewardGold: 20000,
    rewardExp: 9000,
    itemDropChance: 70,
  },
  {
    id: "raid-storm-eagle-super2",
    name: "Storm Thunder Eagle (Super2)",
    description: "A catastrophic challenge. Requires perfected Digimon.",
    creatureId: "cr-storm-eagle",
    staminaCost: 0,
    rewardGold: 40000,
    rewardExp: 18000,
    itemDropChance: 90,
  },
  {
    id: "raid-storm-eagle-super3",
    name: "Storm Thunder Eagle (Super3)",
    description: "The ultimate trial. Only the absolute strongest can prevail.",
    creatureId: "cr-storm-eagle",
    staminaCost: 0,
    rewardGold: 80000,
    rewardExp: 48000,
    itemDropChance: 100,
  },
  {
    id: "raid-xpaladin-hard",
    name: "Factor X (Hard)",
    description: "Factor X awakens. Bring a full team to survive.",
    creatureId: "cr-xpaladin",
    staminaCost: 0,
    rewardGold: 9000,
    rewardExp: 3500,
    itemDropChance: 50,
  },
  {
    id: "raid-xpaladin-super",
    name: "Factor X (Super)",
    description: "Factor X unleashes its true power. An unclassifiable threat.",
    creatureId: "cr-xpaladin",
    staminaCost: 0,
    rewardGold: 22500,
    rewardExp: 10500,
    itemDropChance: 70,
  },
  {
    id: "raid-xpaladin-super2",
    name: "Factor X (Super2)",
    description: "A catastrophic challenge. Requires perfected Digimon.",
    creatureId: "cr-xpaladin",
    staminaCost: 0,
    rewardGold: 45000,
    rewardExp: 21000,
    itemDropChance: 90,
  },
  {
    id: "raid-xpaladin-super3",
    name: "Factor X (Super3)",
    description: "The ultimate trial. Only the absolute strongest can prevail.",
    creatureId: "cr-xpaladin",
    staminaCost: 0,
    rewardGold: 90000,
    rewardExp: 56000,
    itemDropChance: 100,
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

export interface RaidEvent {
  id: string;
  name: string;
  description: string;
  bannerImage: string | null;
  bossIds: string[];
}

// Lives here (not app/(game)/raid/page.tsx) so the Hub's hero carousel can feature these
// alongside GACHA_BANNERS without importing from a page file.
export const RAID_EVENTS: RaidEvent[] = [
  {
    id: "event-crimson",
    name: "Crimson Divine Power",
    description: "Challenge the Holy Knight to prove your worth and earn massive rewards!",
    bannerImage: "/assets/events/crimsondivinepower.png",
    bossIds: [
      "raid-crimson-paladin-hard",
      "raid-crimson-paladin-super",
      "raid-crimson-paladin-super2",
      "raid-crimson-paladin-super3",
    ]
  },
  {
    id: "event-storm-eagle",
    name: "Storm Thunder Eagle",
    description: "A majestic thunderbird descends upon the Digital World — its wings alone can level mountains.",
    bannerImage: "/assets/events/storm_thunder_eagle.png",
    bossIds: [
      "raid-storm-eagle-hard",
      "raid-storm-eagle-super",
      "raid-storm-eagle-super2",
      "raid-storm-eagle-super3",
    ]
  },
  {
    id: "event-factor-x",
    name: "Factor X Unknown",
    description: "An unidentified royal knight has appeared, radiating power that defies classification.",
    bannerImage: "/assets/events/factor_x_unkwnown.png",
    bossIds: [
      "raid-xpaladin-hard",
      "raid-xpaladin-super",
      "raid-xpaladin-super2",
      "raid-xpaladin-super3",
    ]
  }
];
