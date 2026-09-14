import type { Creature } from "@/types/game";
import { STARTER_CREATURES } from "@/lib/gameData";

export interface RaidBoss {
  id: string;
  name: string;
  description: string;
  creatureId: string;
  /** Multi-enemy alternative to the single scaled creatureId above — when set, the fight uses
   * these creatures (optionally with statMultiplier below), one combatant each, instead of one
   * giant scaled-up boss. See getRaidEnemyCreatures. Used by every Events > Challenge trial (all
   * of them are real NvN team fights, not a "boss") — creatureId is still required on the type but
   * ignored when this is set. */
  creatureIds?: string[];
  /** Flat per-stat multiplier applied on top of creatureIds' real stats (ignored for the classic
   * single-scaled-boss path, which already has its own scaleRaidBoss curve). Lets a thin-roster
   * element (e.g. Aqua only has 5 Water creatures total) still land at a deliberately higher
   * difficulty than a same-tier fight built from a richer roster, instead of difficulty being
   * purely a function of which creatures happen to exist. Undefined/1 means no change. */
  statMultiplier?: { hp: number; atk: number; def: number; spd: number };
  staminaCost: number;
  rewardGold: number;
  rewardExp: number;
  /** 0-100 — a chance at one Evolution/Crafting item from ITEM_CATALOG on victory. */
  itemDropChance: number;
  /** Flat, always-granted item rewards on a win (in addition to rewardGold/rewardExp) — e.g.
   * Scarlet Inferno's chipset + Exchange Coin drops. Unlike tamerGearSetName above this is exact,
   * not a random pick from a pool. */
  bonusItemRewards?: { itemId: string; amount: number }[];
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
    description: "A catastrophic challenge. Requires perfected Creatures.",
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
    description: "A catastrophic challenge. Requires perfected Creatures.",
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
    description: "A catastrophic challenge. Requires perfected Creatures.",
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
  {
    id: "raid-aqua-trial-hard",
    name: "Aqua Trial (Hard)",
    description: "3 depths-dwellers rise together — noticeably fiercer than Scarlet Inferno's own Hard tier. Win for Blue + Purple Chipsets.",
    creatureId: "cr-tidalfin", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-tidalfin", "cr-goldak", "cr-tidewarden"],
    // No SSR-only roster like Crimson Hard has — a flat stat bump makes sure this still lands
    // harder than raid-crimson-trial-hard as asked, instead of difficulty being capped by Water's
    // thin 5-creature roster.
    statMultiplier: { hp: 1.15, atk: 1.15, def: 1.15, spd: 1.1 },
    staminaCost: 0,
    rewardGold: 1000,
    rewardExp: 5000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 2 },
      { itemId: "it-chipset-purple", amount: 2 },
    ],
  },
  {
    id: "raid-aqua-trial-super",
    name: "Aqua Trial (Super)",
    description: "The Sovereign of the Depths rises, flanked by its strongest. Deliberately harsher than Scarlet Inferno's own Super.",
    creatureId: "cr-poseidon", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-emperortoise", "cr-poseidon", "cr-goldak"],
    statMultiplier: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.2 },
    staminaCost: 0,
    rewardGold: 1500,
    rewardExp: 14000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 10 },
      { itemId: "it-chipset-purple", amount: 5 },
    ],
  },
  {
    id: "raid-wind-trial-hard",
    name: "Wind Trial (Hard)",
    description: "3 gale spirits rise together — homologous to Aqua Trial's own Hard tier in cost, rewards, and difficulty. Win for Blue + Purple Chipsets.",
    creatureId: "cr-sakuya", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-gale-sprite", "cr-dragoon", "cr-sakuya"],
    // Identical multiplier to raid-aqua-trial-hard — Wind's own 3-creature Nature roster is thin,
    // so the same flat bump does the difficulty work instead of a bigger/different roster.
    statMultiplier: { hp: 1.15, atk: 1.15, def: 1.15, spd: 1.1 },
    staminaCost: 0,
    rewardGold: 1000,
    rewardExp: 5000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 2 },
      { itemId: "it-chipset-purple", amount: 2 },
    ],
  },
  {
    id: "raid-wind-trial-super",
    name: "Wind Trial (Super)",
    description: "The same 3 spirits, unleashed at full strength — homologous to Aqua Trial's own Super tier.",
    creatureId: "cr-sakuya", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-gale-sprite", "cr-dragoon", "cr-sakuya"],
    // Identical multiplier to raid-aqua-trial-super.
    statMultiplier: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.2 },
    staminaCost: 0,
    rewardGold: 1500,
    rewardExp: 14000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 10 },
      { itemId: "it-chipset-purple", amount: 5 },
    ],
  },
  {
    id: "raid-crimson-trial-hard",
    name: "Scarlet Inferno (Hard)",
    description: "3 Crimson-forged guardians test your resolve. Win for Blue Chipsets — 30 forge one Crimson piece.",
    creatureId: "cr-crimson-guardian", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-crimson-guardian", "cr-firefex", "cr-firebit"],
    staminaCost: 0,
    rewardGold: 500,
    rewardExp: 4000,
    itemDropChance: 0,
    bonusItemRewards: [{ itemId: "it-chipset-blue", amount: 2 }],
  },
  {
    id: "raid-crimson-trial-super",
    name: "Scarlet Inferno (Super)",
    description: "3 real Mythic Fire creatures, at full strength, all at once. Not for the unprepared.",
    creatureId: "cr-blitzfire", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-blitzfire", "cr-blazefire", "cr-sirius"],
    staminaCost: 0,
    rewardGold: 1000,
    rewardExp: 12000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 10 },
      { itemId: "it-exchange-coin", amount: 10 },
    ],
  },
  {
    id: "raid-thunder-trial-super",
    name: "Thunderclap Fury (Super)",
    description: "3 real Electric creatures crackle to life at once — noticeably fiercer than either Scarlet Inferno's or Aqua Trial's own Super.",
    creatureId: "cr-thundracoil", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-thundracoil", "cr-quantum", "cr-astarion"],
    // No Hard tier for Thunder at all — Super is already meant to outclass every other set's own
    // Super, so this multiplier sits above both raid-crimson-trial-super's (none) and
    // raid-aqua-trial-super's (1.3).
    statMultiplier: { hp: 1.45, atk: 1.45, def: 1.45, spd: 1.3 },
    staminaCost: 0,
    rewardGold: 2000,
    rewardExp: 16000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 5 },
      { itemId: "it-chipset-purple", amount: 5 },
      { itemId: "it-chipset-green", amount: 2 },
    ],
  },
  {
    id: "raid-thunder-trial-super2",
    name: "Thunderclap Fury (Super2)",
    description: "The same storm, unleashed harder still. The hardest Set Trial yet.",
    creatureId: "cr-thundracoil", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-thundracoil", "cr-quantum", "cr-astarion"],
    statMultiplier: { hp: 1.65, atk: 1.65, def: 1.65, spd: 1.45 },
    staminaCost: 0,
    rewardGold: 3000,
    rewardExp: 22000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 10 },
      { itemId: "it-chipset-purple", amount: 10 },
      { itemId: "it-chipset-green", amount: 5 },
    ],
  },
  {
    id: "raid-ice-trial-super",
    name: "Subzero Cataclysm (Super)",
    description: "3 silvered, frost-pale creatures descend as one — homologous to Thunderclap Fury's own Super in every way but name.",
    creatureId: "cr-silver-dragon", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-silver-dragon", "cr-platinum-dragon", "cr-wolfang"],
    // Identical multiplier to raid-thunder-trial-super — the user asked for these two Set Trials
    // to be exact mechanical equivalents (same costs, same rewards, same difficulty), just with
    // Ice's own roster/theme instead of Thunder's.
    statMultiplier: { hp: 1.45, atk: 1.45, def: 1.45, spd: 1.3 },
    staminaCost: 0,
    rewardGold: 2000,
    rewardExp: 16000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 5 },
      { itemId: "it-chipset-purple", amount: 5 },
      { itemId: "it-chipset-green", amount: 2 },
    ],
  },
  {
    id: "raid-ice-trial-super2",
    name: "Subzero Cataclysm (Super2)",
    description: "The same freeze, unleashed harder still — homologous to Thunderclap Fury's own Super2.",
    creatureId: "cr-silver-dragon", // unused — creatureIds below takes over, see RaidBoss.creatureIds
    creatureIds: ["cr-silver-dragon", "cr-platinum-dragon", "cr-wolfang"],
    statMultiplier: { hp: 1.65, atk: 1.65, def: 1.65, spd: 1.45 },
    staminaCost: 0,
    rewardGold: 3000,
    rewardExp: 22000,
    itemDropChance: 0,
    bonusItemRewards: [
      { itemId: "it-chipset-blue", amount: 10 },
      { itemId: "it-chipset-purple", amount: 10 },
      { itemId: "it-chipset-green", amount: 5 },
    ],
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

/** The real, battle-ready enemy team for this boss — an array either way, so callers never branch
 * on single-vs-multi. Falls back to the classic single scaled boss (getRaidBossCreature) unless
 * creatureIds is set, in which case each listed creature is used exactly as designed. */
export function getRaidEnemyCreatures(boss: RaidBoss): Creature[] {
  if (!boss.creatureIds) return [getRaidBossCreature(boss)];
  const mult = boss.statMultiplier;
  return boss.creatureIds.map((id) => {
    const creature = STARTER_CREATURES.find((c) => c.id === id);
    if (!creature) throw new Error(`Unknown raid boss creature id: ${id}`);
    if (!mult) return creature;
    return {
      ...creature,
      baseStats: {
        ...creature.baseStats,
        hp: Math.round(creature.baseStats.hp * mult.hp),
        atk: Math.round(creature.baseStats.atk * mult.atk),
        def: Math.round(creature.baseStats.def * mult.def),
        spd: Math.round(creature.baseStats.spd * mult.spd),
      },
    };
  });
}

export interface RaidEvent {
  id: string;
  name: string;
  description: string;
  bannerImage: string | null;
  bossIds: string[];
  /** Total attempts per local day, shared across every boss in this event (starting any of them
   * consumes from the same pool) — see consumeChallengeAttempt in lib/store.ts. Undefined means
   * unlimited (still gated by staminaCost like every other raid boss). */
  dailyAttemptLimit?: number;
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

// Set-piece events for the Events > Challenge tab (see components/events/ChallengeTab.tsx) —
// separate from RAID_EVENTS above (Extreme Battles' multi-tier bosses) since each of these grants
// chipsets to craft Tamer gear in the Shop instead of Evolution/Crafting materials. Order here is
// the exact display order requested: Crimson, Aqua, Wind, Thunder, Ice. Names are the banner art's
// own baked-in titles, read directly off each PNG under public/assets/events/.
export const CHALLENGE_EVENTS: RaidEvent[] = [
  {
    id: "event-crimson-set",
    name: "Scarlet Inferno! Crimson Armor Forge",
    description: "2 attempts a day, shared between Hard and Super. Win Blue Chipsets to craft Crimson armor in the Shop.",
    bannerImage: "/assets/events/crimson_set.png",
    bossIds: ["raid-crimson-trial-hard", "raid-crimson-trial-super"],
    dailyAttemptLimit: 2,
  },
  {
    id: "event-aqua-set",
    name: "Surging Tides! Aqua Armor Forge",
    description: "2 attempts a day, shared between Hard and Super — both harder than Scarlet Inferno's own tiers. Win Blue + Purple Chipsets to craft Aqua armor in the Shop.",
    bannerImage: "/assets/events/aqua_set.png",
    bossIds: ["raid-aqua-trial-hard", "raid-aqua-trial-super"],
    dailyAttemptLimit: 2,
  },
  {
    id: "event-wind-set",
    name: "Raging Gales! Wind Armor Forge",
    description: "2 attempts a day, shared between Hard and Super — homologous to Aqua Trial in cost, rewards, and difficulty. Win Blue + Purple Chipsets to craft Wind armor in the Shop.",
    bannerImage: "/assets/events/wind_set.png",
    bossIds: ["raid-wind-trial-hard", "raid-wind-trial-super"],
    dailyAttemptLimit: 2,
  },
  {
    id: "event-thunder-set",
    name: "Thunderclap Fury! Thunder Armor Forge",
    description: "2 attempts a day, shared between Super and Super2 — no Hard tier, both harder than every other set's own tiers. Win Blue + Purple + Green Chipsets to craft Thunder armor in the Shop.",
    bannerImage: "/assets/events/thunder_set.png",
    bossIds: ["raid-thunder-trial-super", "raid-thunder-trial-super2"],
    dailyAttemptLimit: 2,
  },
  {
    id: "event-ice-set",
    name: "Subzero Cataclysm! Ice Armor Forge",
    description: "2 attempts a day, shared between Super and Super2 — homologous to Thunderclap Fury in cost, rewards, and difficulty. Win Blue + Purple + Green Chipsets to craft Ice armor in the Shop.",
    bannerImage: "/assets/events/ice_set.png",
    bossIds: ["raid-ice-trial-super", "raid-ice-trial-super2"],
    dailyAttemptLimit: 2,
  },
];
