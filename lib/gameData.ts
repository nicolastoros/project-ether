import type {
  Achievement,
  Creature,
  CreatureStats,
  DailyTask,
  DungeonStage,
  Friend,
  GachaBanner,
  GuildInfo,
  InventoryItem,
  PvpOpponent,
  Rarity,
  Skill,
  TamerAvatar,
  TamerEquipment,
  TamerSetEffect,
  UserProfile,
} from "@/types/game";

// Lives here (rather than lib/store.ts) so server-only modules — e.g. lib/db/bigquery.ts,
// deciding how many of an admin account's creatures go into the hub team — can read it
// without pulling zustand/React into a server bundle.
export const HUB_TEAM_SIZE = 7;

// Shared by both creature and Tamer leveling (lib/store.ts's applyExpGain/applyProfileExpGain).
// Tamer (profile) leveling still caps at this flat 100 — only creature leveling now varies by
// rarity (see LEVEL_CAP_BY_RARITY/creatureLevelCap below).
export const MAX_LEVEL = 100;

// Early levels stay quick so the opening hours feel generous; the climb steepens gradually from
// there instead of jumping hard at 25 then again at 60 (the old 1.12/1.18/1.24 tiering — reported
// live as "you can level fine up to ~50, then it's basically capped": those two step-ups compound
// over dozens of levels into a wall, e.g. level 50->75 needed ~110x more EXP than 1->50 did).
// This keeps 1-25 identical (no change to how the game has always felt early on) and narrows the
// gap between tiers everywhere after, so the climb keeps reading as real progress instead of
// flatlining — level 50->75 now costs ~24x instead of ~110x. The last tier (100+) only matters for
// LR (cap 150) and Awakened Mythics (cap 140, see AWAKENED_MYTHIC_LEVEL_CAP) since nothing else
// levels past 100.
export function nextLevelExpRequirement(currentRequirement: number, newLevel: number): number {
  const rate = newLevel <= 25 ? 1.12 : newLevel <= 60 ? 1.13 : newLevel <= 100 ? 1.145 : 1.12;
  return Math.round(currentRequirement * rate);
}

/** Recomputes the correct expToNextLevel purely from a level + the CURRENT curve above — never
 * trust a stored/persisted expToNextLevel value on its own, always derive it from level via this.
 * Reason: expToNextLevel is a chain (each level's requirement is the previous one times that
 * level's rate), so a creature that already leveled up under an OLDER version of the curve above
 * keeps carrying that old, larger requirement forward through every subsequent level-up — the
 * formula changing doesn't retroactively fix creatures that already have a stored value baked in.
 * Confirmed live: a Mythic sitting at level 71 from before this curve was softened needed ~12x
 * more EXP for its next level than a level-71 value computed fresh would — a level 1 creature
 * (no stale carryover) climbed dramatically faster on the exact same EXP amount as a result. Every
 * place that builds/rehydrates a Creature or the profile now calls this instead of trusting
 * whatever expToNextLevel was already stored, so this self-heals automatically (including for any
 * future curve tweak) rather than needing a one-off DB backfill. */
export function expToNextLevelForLevel(level: number): number {
  let requirement = 100; // level 1 -> 2 base, same seed nextLevelExpRequirement always started from.
  for (let l = 2; l <= level; l++) {
    requirement = nextLevelExpRequirement(requirement, l);
  }
  return requirement;
}

// Creature level caps now vary by rarity instead of everyone sharing the flat MAX_LEVEL — LR and
// Mythic pull noticeably ahead late-game, matching how much rarer they are to obtain. A Mythic
// reached via Awaken (an SSR bumped up — see applyAwakenBump) gets a higher cap than a naturally-
// pulled Mythic: it's the reward for having already leveled/invested in the SSR that became it.
export const LEVEL_CAP_BY_RARITY: Record<Rarity, number> = {
  Common: 100,
  Rare: 100,
  SSR: 100,
  Mythic: 120,
  LR: 150,
};
export const AWAKENED_MYTHIC_LEVEL_CAP = 140;

export function creatureLevelCap(creature: { rarity: Rarity; awakenLevel?: number }): number {
  if (creature.rarity === "Mythic" && (creature.awakenLevel ?? 0) >= 1) {
    return AWAKENED_MYTHIC_LEVEL_CAP;
  }
  return LEVEL_CAP_BY_RARITY[creature.rarity];
}

function skill(
  id: string,
  name: string,
  description: string,
  type: Skill["type"],
  power: number,
  cooldown: number,
  unlockLevel = 1
): Skill {
  return { id, name, description, type, power, cooldown, unlockLevel };
}

// The canonical Dokkan-style Category list — every creature below carries a handful of these
// (Creature.categories), assigned by element/lore/role so team-building has real cross-unit
// synergy instead of one-off flavor tags. Also the vocabulary LrPassiveCondition.categories draws
// from (see lib/combat.ts's creatureMatchesLrPassiveCondition) — GallantKnight's "Royal Knights"
// passive is the current example, matching every other Royal Knights-tagged creature too, not just
// itself. Order here has no meaning; it's just every valid name in one place.
export const CREATURE_CATEGORIES = [
  "Dragon",
  "Dragon Kings",
  "Royal Knights",
  "Power of Darkness",
  "Power of Light",
  "Guardian of the Real World",
  "Guardian of the Digital World",
  "Eternal Rivals",
  "Saving Power",
  "Battle of Fate",
  "Savior",
  "Fighter of Justice",
  "Digital Power",
  "Power of the Seas",
  "Volcanic Power",
  "Power of Time",
  "Power of Space",
  "Time Travelers",
  "Travelers from the Future",
  "Winged Warriors",
  "Holy Knights",
] as const;

export const STARTER_CREATURES: Creature[] = [
  {
    id: "cr-crimson-paladin",
    name: "Crimson Paladin",
    element: "Light",
    rarity: "Mythic",
    categories: ["Power of Light", "Holy Knights", "Royal Knights", "Fighter of Justice", "Battle of Fate"],
    level: 100,
    exp: 0,
    expToNextLevel: 1000000,
    stage: 3,
    spriteKey: "crimsonpaladin",
    spriteFolder: "/assets/creatures/raid_bosses/crimsonpaladin/Idle/animations/stand_animation/south",
    baseStats: { hp: 50000, atk: 1500, def: 800, spd: 400 },
    skills: [
      skill("sk-cp-1", "Crimson Exterminion", "A precise, devastating light strike on one enemy.", "Attack", 150, 0, 1),
      skill("sk-cp-2", "Holy Guardian", "A sacred aura that buffs all stats for 3 turns.", "Defense", 0, 5, 1),
      skill("sk-cp-3", "Holy Judgment", "A massive energy blast that hits all enemies. 15% chance to paralyze.", "Attack", 220, 4, 1),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
    animationFrames: {
      "stand_animation": 9,
      "Crimson_Exterminion": 17,
      "Holy Guardian": 17,
      "Holy Judgment": 17,
    },
  },
  {
    id: "cr-storm-eagle",
    name: "StormEagle",
    element: "Electric",
    rarity: "Mythic",
    categories: ["Digital Power", "Winged Warriors", "Battle of Fate"],
    level: 100,
    exp: 0,
    expToNextLevel: 1000000,
    stage: 3,
    spriteKey: "stormeagle",
    spriteFolder: "/assets/creatures/raid_bosses/stormeagle/Idle/animations/stand_animation/south",
    // Raid boss — only 2 attacks (no buff skill like Crimson Paladin's) since only 2 non-idle
    // animations exist for it. See CreatureSprite.tsx's animName replace chain: each skill name
    // here must map to its actual (auto-captioned) animation folder name under Idle/animations.
    baseStats: { hp: 40000, atk: 1650, def: 650, spd: 480 },
    skills: [
      skill("sk-se-1", "Stormcore Discharge", "A concentrated bolt of storm energy blasts one enemy.", "Attack", 160, 0, 1),
      skill("sk-se-2", "Tempest Wingstorm", "A thunderous wingbeat unleashes a storm shockwave on all enemies.", "Attack", 210, 4, 1),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
    // Keyed by the actual on-disk animation folder name (post CreatureSprite.tsx replace
    // chain), not the skill's display name — same convention as Crimson Paladin's
    // "Crimson_Exterminion" key above.
    animationFrames: {
      "stand_animation": 9,
      "The_creature_stands_firm_its_feathers_bristling_as": 9,
      "The_creature_plants_its_feet_firmly_and_spreads_it": 9,
    },
  },
  {
    id: "cr-xpaladin",
    name: "XPaladin",
    element: "Light",
    rarity: "Mythic",
    categories: ["Power of Light", "Holy Knights", "Royal Knights", "Battle of Fate", "Travelers from the Future"],
    level: 100,
    exp: 0,
    expToNextLevel: 1000000,
    stage: 3,
    spriteKey: "xpaladin",
    spriteFolder: "/assets/creatures/raid_bosses/xpaladin/Idle/animations/stand_animation/south",
    // Same 2-attack-only pattern as StormEagle above — the zip also had a "Running" animation
    // that isn't used here (locomotion, not a combat move).
    baseStats: { hp: 45000, atk: 1550, def: 850, spd: 380 },
    skills: [
      skill("sk-xp-1", "Radiant Blade Rush", "A blazing sword thrust pierces one enemy.", "Attack", 150, 0, 1),
      skill("sk-xp-2", "Elysian Judgment", "A holy light erupts from the sacred shield, judging all enemies.", "Attack", 220, 4, 1),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
    // Same "keyed by actual folder name" convention as StormEagle above.
    animationFrames: {
      "stand_animation": 9,
      "sword_attack": 13,
      "final_elysium": 9,
    },
  },

  // Overclock weekly boss roster (lib/overclock.ts's OVERCLOCK_BOSS_ROTATION cycles through these
  // 3) — same "raid boss" pattern as Crimson Paladin/StormEagle/XPaladin above, but each animation
  // folder here keeps its literal on-disk name (special_attack1/special_attack2) rather than a
  // custom auto-captioned one, so CreatureSprite.tsx's replace chain maps display name -> that
  // literal folder name instead of a one-off auto-caption.
  //
  // baseStats here are deliberately much lower than the other raid bosses above — those are tuned
  // for a 3-4 player team; Overclock is 2v1, and turn-by-turn escalation (statBuffs, applied live in
  // OverclockBattleScreen.tsx, +8%/boss-turn) already does the "gets harder over time" work on top
  // of this starting point. level: 60 (not 100) both reflects that lower starting power and gives
  // the escalation something to visibly climb toward — OverclockBattleScreen also bumps the
  // displayed level a couple points per boss turn as a cosmetic readout of the same real escalation.
  {
    id: "cr-ov-cyber-knight",
    name: "Cyber Knight",
    element: "Electric",
    rarity: "Mythic",
    categories: ["Digital Power", "Royal Knights"],
    level: 60,
    exp: 0,
    expToNextLevel: 1000000,
    stage: 3,
    spriteKey: "cyberknight",
    spriteFolder: "/assets/creatures/raid_bosses/cyberknight/Idle/animations/stand_animation/south",
    baseStats: { hp: 10000000, atk: 280, def: 180, spd: 380 },
    skills: [
      skill("sk-ovck-1", "Neon Blade", "A crackling blade of light slashes one enemy.", "Attack", 155, 0, 1),
      skill("sk-ovck-2", "Overload Purge", "A surge of raw voltage overloads all enemies at once.", "Attack", 215, 4, 1),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
    animationFrames: {
      "stand_animation": 15,
      "special_attack1": 15,
      "special_attack2": 15,
    },
  },
  {
    id: "cr-ov-imperial-guardian",
    name: "Imperial Guardian",
    element: "Light",
    rarity: "Mythic",
    categories: ["Guardian of the Digital World", "Royal Knights"],
    level: 60,
    exp: 0,
    expToNextLevel: 1000000,
    stage: 3,
    spriteKey: "imperialguardian",
    spriteFolder: "/assets/creatures/raid_bosses/imperialguardian/Idle/animations/stand_animation/south",
    baseStats: { hp: 10000000, atk: 260, def: 220, spd: 340 },
    skills: [
      skill("sk-ovig-1", "Sovereign Smite", "A crushing blow from the guardian's own halberd.", "Attack", 150, 0, 1),
      skill("sk-ovig-2", "Imperial Decree", "A radiant shockwave judges every enemy at once.", "Attack", 225, 4, 1),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
    animationFrames: {
      "stand_animation": 15,
      "special_attack1": 15,
      "special_attack2": 17,
    },
  },
  {
    id: "cr-ov-dragon-lord",
    name: "Dragon Lord",
    element: "Fire",
    rarity: "Mythic",
    categories: ["Dragon", "Dragon Kings", "Volcanic Power"],
    level: 60,
    exp: 0,
    expToNextLevel: 1000000,
    stage: 3,
    spriteKey: "dragonlord",
    spriteFolder: "/assets/creatures/raid_bosses/dragonlord/Idle/animations/stand_animation/south",
    baseStats: { hp: 10000000, atk: 310, def: 160, spd: 400 },
    skills: [
      skill("sk-ovdl-1", "Infernal Claw", "A molten claw rakes across one enemy.", "Attack", 160, 0, 1),
      skill("sk-ovdl-2", "Draconic Cataclysm", "A cataclysmic blast of dragonfire engulfs all enemies.", "Attack", 230, 4, 1),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
    animationFrames: {
      "stand_animation": 15,
      "special_attack1": 17,
      "special_attack2": 15,
    },
  },

  {
    id: "cr-emberling",
    name: "Emberling",
    element: "Fire",
    rarity: "Rare",
    categories: ["Volcanic Power"],
    level: 12,
    exp: 340,
    expToNextLevel: 600,
    stage: 1,
    spriteKey: "emberling",
    spriteFolder: "/assets/creatures/emberling/idle",
    baseStats: { hp: 620, atk: 148, def: 76, spd: 104 },
    skills: [
      skill("sk-em-1", "Cinder Claw", "A blazing slash dealing fire damage to one enemy.", "Attack", 140, 0),
      skill("sk-em-2", "Flare Guard", "Raises own DEF for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-em-3", "Ash Cyclone", "Hits all enemies with a spinning ember burst.", "Attack", 95, 4, 10),
      skill("sk-em-4", "Rekindle", "Passively regenerates HP each turn.", "Passive", 0, 0, 15),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-tidalfin",
    name: "Tidalfin",
    element: "Water",
    rarity: "SSR",
    categories: ["Power of the Seas"],
    level: 15,
    exp: 120,
    expToNextLevel: 720,
    stage: 2,
    spriteKey: "tidalfin",
    spriteFolder: "/assets/creatures/tidalfin/idle",
    baseStats: { hp: 780, atk: 132, def: 94, spd: 96 },
    skills: [
      skill("sk-ti-1", "Riptide Slash", "A pressurized water strike on one enemy.", "Attack", 132, 0),
      skill("sk-ti-2", "Healing Tide", "Restores HP to the lowest-HP ally.", "Support", 110, 3, 8),
      skill("sk-ti-3", "Whirlpool", "Pulls all enemies in, dealing water damage.", "Attack", 88, 4, 12),
      skill("sk-ti-4", "Deep Focus", "Passively boosts SPD when HP is above 50%.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-gale-sprite",
    name: "Gale Sprite",
    element: "Nature",
    rarity: "Common",
    categories: ["Winged Warriors"],
    level: 8,
    exp: 60,
    expToNextLevel: 320,
    stage: 1,
    spriteKey: "gale-sprite",
    spriteFolder: "/assets/creatures/gale_sprite/idle",
    baseStats: { hp: 480, atk: 110, def: 62, spd: 132 },
    skills: [
      skill("sk-ga-1", "Vine Whip", "A quick nature strike on one enemy.", "Attack", 105, 0),
      skill("sk-ga-2", "Thorn Veil", "Reduces incoming damage for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-ga-3", "Bloom Burst", "Nature damage to all enemies with a chance to slow.", "Attack", 80, 4, 10),
      skill("sk-ga-4", "Photosynthesis", "Passively restores small HP each turn in daylight.", "Passive", 0, 0, 12),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-voltling",
    name: "Voltling",
    element: "Electric",
    rarity: "Rare",
    categories: ["Digital Power"],
    level: 10,
    exp: 210,
    expToNextLevel: 480,
    stage: 1,
    spriteKey: "voltling",
    spriteFolder: "/assets/creatures/voltling/idle",
    baseStats: { hp: 540, atk: 138, def: 68, spd: 140 },
    skills: [
      skill("sk-vo-1", "Spark Bite", "A quick electric nip on one enemy.", "Attack", 120, 0),
      skill("sk-vo-2", "Static Charge", "Raises own SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-vo-3", "Thunder Dash", "Electric damage to all enemies with a chance to stun.", "Attack", 92, 4, 10),
      skill("sk-vo-4", "Capacitor Coils", "Passively charges up, boosting the next skill's power.", "Passive", 0, 0, 14),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-firebit",
    name: "Firebit",
    element: "Fire",
    rarity: "Rare",
    categories: ["Volcanic Power"],
    level: 9,
    exp: 150,
    expToNextLevel: 420,
    stage: 1,
    spriteKey: "firebit",
    spriteFolder: "/assets/creatures/firebit/idle",
    baseStats: { hp: 560, atk: 144, def: 70, spd: 118 },
    skills: [
      skill("sk-fb-1", "Ember Nip", "A quick fiery bite on one enemy.", "Attack", 128, 0),
      skill("sk-fb-2", "Sun Cloak", "Raises own DEF for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-fb-3", "Wildfire Romp", "Fire damage to all enemies with a chance to burn.", "Attack", 90, 4, 10),
      skill("sk-fb-4", "Kindle Spirit", "Passively regenerates a small amount of HP each turn.", "Passive", 0, 0, 13),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-dragoon",
    name: "Dragoon",
    element: "Nature",
    rarity: "SSR",
    categories: ["Dragon", "Winged Warriors"],
    level: 11,
    exp: 260,
    expToNextLevel: 540,
    stage: 1,
    spriteKey: "dragoon",
    spriteFolder: "/assets/creatures/dragoon/idle",
    baseStats: { hp: 610, atk: 142, def: 88, spd: 108 },
    skills: [
      skill("sk-dr-1", "Tail Lash", "A sweeping tail strike on one enemy.", "Attack", 134, 0),
      skill("sk-dr-2", "Scale Harden", "Raises own DEF for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-dr-3", "Verdant Roar", "Nature damage to all enemies with a chance to slow.", "Attack", 96, 4, 10),
      skill("sk-dr-4", "Regenerative Hide", "Passively restores HP each turn based on max HP.", "Passive", 0, 0, 16),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-crimson-guardian",
    name: "CrimsonGuardian",
    element: "Fire",
    rarity: "SSR",
    categories: ["Volcanic Power", "Guardian of the Real World"],
    level: 14,
    exp: 320,
    expToNextLevel: 680,
    stage: 2,
    spriteKey: "crimsonguardian",
    spriteFolder: "/assets/creatures/crimsonguardian/idle",
    // Demoted from Mythic to SSR — stats/skill power rescaled down using the exact inverse of
    // AWAKEN_STAT_MULTIPLIER (the game's own SSR->Mythic conversion ratio further down this
    // file), so the result lands naturally inside the existing SSR band (Emberfiend's
    // 680/168/98/100 is the current ceiling) instead of an arbitrary guess. Leans tanky (HP/DEF)
    // next to SilverDragon's swift-striker profile below.
    baseStats: { hp: 640, atk: 148, def: 94, spd: 130 },
    skills: [
      skill("sk-cg-1", "Blazing Judgment", "A sword strike wreathed in crimson flame on one enemy.", "Attack", 158, 0),
      skill("sk-cg-2", "Aegis of Embers", "Raises own DEF sharply for 2 turns with the ceremonial shield.", "Defense", 0, 3, 5),
      skill("sk-cg-3", "Crimson Cataclysm", "An overwhelming flame judgment on all enemies.", "Attack", 110, 4, 11),
      skill("sk-cg-4", "Guardian's Resolve", "Passively reduces damage taken when HP falls below 30%.", "Passive", 0, 0, 16),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-silver-dragon",
    name: "SilverDragon",
    element: "Light",
    rarity: "SSR",
    categories: ["Power of Light", "Dragon", "Dragon Kings", "Winged Warriors"],
    level: 15,
    exp: 350,
    expToNextLevel: 720,
    stage: 2,
    spriteKey: "silverdragon",
    spriteFolder: "/assets/creatures/silverdragon/idle",
    // Demoted from Mythic to SSR — same inverse-AWAKEN_STAT_MULTIPLIER rescale as CrimsonGuardian
    // above. Swift-striker profile (higher ATK/SPD, slightly less tanky than CrimsonGuardian).
    baseStats: { hp: 600, atk: 160, def: 84, spd: 130 },
    skills: [
      skill("sk-sd-1", "Radiant Fang", "A blessed bite crackling with electric light on one enemy.", "Attack", 154, 0),
      skill("sk-sd-2", "Sacred Scales", "Raises own DEF and SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-sd-3", "Astral Nova", "A burst of sacred light damages all enemies with a chance to blind.", "Attack", 104, 4, 12),
      skill("sk-sd-4", "Celestial Ward", "Passively shields the lowest-HP ally each turn.", "Passive", 0, 0, 17),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-venomshade",
    name: "Venomshade",
    element: "Dark",
    rarity: "Rare",
    categories: ["Power of Darkness"],
    level: 10,
    exp: 180,
    expToNextLevel: 460,
    stage: 1,
    spriteKey: "bluelf",
    spriteFolder: "/assets/creatures/bluelf/idle",
    baseStats: { hp: 560, atk: 150, def: 64, spd: 128 },
    skills: [
      skill("sk-ve-1", "Toxin Fang", "A poisoned dagger strike on one enemy.", "Attack", 136, 0),
      skill("sk-ve-2", "Shadow Veil", "Raises own evasion for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-ve-3", "Venom Flurry", "A flurry of blades hitting all enemies with a chance to poison.", "Attack", 92, 4, 10),
      skill("sk-ve-4", "Creeping Poison", "Passively deals damage over time to a poisoned enemy.", "Passive", 0, 0, 14),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-tidewarden",
    name: "Tidewarden",
    element: "Water",
    rarity: "Rare",
    categories: ["Power of the Seas", "Guardian of the Real World"],
    level: 9,
    exp: 140,
    expToNextLevel: 400,
    stage: 1,
    spriteKey: "orca",
    spriteFolder: "/assets/creatures/orca/idle",
    baseStats: { hp: 600, atk: 126, def: 82, spd: 110 },
    skills: [
      skill("sk-tw-1", "Tidal Slam", "A crushing wave-borne strike on one enemy.", "Attack", 122, 0),
      skill("sk-tw-2", "Ancestral Ward", "Raises own DEF for 2 turns, blessed by totem spirits.", "Defense", 0, 3, 5),
      skill("sk-tw-3", "Riptide Chant", "Water damage to all enemies with a chance to slow.", "Attack", 86, 4, 10),
      skill("sk-tw-4", "Spirit Current", "Passively restores a small amount of HP each turn.", "Passive", 0, 0, 13),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-emberfiend",
    name: "Emberfiend",
    element: "Dark",
    rarity: "SSR",
    categories: ["Power of Darkness"],
    level: 13,
    exp: 300,
    expToNextLevel: 620,
    stage: 2,
    spriteKey: "crimsonwarrior",
    spriteFolder: "/assets/creatures/crimsonwarrior/idle",
    baseStats: { hp: 680, atk: 168, def: 98, spd: 100 },
    skills: [
      skill("sk-ef-1", "Magma Cleave", "A molten greatsword strike on one enemy.", "Attack", 158, 0),
      skill("sk-ef-2", "Infernal Bulwark", "Raises own DEF sharply for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-ef-3", "Ashen Wingstorm", "A sweep of smoldering wings damaging all enemies.", "Attack", 112, 4, 11),
      skill("sk-ef-4", "Undying Wrath", "Passively raises ATK when HP falls below 40%.", "Passive", 0, 0, 16),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-thundracoil",
    name: "Thundracoil",
    element: "Electric",
    rarity: "SSR",
    categories: ["Digital Power", "Dragon"],
    level: 14,
    exp: 340,
    expToNextLevel: 660,
    stage: 2,
    spriteKey: "easterndragon",
    spriteFolder: "/assets/creatures/easterndragon/idle",
    baseStats: { hp: 640, atk: 158, def: 86, spd: 132 },
    skills: [
      skill("sk-th-1", "Storm Fang", "A lightning-wreathed bite on one enemy.", "Attack", 150, 0),
      skill("sk-th-2", "Static Scales", "Raises own SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-th-3", "Tempest Roar", "A crashing storm damaging all enemies with a chance to stun.", "Attack", 108, 4, 12),
      skill("sk-th-4", "Galvanic Core", "Passively charges up, boosting the next skill's power.", "Passive", 0, 0, 17),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-starweaver",
    name: "Starweaver",
    element: "Light",
    rarity: "SSR",
    categories: ["Power of Light", "Saving Power"],
    level: 12,
    exp: 260,
    expToNextLevel: 600,
    stage: 2,
    spriteKey: "magicelf",
    spriteFolder: "/assets/creatures/magicelf/idle",
    baseStats: { hp: 620, atk: 140, def: 88, spd: 118 },
    skills: [
      skill("sk-sw-1", "Starlight Lance", "A bolt of celestial energy on one enemy.", "Attack", 132, 0),
      skill("sk-sw-2", "Astral Shield", "Shields the lowest-HP ally for 2 turns.", "Support", 0, 3, 5),
      skill("sk-sw-3", "Nova Cascade", "A burst of starlight damaging all enemies.", "Attack", 96, 4, 11),
      skill("sk-sw-4", "Guiding Light", "Passively restores HP to the lowest-HP ally each turn.", "Passive", 0, 0, 15),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-wargek",
    name: "Wargek",
    element: "Fire",
    rarity: "SSR",
    categories: ["Volcanic Power"],
    level: 14,
    exp: 330,
    expToNextLevel: 680,
    stage: 2,
    spriteKey: "wargek",
    spriteFolder: "/assets/creatures/wargek/idle",
    // Demoted from Mythic to SSR — same inverse-AWAKEN_STAT_MULTIPLIER rescale as
    // CrimsonGuardian/SilverDragon above. Swift striker — highest ATK/SPD of this trio.
    baseStats: { hp: 610, atk: 162, def: 88, spd: 132 },
    skills: [
      skill("sk-wg-1", "Dramon Claw Rend", "Twin golden dragon-claw gauntlets tear into one enemy.", "Attack", 168, 0),
      skill("sk-wg-2", "Brave Shield Guard", "Raises own DEF sharply for 2 turns behind the Brave Shield.", "Defense", 0, 3, 5),
      skill("sk-wg-3", "Terra Force", "A devastating energy sphere scorches all enemies.", "Attack", 112, 4, 11),
      skill("sk-wg-4", "Warrior's Instinct", "Passively raises ATK when HP falls below 40%.", "Passive", 0, 0, 16),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-goldak",
    name: "Goldak",
    element: "Water",
    rarity: "SSR",
    categories: ["Power of the Seas"],
    level: 13,
    exp: 300,
    expToNextLevel: 640,
    stage: 2,
    spriteKey: "goldak",
    spriteFolder: "/assets/creatures/goldak/idle",
    // Demoted from Mythic to SSR — same rescale. Tank — highest HP/DEF of this trio, trading off
    // the lowest SPD.
    baseStats: { hp: 665, atk: 145, def: 97, spd: 120 },
    skills: [
      skill("sk-gd-1", "Hydro Drill Impale", "The spinning hydro-drill gauntlet bores into one enemy.", "Attack", 150, 0),
      skill("sk-gd-2", "Tower Barrier", "Raises own DEF sharply for 2 turns behind a holographic barrier.", "Defense", 0, 3, 5),
      skill("sk-gd-3", "Abyssal Tentacle Storm", "Four cybernetic tentacles lash all enemies with a chance to slow.", "Attack", 100, 4, 11),
      skill("sk-gd-4", "Pressure Hide", "Passively reduces damage taken when HP falls below 30%.", "Passive", 0, 0, 16),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-firefex",
    name: "Firefex",
    element: "Fire",
    rarity: "SSR",
    categories: ["Volcanic Power"],
    level: 12,
    exp: 270,
    expToNextLevel: 600,
    stage: 2,
    spriteKey: "firefex",
    spriteFolder: "/assets/creatures/firefex/idle",
    // Demoted from Mythic to SSR — same rescale. Aerial glass-cannon — highest SPD of this trio,
    // lowest DEF.
    baseStats: { hp: 595, atk: 157, def: 83, spd: 135 },
    skills: [
      skill("sk-fx-1", "Solar Talon Rake", "Golden talons wreathed in radiant plasma strike one enemy.", "Attack", 162, 0),
      skill("sk-fx-2", "Radiant Wingspan", "Raises own SPD and DEF for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-fx-3", "Phoenix Flare", "A cascade of solar embers burns all enemies with a chance to burn.", "Attack", 108, 4, 11),
      skill("sk-fx-4", "Solar Rebirth", "Passively regenerates HP each turn, fueled by the reactor core.", "Passive", 0, 0, 16),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },

  // --- Mythic tier ---
  // Every stat here clears the SSR ceiling (Emberfiend's 680hp/168atk/98def/100spd band, now the
  // highest since Wargek/Goldak/Firefex/CrimsonGuardian/SilverDragon were demoted to SSR above)
  // by a wide margin. Each leans into its own combat profile (balanced, tank, heavy bruiser)
  // rather than being flat stat clones of each other.
  {
    id: "cr-blitzfire",
    name: "Blitzfire",
    element: "Fire",
    rarity: "Mythic",
    categories: ["Volcanic Power"],
    level: 33,
    exp: 880,
    expToNextLevel: 2150,
    stage: 3,
    spriteKey: "blitzfire",
    spriteFolder: "/assets/creatures/blitzfire/idle",
    // Heavy artillery bruiser — highest single-target power of the new Mythics, slowest SPD.
    baseStats: { hp: 1180, atk: 232, def: 145, spd: 135 },
    skills: [
      skill("sk-bf-1", "Plasma Stake Barrage", "Twin plasma railguns unload on one enemy.", "Attack", 180, 0),
      skill("sk-bf-2", "Binder Lockdown", "Raises own DEF sharply for 2 turns, thrusters venting to brace impact.", "Defense", 0, 3, 5),
      skill("sk-bf-3", "Missile Pod Salvo", "Back-mounted missile pods saturate all enemies.", "Attack", 142, 5, 16),
      skill("sk-bf-4", "Overcharged Core", "Passively boosts the next skill's power after taking damage.", "Passive", 0, 0, 20),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-emperortoise",
    name: "Emperortoise",
    element: "Water",
    rarity: "Mythic",
    categories: ["Power of the Seas", "Guardian of the Digital World"],
    level: 32,
    exp: 850,
    expToNextLevel: 2100,
    stage: 3,
    spriteKey: "emperortoise",
    spriteFolder: "/assets/creatures/emperortoise/Idle/rotations",
    baseStats: { hp: 1250, atk: 205, def: 165, spd: 130 },
    skills: [
      skill("sk-et-1", "Hydro Cannon", "A massive blast of pressurized water.", "Attack", 160, 0),
      skill("sk-et-2", "Imperial Shell", "Raises own DEF sharply for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-et-3", "Tsunami Tremor", "A devastating wave damages all enemies.", "Attack", 130, 4, 15),
      skill("sk-et-4", "Ancient Resilience", "Passively regenerates HP and boosts DEF.", "Passive", 0, 0, 20),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },

  // --- LR tier ---
  // The new top rarity, above Mythic. Every stat here clears the highest Mythic value in the
  // whole roster (hp1200/atk235/def155/spd155, all from the block above) by a wide margin —
  // keeping the Common < Rare < SSR < Mythic < LR power ordering unambiguous stat-by-stat, not
  // just on average.
  {
    id: "cr-omega",
    name: "Omega",
    element: "Light",
    rarity: "LR",
    categories: ["Power of Light", "Royal Knights", "Savior", "Fighter of Justice"],
    level: 45,
    exp: 1600,
    expToNextLevel: 3400,
    stage: 3,
    spriteKey: "omega",
    spriteFolder: "/assets/creatures/omega/idle",
    // The flagship LR — highest overall stat total, a true dual-weapon fusion powerhouse.
    baseStats: { hp: 1500, atk: 290, def: 185, spd: 168 },
    skills: [
      skill("sk-om-1", "Grey Sword Cleave", "The colossal digi-code broadsword cleaves through one enemy.", "Attack", 210, 0),
      skill("sk-om-2", "Garuru Cannon Lockdown", "Raises own DEF and SPD sharply for 2 turns, cannon barrel tracking threats.", "Defense", 0, 3, 6),
      skill("sk-om-3", "Supreme Cannon", "Twin dragon and wolf heads unleash a world-ending barrage on all enemies.", "Attack", 178, 5, 22),
      skill("sk-om-4", "Royal Knight's Resolve", "Passively reduces damage taken and raises ATK when HP falls below 35%.", "Passive", 0, 0, 26),
    ],
    ultimateSkill: {
      id: "ult-om-1",
      name: "Cross Strash",
      description: "An X-shaped slash of pure light annihilates one enemy, leaving them paralyzed.",
      power: 320,
      resonanceCost: 80,
      inflicts: { status: "paralysis", turns: 2, chance: 100 },
      animationGif: "/assets/creatures/omega/animations/special_attack.gif",
    },
    lrPassive: {
      name: "Balance Power",
      description: "Increases ATK of Light and Dark type monsters by 70% for 3 turns from the start of the battle.",
      effect: "atk-buff",
      percent: 70,
      turns: 3,
      appliesTo: { elements: ["Light", "Dark"] },
    },
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-poseidon",
    name: "Poseidon",
    element: "Water",
    rarity: "LR",
    categories: ["Power of the Seas", "Saving Power", "Savior"],
    level: 42,
    exp: 1450,
    expToNextLevel: 3250,
    stage: 3,
    spriteKey: "poseidon",
    spriteFolder: "/assets/creatures/poseidon/idle",
    // The tankiest LR — highest HP/DEF of the four, sovereign of the depths.
    baseStats: { hp: 1550, atk: 270, def: 195, spd: 160 },
    skills: [
      skill("sk-ps-1", "Crescent Tide Blade", "The glowing energy naginata carves through one enemy.", "Attack", 200, 0),
      skill("sk-ps-2", "Tidal Bulwark", "Raises own DEF sharply for 2 turns, channeling the depths.", "Defense", 0, 3, 6),
      skill("sk-ps-3", "Abyssal Sovereign's Wrath", "A crashing tidal wave of pure pressure devastates all enemies.", "Attack", 172, 5, 22),
      skill("sk-ps-4", "Sovereign's Vigil", "Passively restores a large amount of HP to the lowest-HP ally each turn.", "Passive", 0, 0, 25),
    ],
    ultimateSkill: {
      id: "ult-ps-1",
      name: "Poseidon Force",
      description: "A tidal wave of maritime energy crashes over all enemies, leaving them paralyzed.",
      power: 190,
      resonanceCost: 75,
      inflicts: { status: "paralysis", turns: 2, chance: 100 },
      animationGif: "/assets/creatures/poseidon/animations/special_attack.gif",
    },
    lrPassive: {
      name: "King of the Sea",
      description: "For 3 turns from the start of the battle, increases DEF of Water type and LR monsters by 50%.",
      effect: "def-buff",
      percent: 50,
      turns: 3,
      appliesTo: { elements: ["Water"], rarities: ["LR"] },
    },
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-magnagold",
    name: "Magnagold",
    element: "Light",
    rarity: "LR",
    categories: ["Power of Light", "Royal Knights", "Savior"],
    level: 40,
    exp: 1350,
    expToNextLevel: 3100,
    stage: 3,
    spriteKey: "magnagold",
    spriteFolder: "/assets/creatures/magnagold/idle",
    // The swiftest LR — highest SPD in the whole roster, aggressive aerial striker.
    baseStats: { hp: 1420, atk: 285, def: 175, spd: 175 },
    skills: [
      skill("sk-mg-1", "Magna Blast", "A concentrated golden energy bolt fired from the shoulder pods on one enemy.", "Attack", 205, 0),
      skill("sk-mg-2", "Miracle Plating", "Raises own DEF and SPD for 2 turns behind faceted gold armor.", "Defense", 0, 3, 6),
      skill("sk-mg-3", "Golden Nova Wing", "A radiant explosion from both shoulder thrusters engulfs all enemies.", "Attack", 170, 5, 21),
      skill("sk-mg-4", "Miracle of Light", "Passively raises ATK sharply when HP falls below 40%.", "Passive", 0, 0, 24),
    ],
    ultimateSkill: {
      id: "ult-mg-1",
      name: "Magna Execution",
      description: "A golden radiant blast obliterates all enemies, leaving them paralyzed.",
      power: 210,
      resonanceCost: 80,
      inflicts: { status: "paralysis", turns: 2, chance: 100 },
      animationGif: "/assets/creatures/magnagold/animations/special_attack.gif",
    },
    lrPassive: {
      name: "Draconic Power",
      description: "For 3 turns from the start of the battle, increases evasion probability by 200%.",
      effect: "evasion-buff",
      percent: 200,
      turns: 3,
      appliesTo: {}, // unrestricted — the whole team
    },
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-abaddo",
    name: "Abaddo",
    element: "Dark",
    rarity: "LR",
    categories: ["Power of Darkness", "Eternal Rivals"],
    level: 44,
    exp: 1550,
    expToNextLevel: 3350,
    stage: 3,
    spriteKey: "abaddo",
    spriteFolder: "/assets/creatures/abaddo/idle",
    // The glass-cannon LR — highest ATK in the whole roster, an eldritch void anomaly.
    baseStats: { hp: 1400, atk: 295, def: 170, spd: 165 },
    skills: [
      skill("sk-ab-1", "Void Talon Rend", "Segmented bladed cables lash out from the shadows to impale one enemy.", "Attack", 215, 0),
      skill("sk-ab-2", "Obsidian Ring Shell", "Raises own DEF sharply for 2 turns behind orbiting armor plates.", "Defense", 0, 3, 6),
      skill("sk-ab-3", "Cataclysm Eye", "The central crimson eye unleashes a reality-warping beam on all enemies.", "Attack", 182, 5, 23),
      skill("sk-ab-4", "Entropy Feed", "Passively drains HP from the target equal to a portion of damage dealt.", "Passive", 0, 0, 26),
    ],
    ultimateSkill: {
      id: "ult-ab-1",
      name: "Dark Space",
      description: "A rift of pure darkness engulfs all enemies, leaving them dazed and confused.",
      power: 230,
      resonanceCost: 85,
      inflicts: { status: "confusion", turns: 2, chance: 100 },
      animationGif: "/assets/creatures/abaddo/animations/special_attack.gif",
    },
    lrPassive: {
      name: "Dark Emperor",
      description: "Drastically increases the probability of Dark type monsters attacking twice.",
      effect: "double-hit-chance",
      percent: 50,
      // No turns field — unlike the other 4 LR passives, this one never expires this battle.
      appliesTo: { elements: ["Dark"] },
    },
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-gallantknight",
    name: "GallantKnight",
    element: "Light",
    rarity: "LR",
    categories: ["Power of Light", "Royal Knights", "Holy Knights", "Savior", "Eternal Rivals"],
    level: 41,
    exp: 1400,
    expToNextLevel: 3200,
    stage: 3,
    spriteKey: "gallantknight",
    spriteFolder: "/assets/creatures/gallantknight/idle",
    // Promoted from Mythic to LR — the balanced all-rounder of the tier, no dump stat (unlike
    // Omega's raw power lean, Poseidon's bulk, or Abaddo's glass-cannon ATK). Skill power/unlock
    // levels bumped to match the LR band alongside baseStats, so it hits as hard as its peers.
    baseStats: { hp: 1450, atk: 280, def: 180, spd: 168 },
    skills: [
      skill("sk-gk-1", "Lightning Joust", "A holy lance thrust crackling with judgment light on one enemy.", "Attack", 206, 0),
      skill("sk-gk-2", "Aegis Cape", "Raises own DEF for 2 turns behind the flowing cape-shield.", "Defense", 0, 3, 6),
      skill("sk-gk-3", "Final Elysion", "A holy energy blast judges all enemies.", "Attack", 176, 5, 22),
      skill("sk-gk-4", "Knight's Vow", "Passively shields the lowest-HP ally each turn.", "Passive", 0, 0, 25),
    ],
    ultimateSkill: {
      id: "ult-gk-1",
      name: "Sovereign's Judgment",
      description: "A radiant blade of pure light passes final judgment on one enemy, leaving them paralyzed.",
      power: 300,
      resonanceCost: 80,
      inflicts: { status: "paralysis", turns: 2, chance: 100 },
      animationGif: "/assets/creatures/gallantknight/animations/special_attack.gif",
    },
    lrPassive: {
      name: "Royal Knight",
      description: "Increases ATK of Royal Knights category monsters by 40% for 3 turns from the start of the battle.",
      effect: "atk-buff",
      percent: 40,
      turns: 3,
      appliesTo: { categories: ["Royal Knights"] },
    },
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },

  // --- Mythic tier (batch 2) ---
  // Same "clearly beats SSR" rule as the first Mythic batch above (hp/atk/def all clear the
  // 780/168/98 SSR ceiling by a wide margin; spd stays at-or-above Voltling's 140 ceiling even on
  // the slowest/tankiest of these, matching Goldak's own precedent of sitting right at it).
  {
    id: "cr-jeshunter",
    name: "Jeshunter",
    element: "Light",
    rarity: "Mythic",
    categories: ["Power of Light", "Fighter of Justice"],
    level: 31,
    exp: 830,
    expToNextLevel: 2060,
    stage: 3,
    spriteKey: "jeshunter",
    spriteFolder: "/assets/creatures/jeshunter/Idle/rotations",
    // Balanced aggressive striker — orbiting sword-drones and blade-leg mobility.
    baseStats: { hp: 1150, atk: 238, def: 152, spd: 148 },
    skills: [
      skill("sk-je-1", "Blade Leg Slash", "Colossal sword-blade legs cleave through one enemy in a single deliberate strike.", "Attack", 184, 0),
      skill("sk-je-2", "Drone Sentinel Guard", "Three sword-drones orbit into formation, raising own DEF sharply for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-je-3", "Drone Barrage", "The orbiting sword-drones launch a relentless barrage on all enemies.", "Attack", 140, 4, 14),
      skill("sk-je-4", "Runic Resolve", "Passively raises crit chance as the tattered cape billows with charged digital runes.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-blazefire",
    name: "Blazefire",
    element: "Fire",
    rarity: "Mythic",
    categories: ["Volcanic Power"],
    level: 29,
    exp: 770,
    expToNextLevel: 1960,
    stage: 3,
    spriteKey: "blazefire",
    spriteFolder: "/assets/creatures/blazefire/Idle/rotations",
    // Glass-cannon martial artist — highest SPD lean of the batch, lowest DEF.
    baseStats: { hp: 1060, atk: 248, def: 126, spd: 160 },
    skills: [
      skill("sk-bz-1", "Blaze Kick", "A flame-wreathed roundhouse kick scorches one enemy.", "Attack", 190, 0),
      skill("sk-bz-2", "Fighting Spirit", "Internal body heat surges, raising own ATK and SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-bz-3", "Flare Blitz Barrage", "A relentless flurry of blazing kicks scorches all enemies.", "Attack", 142, 4, 14),
      skill("sk-bz-4", "Rising Flame", "Passively raises ATK further as its internal temperature climbs each turn.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-zion",
    name: "Zion",
    element: "Light",
    rarity: "Mythic",
    categories: ["Power of Light", "Holy Knights", "Guardian of the Digital World"],
    level: 34,
    exp: 920,
    expToNextLevel: 2200,
    stage: 3,
    spriteKey: "zion",
    spriteFolder: "/assets/creatures/zion/Idle/rotations",
    // Holy tank-striker wielding the Omega Blade — highest DEF/HP lean of the batch.
    baseStats: { hp: 1230, atk: 232, def: 162, spd: 142 },
    skills: [
      skill("sk-zi-1", "Omega Blade Cleave", "The colossal Omega Blade, born from Omnimon's spirit, cleaves through one enemy with purifying light.", "Attack", 188, 0),
      skill("sk-zi-2", "Paladin's Aegis", "Raises own DEF sharply for 2 turns behind angelic white wings.", "Defense", 0, 3, 5),
      skill("sk-zi-3", "Holy Wing Barrage", "Supersonic wing strikes rain purifying light on all enemies.", "Attack", 146, 5, 16),
      skill("sk-zi-4", "Founder's Authority", "Passively raises ATK when HP falls below 40%.", "Passive", 0, 0, 20),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-murasame",
    name: "Murasame",
    element: "Light",
    rarity: "Mythic",
    categories: ["Power of Light", "Holy Knights", "Eternal Rivals"],
    level: 27,
    exp: 680,
    expToNextLevel: 1850,
    stage: 3,
    spriteKey: "murasame",
    spriteFolder: "/assets/creatures/murasame/Idle/rotations",
    // Support-leaning shrine priestess — the only Support-type skill in this batch (heals).
    baseStats: { hp: 1090, atk: 208, def: 146, spd: 150 },
    skills: [
      skill("sk-mu-1", "Gohei Purge", "A purification wand strike disperses corrupted data from one enemy.", "Attack", 168, 0),
      skill("sk-mu-2", "Shimenawa Barrier", "Sacred cords weave a barrier, raising own DEF for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-mu-3", "Taidō Ryūgoku", "A ceremonial purification dance conjures a mandala that restores HP to the lowest-HP ally.", "Support", 150, 4, 14),
      skill("sk-mu-4", "Kuda-gitsune Ward", "Passively channels spirit foxes to shield allies from status ailments.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-quantum",
    name: "Quantum",
    element: "Electric",
    rarity: "Mythic",
    categories: ["Digital Power", "Power of Space", "Power of Time", "Travelers from the Future"],
    level: 30,
    exp: 800,
    expToNextLevel: 2000,
    stage: 3,
    spriteKey: "quantum",
    spriteFolder: "/assets/creatures/quantum/Idle/rotations",
    // Evasive data-probability caster — highest SPD in the batch.
    baseStats: { hp: 1040, atk: 226, def: 130, spd: 163 },
    skills: [
      skill("sk-qt-1", "Probability Fracture", "Reshapes localized probability to strike one enemy from an unavoidable angle.", "Attack", 182, 0),
      skill("sk-qt-2", "Data Lattice Shift", "Floating data crystals reconfigure into a shield, raising own DEF and SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-qt-3", "Timeline Collapse", "Simulates and collapses countless branching timelines onto all enemies at once.", "Attack", 138, 4, 14),
      skill("sk-qt-4", "Observer's Insight", "Passively raises crit chance by calculating enemy patterns before they strike.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-goldion",
    name: "Goldion",
    element: "Fire",
    rarity: "Mythic",
    categories: ["Volcanic Power", "Digital Power"],
    level: 33,
    exp: 870,
    expToNextLevel: 2150,
    stage: 3,
    spriteKey: "goldion",
    spriteFolder: "/assets/creatures/goldion/Idle/rotations",
    // Solar lion bruiser — heavy single-target power backed by a scorching AoE nova.
    baseStats: { hp: 1200, atk: 246, def: 150, spd: 134 },
    skills: [
      skill("sk-gl-1", "Phoebus Blow", "Channels the sun's heat into a devastating, explosive punch.", "Attack", 196, 0),
      skill("sk-gl-2", "Solar Halo Guard", "The burning solar halo flares, raising own DEF sharply for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-gl-3", "Sol Blaster", "Releases a massive sphere of high-density solar plasma that scorches all enemies.", "Attack", 148, 5, 16),
      skill("sk-gl-4", "Noble Discipline", "Passively raises ATK when an ally is struck down, honoring their sacrifice.", "Passive", 0, 0, 20),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-mugen",
    name: "Mugen",
    element: "Dark",
    rarity: "Mythic",
    categories: ["Power of Darkness", "Power of Time"],
    level: 35,
    exp: 950,
    expToNextLevel: 2250,
    stage: 3,
    spriteKey: "mugen",
    spriteFolder: "/assets/creatures/mugen/Idle/rotations",
    // Cybernetic mecha-dragon fusion — highest HP/DEF, lowest SPD of the batch (a dump-stat tank).
    baseStats: { hp: 1250, atk: 234, def: 170, spd: 141 },
    skills: [
      skill("sk-mn-1", "Booster Claw", "A high-voltage, rocket-assisted claw crushes through one enemy's armor.", "Attack", 192, 0),
      skill("sk-mn-2", "Bulkhead Lockdown", "Reinforced bulkheads seal shut, raising own DEF sharply for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-mn-3", "Infinity Cannons", "Dual naval-grade cannons unleash apocalyptic beams of plasma on all enemies.", "Attack", 152, 5, 16),
      skill("sk-mn-4", "Catastrophe Core", "Passively overheats its reactor to boost the next skill's power after taking damage.", "Passive", 0, 0, 22),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-sakuya",
    name: "Sakuya",
    element: "Nature",
    rarity: "Mythic",
    categories: ["Guardian of the Real World", "Saving Power"],
    level: 30,
    exp: 810,
    expToNextLevel: 2000,
    stage: 3,
    spriteKey: "sakuya",
    spriteFolder: "/assets/creatures/sakuya/Idle/rotations",
    // Elemental fox-spirit striker — commands four spectral kuda-gitsune in battle.
    baseStats: { hp: 1100, atk: 230, def: 138, spd: 154 },
    skills: [
      skill("sk-sy-1", "Kongou Shakujō Strike", "The ringed sacred staff strikes one enemy with a cascade of chiming, disorienting energy.", "Attack", 186, 0),
      skill("sk-sy-2", "Kuda-gitsune Veil", "Four spirit foxes weave a protective veil, raising own DEF and SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-sy-3", "Izuna", "Summons four elemental spirit foxes in a synchronized whirlwind that tracks and strikes all enemies.", "Attack", 142, 4, 14),
      skill("sk-sy-4", "Kongoushin Mandala", "Passively purifies status ailments from the caster at the start of each turn.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-habakiri",
    name: "Habakiri",
    element: "Dark",
    rarity: "Mythic",
    categories: ["Power of Darkness", "Eternal Rivals"],
    level: 32,
    exp: 860,
    expToNextLevel: 2100,
    stage: 3,
    spriteKey: "habakiri",
    spriteFolder: "/assets/creatures/habakiri/Idle/rotations",
    // Four-armed divine general — highest ATK in the batch, castle guardian's raw power.
    baseStats: { hp: 1170, atk: 254, def: 156, spd: 132 },
    skills: [
      skill("sk-hb-1", "Aramasa Flurry", "Seven telekinetic blade-fragments cut into one enemy from every direction at once.", "Attack", 200, 0),
      skill("sk-hb-2", "Divine Ring Ward", "The floating golden ring hums with authority, raising own DEF sharply for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-hb-3", "Habakiri", "Concentrates the body's full divine aura into the blade for a single massive cut across all enemies.", "Attack", 156, 5, 17),
      skill("sk-hb-4", "Castle Guardian's Vow", "Passively raises DEF the longer it remains standing without retreating.", "Passive", 0, 0, 22),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-platinum-dragon",
    name: "Platinum Dragon",
    element: "Light",
    rarity: "Mythic",
    categories: ["Power of Light", "Dragon", "Dragon Kings", "Winged Warriors"],
    level: 28,
    exp: 720,
    expToNextLevel: 1900,
    stage: 3,
    spriteKey: "platinum_dragon",
    spriteFolder: "/assets/creatures/platinum_dragon/Idle/rotations",
    // Aerial guardian with four seraphic wings — swift dive-striker, lowest DEF of the batch.
    baseStats: { hp: 1075, atk: 238, def: 128, spd: 159 },
    skills: [
      skill("sk-pd-1", "Gallia Fissure", "Claws engulfed in superheated white flames deliver an armor-shattering diving strike.", "Attack", 184, 0),
      skill("sk-pd-2", "Sailing Wing Guard", "Compressed-air wing edges deflect incoming force, raising own DEF and SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-pd-3", "Meteor Lux", "All four wings unleash a rapid-fire barrage of searing light bullets on all enemies.", "Attack", 140, 4, 14),
      skill("sk-pd-4", "Righteous Aerial Guardian", "Passively shields the lowest-HP ally when it drops below 30% HP.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-sirius",
    name: "Sirius",
    element: "Fire",
    rarity: "Mythic",
    categories: ["Volcanic Power", "Power of Space"],
    level: 31,
    exp: 830,
    expToNextLevel: 2050,
    stage: 3,
    spriteKey: "sirius",
    spriteFolder: "/assets/creatures/sirius/Idle/rotations",
    // Star-plasma paladin wielding the twin Sylvia gauntlet-blades — balanced fast striker.
    baseStats: { hp: 1125, atk: 242, def: 144, spd: 151 },
    skills: [
      skill("sk-si-1", "Sylvia Blade Cross", "The dual gauntlet-blades Sylvia cross-slash one enemy in a burst of cosmic plasma.", "Attack", 190, 0),
      skill("sk-si-2", "Starlight Mantle", "The energy mantle flares into wing-like projections, raising own DEF and SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-si-3", "Photon Blaster", "Sylvia shifts to cannon mode, firing a piercing beam of superheated starlight through all enemies.", "Attack", 144, 4, 15),
      skill("sk-si-4", "Guiding Beacon", "Passively raises ATK for the whole team when leading the charge.", "Passive", 0, 0, 19),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-wolfang",
    name: "Wolfang",
    element: "Light",
    rarity: "Mythic",
    categories: ["Power of Light", "Guardian of the Real World", "Holy Knights"],
    level: 29,
    exp: 760,
    expToNextLevel: 1950,
    stage: 3,
    spriteKey: "wolfang",
    spriteFolder: "/assets/creatures/wolfang/Idle/rotations",
    // Regal wolf deity, ringed by a floating halo of ethereal swords — well-rounded all-around fighter.
    baseStats: { hp: 1145, atk: 232, def: 150, spd: 146 },
    skills: [
      skill("sk-wf-1", "Ethereal Blade Halo", "The halo of floating swords lashes out in unison to strike one enemy.", "Attack", 186, 0),
      skill("sk-wf-2", "Regal Ward", "Ceremonial robes billow into a protective stance, raising own DEF sharply for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-wf-3", "Halo Requiem", "Every blade in the halo fires at once, raining ethereal steel on all enemies.", "Attack", 138, 4, 14),
      skill("sk-wf-4", "Sovereign's Composure", "Passively raises DEF and resists status ailments while guarding.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-chronos",
    name: "Chronos",
    element: "Light",
    rarity: "Mythic",
    categories: ["Power of Light", "Power of Time", "Time Travelers", "Guardian of the Digital World"],
    level: 30,
    exp: 790,
    expToNextLevel: 1980,
    stage: 3,
    spriteKey: "chronos",
    spriteFolder: "/assets/creatures/chronos/Idle/rotations",
    // Celestial timekeeper — a clockwork astrolabe core orbits a miniature black hole at its
    // chest, tarot-card feathers fanned into massive wings. Balanced ATK/bulk, leans support.
    baseStats: { hp: 1180, atk: 226, def: 158, spd: 142 },
    skills: [
      skill("sk-cr-1", "Astrolabe Lance", "The orbiting clockwork core fires a focused beam at one enemy.", "Attack", 182, 0),
      skill("sk-cr-2", "Temporal Ward", "Winds back the clock on incoming damage, raising own DEF sharply for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-cr-3", "Event Horizon", "The core's gravity well collapses, dealing heavy damage to all enemies.", "Attack", 136, 4, 15),
      skill("sk-cr-4", "Chronal Shift", "Passively raises SPD and grants a chance to act again.", "Passive", 0, 0, 19),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
  {
    id: "cr-astarion",
    name: "Astarion",
    element: "Electric",
    rarity: "Mythic",
    categories: ["Digital Power", "Power of Space", "Travelers from the Future"],
    level: 29,
    exp: 770,
    expToNextLevel: 1960,
    stage: 3,
    spriteKey: "astarion",
    spriteFolder: "/assets/creatures/astarion/Idle/rotations",
    // Armored wolf beast wreathed in a mantle of cyan spiritual fire, energy plumes venting from
    // its joints — highest ATK lean of the new batch, glass-cannon speedster.
    baseStats: { hp: 1080, atk: 252, def: 128, spd: 162 },
    skills: [
      skill("sk-as-1", "Voltfang Lunge", "A lightning-charged pounce rakes one enemy with claws.", "Attack", 192, 0),
      skill("sk-as-2", "Static Mantle", "The spiritual fire mantle flares, raising own ATK and SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-as-3", "Thunderclap Howl", "A deafening electrified howl shocks all enemies.", "Attack", 140, 4, 14),
      skill("sk-as-4", "Overcurrent Fangs", "Passively boosts ATK further whenever it lands a critical hit.", "Passive", 0, 0, 18),
    ],
    copies: 1,
    superAttackLevel: 1,
    potentialNodes: [],
  },
];

// Creatures that live under assets/creatures/raid_bosses — these are raid-exclusive encounters
// (see lib/raidBosses.ts's getRaidBossCreature, which still reads them out of STARTER_CREATURES
// directly by id) and must never be obtainable through the gacha. Filtered by sprite path rather
// than a hardcoded id list so any future raid_bosses/ addition is excluded automatically.
export const GACHA_CREATURE_POOL: Creature[] = STARTER_CREATURES.filter(
  (c) => !c.spriteFolder?.includes("/raid_bosses/")
);

// The 3 creatures offered during registration. All stage 1, one per starter element.
export const STARTER_CHOICE_IDS = ["cr-emberling", "cr-gale-sprite", "cr-voltling"] as const;
export type StarterChoiceId = (typeof STARTER_CHOICE_IDS)[number];

// The Tamer's first gear set — Tier 1, no Gloves piece. Every piece is crafted in the Shop for 30x
// Blue Chipset (it-chipset-blue), earned from Events > Challenge's Scarlet Inferno trial (Hard:
// 2/win, Super: 10/win — see the raid-crimson-trial-hard/-super RaidBoss entries below). Replaces
// the old dual sourcing (Hat/Shoulders as Campaign-clear rewards, the rest craft-with-Seal-Coins)
// now that Scarlet Inferno gives the whole set one consistent acquisition path.
export const TAMER_EQUIPMENT_CATALOG: TamerEquipment[] = [
  {
    id: "tamer-crimson-hat",
    name: "Crimson Hood",
    slot: "Hat",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_hat.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }] },
    statBonus: { atk: 5, ct: 5 },
  },
  {
    id: "tamer-crimson-shoulders",
    name: "Crimson Shoulders",
    slot: "Shoulders",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_shoulders.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }] },
    statBonus: { def: 10 },
  },
  {
    id: "tamer-crimson-chest",
    name: "Crimson Chestplate",
    slot: "Chest",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_chest.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }] },
    statBonus: { hp: 10 },
  },
  {
    id: "tamer-crimson-legs",
    name: "Crimson Greaves",
    slot: "Legs",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_legs.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }] },
    statBonus: { spd: 3 },
  },
  {
    id: "tamer-crimson-shoes",
    name: "Crimson Boots",
    slot: "Shoes",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_shoes.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }] },
    statBonus: { spd: 3 },
  },

  // Aqua set — crafted in the Shop for 30x Blue Chipset + 30x Purple Chipset each, both earned
  // from the Events > Challenge "Aqua Trial" (see lib/raidBosses.ts's raid-aqua-trial-hard/-super,
  // deliberately tuned harder than Scarlet Inferno's own tiers). A defensive/bulk-leaning kit, in
  // keeping with the tide/depths theme.
  {
    id: "tamer-aqua-hat",
    name: "Aqua Hood",
    slot: "Hat",
    rarity: "SSR",
    setName: "Aqua",
    icon: "/assets/objects/tamer_gear/aqua_hat.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { atk: 12, ct: 8 },
  },
  {
    id: "tamer-aqua-shoulders",
    name: "Aqua Shoulders",
    slot: "Shoulders",
    rarity: "SSR",
    setName: "Aqua",
    icon: "/assets/objects/tamer_gear/aqua_shoulders.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { def: 16 },
  },
  {
    id: "tamer-aqua-chest",
    name: "Aqua Chestplate",
    slot: "Chest",
    rarity: "SSR",
    setName: "Aqua",
    icon: "/assets/objects/tamer_gear/aqua_chest.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { hp: 16 },
  },
  {
    id: "tamer-aqua-gloves",
    name: "Aqua Gloves",
    slot: "Gloves",
    rarity: "SSR",
    setName: "Aqua",
    icon: "/assets/objects/tamer_gear/aqua_gloves.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { hp: 20 },
  },
  {
    id: "tamer-aqua-legs",
    name: "Aqua Greaves",
    slot: "Legs",
    rarity: "SSR",
    setName: "Aqua",
    icon: "/assets/objects/tamer_gear/aqua_legs.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { spd: 5 },
  },
  {
    id: "tamer-aqua-shoes",
    name: "Aqua Boots",
    slot: "Shoes",
    rarity: "SSR",
    setName: "Aqua",
    icon: "/assets/objects/tamer_gear/aqua_shoes.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { spd: 7 },
  },

  // Wind set — homologous to Aqua in every mechanical sense (same 30x Blue + 30x Purple Chipset
  // craft cost, same Hard/Super Challenge tiers, rewards and difficulty — see
  // raid-wind-trial-hard/-super in lib/raidBosses.ts). A speed/crit-leaning kit, in keeping with
  // the gale/whirlwind theme.
  {
    id: "tamer-wind-hat",
    name: "Wind Hood",
    slot: "Hat",
    rarity: "SSR",
    setName: "Wind",
    icon: "/assets/objects/tamer_gear/wind_hat.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { atk: 12, ct: 8 },
  },
  {
    id: "tamer-wind-shoulders",
    name: "Wind Shoulders",
    slot: "Shoulders",
    rarity: "SSR",
    setName: "Wind",
    icon: "/assets/objects/tamer_gear/wind_shoulders.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { def: 16 },
  },
  {
    id: "tamer-wind-chest",
    name: "Wind Chestplate",
    slot: "Chest",
    rarity: "SSR",
    setName: "Wind",
    icon: "/assets/objects/tamer_gear/wind_chest.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { hp: 16 },
  },
  {
    id: "tamer-wind-gloves",
    name: "Wind Gloves",
    slot: "Gloves",
    rarity: "SSR",
    setName: "Wind",
    icon: "/assets/objects/tamer_gear/wind_gloves.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { hp: 20 },
  },
  {
    id: "tamer-wind-legs",
    name: "Wind Greaves",
    slot: "Legs",
    rarity: "SSR",
    setName: "Wind",
    icon: "/assets/objects/tamer_gear/wind_legs.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { spd: 5 },
  },
  {
    id: "tamer-wind-shoes",
    name: "Wind Boots",
    slot: "Shoes",
    rarity: "SSR",
    setName: "Wind",
    icon: "/assets/objects/tamer_gear/wind_shoes.png",
    source: { kind: "craft-item", costs: [{ itemId: "it-chipset-blue", quantity: 30 }, { itemId: "it-chipset-purple", quantity: 30 }] },
    statBonus: { spd: 7 },
  },

  // Thunder set — crafted in the Shop for 30x Blue + 30x Purple + 10x Green Chipset each, all
  // earned from the Events > Challenge "Thunderclap Fury" trial (Super/Super2 only — no Hard tier,
  // both deliberately tuned harder than Scarlet Inferno's AND Aqua's own tiers — see
  // raid-thunder-trial-super/-super2 in lib/raidBosses.ts). An ATK/crit/attack-speed-leaning kit,
  // in keeping with the lightning theme.
  {
    id: "tamer-thunder-hat",
    name: "Thunder Hood",
    slot: "Hat",
    rarity: "SSR",
    setName: "Thunder",
    icon: "/assets/objects/tamer_gear/thunder_hat.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { atk: 15, ct: 12 },
  },
  {
    id: "tamer-thunder-shoulders",
    name: "Thunder Shoulders",
    slot: "Shoulders",
    rarity: "SSR",
    setName: "Thunder",
    icon: "/assets/objects/tamer_gear/thunder_shoulders.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { def: 20 },
  },
  {
    id: "tamer-thunder-chest",
    name: "Thunder Chestplate",
    slot: "Chest",
    rarity: "SSR",
    setName: "Thunder",
    icon: "/assets/objects/tamer_gear/thunder_chest.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { hp: 30 },
  },
  {
    id: "tamer-thunder-gloves",
    name: "Thunder Gloves",
    slot: "Gloves",
    rarity: "SSR",
    setName: "Thunder",
    icon: "/assets/objects/tamer_gear/thunder_gloves.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { scd: 10 },
  },
  {
    id: "tamer-thunder-legs",
    name: "Thunder Greaves",
    slot: "Legs",
    rarity: "SSR",
    setName: "Thunder",
    icon: "/assets/objects/tamer_gear/thunder_legs.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { spd: 9 },
  },
  {
    id: "tamer-thunder-shoes",
    name: "Thunder Boots",
    slot: "Shoes",
    rarity: "SSR",
    setName: "Thunder",
    icon: "/assets/objects/tamer_gear/thunder_shoes.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { spd: 9 },
  },

  // Ice set — homologous to Thunder in every mechanical sense (same 30x Blue + 30x Purple + 10x
  // Green Chipset craft cost, same Super/Super2-only Challenge tiers and rewards — see
  // raid-ice-trial-super/-super2 in lib/raidBosses.ts, deliberately equal difficulty to Thunder's
  // own tiers rather than another escalation). An HP/DEF/DP-leaning tanky kit — "frozen armor" —
  // distinct from Thunder's ATK/crit/speed lean.
  {
    id: "tamer-ice-hat",
    name: "Ice Hood",
    slot: "Hat",
    rarity: "SSR",
    setName: "Ice",
    icon: "/assets/objects/tamer_gear/ice_hat.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { atk: 15, ct: 12 },
  },
  {
    id: "tamer-ice-shoulders",
    name: "Ice Shoulders",
    slot: "Shoulders",
    rarity: "SSR",
    setName: "Ice",
    icon: "/assets/objects/tamer_gear/ice_shoulders.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { def: 20 },
  },
  {
    id: "tamer-ice-chest",
    name: "Ice Chestplate",
    slot: "Chest",
    rarity: "SSR",
    setName: "Ice",
    icon: "/assets/objects/tamer_gear/ice_chest.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { hp: 30 },
  },
  {
    id: "tamer-ice-gloves",
    name: "Ice Gloves",
    slot: "Gloves",
    rarity: "SSR",
    setName: "Ice",
    icon: "/assets/objects/tamer_gear/ice_gloves.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { scd: 10 },
  },
  {
    id: "tamer-ice-legs",
    name: "Ice Greaves",
    slot: "Legs",
    rarity: "SSR",
    setName: "Ice",
    icon: "/assets/objects/tamer_gear/ice_legs.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { spd: 9 },
  },
  {
    id: "tamer-ice-shoes",
    name: "Ice Boots",
    slot: "Shoes",
    rarity: "SSR",
    setName: "Ice",
    icon: "/assets/objects/tamer_gear/ice_shoes.png",
    source: {
      kind: "craft-item",
      costs: [
        { itemId: "it-chipset-blue", quantity: 30 },
        { itemId: "it-chipset-purple", quantity: 30 },
        { itemId: "it-chipset-green", quantity: 10 },
      ],
    },
    statBonus: { spd: 9 },
  },
];

// A single bonus that fires only when a player has EVERY piece of one set (per the grouping
// above) simultaneously EQUIPPED at once — not just owned. Exactly 1 effect per set, never
// stacking multiple; a set absent from this map (Crimson) has no Set Effect at all. Aqua's Crit
// Rate folds into the existing percent-stat pipeline in lib/tamerBuffs.ts alongside per-piece
// statBonus; Wind's EXP bonus and Thunder/Ice's Skill Damage bonus are separate mechanics with no
// existing stat field — see getTamerExpMultiplierBonus (lib/tamerBuffs.ts) and
// Creature.skillDamageMult (types/game.ts) respectively.
export const TAMER_SET_EFFECTS: Record<string, TamerSetEffect | undefined> = {
  Aqua: { description: "Crit Rate +30%", statBonus: { ct: 30 } },
  Wind: { description: "EXP +100%", expMultiplierBonus: 1 },
  Thunder: { description: "ATK +30% / Skill Damage +20%", statBonus: { atk: 30 }, skillDamageBonus: 0.2 },
  Ice: { description: "ATK +30% / Skill Damage +20%", statBonus: { atk: 30 }, skillDamageBonus: 0.2 },
};

// The player's own on-screen avatar (distinct from Creatures) — owning/equipping one applies its
// buffs to every Creature in battle (lib/tamerBuffs.ts). tamer1 is the free default every account
// starts with; future purchasable Tamers slot into this same catalog (see SHOP_LISTINGS).
export const TAMER_CATALOG: TamerAvatar[] = [
  {
    id: "tamer1",
    name: "Novice Tamer",
    spriteFolder: "/assets/tamers/tamer1/idle",
    baseStats: { hp: 400, atk: 80, def: 50, spd: 40, dp: 200, as: 100, ht: 80, cd: 120, scd: 110, ct: 5 },
    buffs: { hpPercent: 15, elementAtkBonus: { Light: 10 }, ctPercent: 5, cdPercent: 10 },
  },
];

// Selectable profile pictures (Sidebar/TopStatusBar avatar + the Profile modal's picker). Every
// account is created with avatarKey "avatar-male"/"avatar-female" (see createAccount() in
// lib/db/bigquery.ts) — neither has art here on purpose, so a fresh account falls back to the
// generic UserCircle2 icon until the player actually picks one of these from the Profile modal.
export interface AvatarOption {
  key: string;
  name: string;
  icon: string;
}
export const AVATAR_CATALOG: AvatarOption[] = [
  { key: "avatar-profile1", name: "Star Paladin", icon: "/assets/profile_img/profile1.png" },
  { key: "avatar-profile2", name: "Ember Fox", icon: "/assets/profile_img/profile2.png" },
  { key: "avatar-profile3", name: "Jade Hatchling", icon: "/assets/profile_img/profile3.png" },
  { key: "avatar-profile4", name: "Void Knight", icon: "/assets/profile_img/profile4.png" },
  { key: "avatar-profile5", name: "Crimson Dragoon", icon: "/assets/profile_img/profile5.png" },
  { key: "avatar-profile6", name: "Solar King", icon: "/assets/profile_img/profile6.png" },
];

// Matches the real DB default createAccount() inserts (lib/db/bigquery.ts) — kept in sync so the
// pre-hydrate flash and the real server value agree once Tamer leveling is actually visible.
export const DEFAULT_PROFILE: UserProfile = {
  id: "player-1",
  name: "Summoner",
  title: "Novice Tamer",
  level: 1,
  exp: 0,
  expToNextLevel: 100,
  avatarKey: "avatar-default",
  isAdmin: false,
  dailyEventAttempts: {},
  dailyEventAttemptsDate: "",
  dailyChallengeAttempts: {},
  dailyChallengeAttemptsDate: "",
};

// Generic collectible items — Consumable/Quest/Evolution/Skin/Crafting.
export const ITEM_CATALOG: InventoryItem[] = [
  {
    id: "it-rotten-egg",
    name: "Rotten Egg",
    category: "Crafting",
    rarity: "Common",
    description: "Not fit to eat, but the Shop will still pay gold for it.",
    icon: "/assets/objects/rotten_egg.png",
    sellPriceGold: 80,
  },
  {
    id: "it-chicken",
    name: "Chicken",
    category: "Consumable",
    rarity: "Common",
    description: "A hearty meal that restores some of the Tamer's energy.",
    icon: "/assets/objects/chicken.png",
    energyRestore: 30,
  },
  {
    id: "it-training-box",
    name: "Training Box",
    category: "Consumable",
    rarity: "Common",
    description: "Basic training gear — a small dose of EXP for one Creature.",
    icon: "/assets/objects/box_exp1.png",
    creatureExpValue: 200,
  },
  {
    id: "it-training-trx",
    name: "Training TRX",
    category: "Consumable",
    rarity: "Rare",
    description: "Resistance bands for a solid training session — a medium dose of EXP.",
    icon: "/assets/objects/trx_exp2.png",
    creatureExpValue: 600,
  },
  {
    id: "it-training-dumbbell",
    name: "Training Dumbbells",
    category: "Consumable",
    rarity: "SSR",
    description: "Serious training gear — the biggest single dose of EXP for one Creature.",
    icon: "/assets/objects/mancuerna_exp3.png",
    creatureExpValue: 1500,
  },
  { id: "it-frontier-emblem", name: "Frontier Reaches Emblem", category: "Quest", rarity: "SSR", description: "Proof of clearing World 1's toughest guardian." },
  { id: "it-sealed-key", name: "Sealed Ruins Key", category: "Quest", rarity: "Rare", description: "An old key that hums faintly. It must open something." },
  { id: "it-ember-shard", name: "Ember Shard", category: "Evolution", rarity: "Rare", description: "A crystallized fragment of pure Fire-aligned energy." },
  { id: "it-aqua-core", name: "Aqua Core", category: "Evolution", rarity: "Rare", description: "A crystallized fragment of pure Water-aligned energy." },
  { id: "it-verdant-seed", name: "Verdant Seed", category: "Evolution", rarity: "Rare", description: "A crystallized fragment of pure Nature-aligned energy." },
  { id: "it-storm-crystal", name: "Storm Crystal", category: "Evolution", rarity: "Rare", description: "A crystallized fragment of pure Electric-aligned energy." },
  { id: "it-skin-crimson-emberling", name: "Crimson Emberling Skin", category: "Skin", rarity: "Mythic", description: "An alternate look for Emberling, wreathed in deeper crimson flame." },
  { id: "it-legendary-ticket", name: "Legendary Ticket", category: "Consumable", rarity: "SSR", description: "A rare ticket used for Legendary Summons. Can summon up to Mythic rarity.", icon: "/assets/items/legendary_ticket.png" },
  { id: "it-mythic-ticket", name: "Mythic Ticket", category: "Consumable", rarity: "Mythic", description: "An ultra rare ticket used for LR Summons. Can summon up to LR rarity.", icon: "/assets/items/mythic_ticket.png" },
  { id: "it-awaken-coin", name: "Awaken Coin", category: "Consumable", rarity: "Mythic", description: "Used to Awaken an owned SSR creature into its Mythic form.", icon: "/assets/objects/awaken_coin.png" },
  { id: "it-exchange-coin", name: "Exchange Coin", category: "Consumable", rarity: "SSR", description: "Redeem for a specific creature in the Shop's Creature Exchange.", icon: "/assets/objects/exchange_creature_coin.png" },

  // Potential Orbs
  { id: "it-orb-small-fire", name: "Small Red Orb", category: "Evolution", rarity: "Common", description: "Used to unlock basic Red potential.", icon: "/assets/objects/orbs/red_orb.png" },
  { id: "it-orb-medium-fire", name: "Medium Red Orb", category: "Evolution", rarity: "Rare", description: "Used to unlock intermediate Red potential.", icon: "/assets/objects/orbs/red_medium_orb.png" },
  { id: "it-orb-large-fire", name: "Large Red Orb", category: "Evolution", rarity: "SSR", description: "Used to unlock advanced Red potential.", icon: "/assets/objects/orbs/red_large_orb.png" },
  { id: "it-orb-small-water", name: "Small Blue Orb", category: "Evolution", rarity: "Common", description: "Used to unlock basic Blue potential.", icon: "/assets/objects/orbs/blue_orb.png" },
  { id: "it-orb-medium-water", name: "Medium Blue Orb", category: "Evolution", rarity: "Rare", description: "Used to unlock intermediate Blue potential.", icon: "/assets/objects/orbs/blue_medium_orb.png" },
  { id: "it-orb-large-water", name: "Large Blue Orb", category: "Evolution", rarity: "SSR", description: "Used to unlock advanced Blue potential.", icon: "/assets/objects/orbs/blue_large_orb.png" },
  { id: "it-orb-small-nature", name: "Small Green Orb", category: "Evolution", rarity: "Common", description: "Used to unlock basic Green potential.", icon: "/assets/objects/orbs/green_orb.png" },
  { id: "it-orb-medium-nature", name: "Medium Green Orb", category: "Evolution", rarity: "Rare", description: "Used to unlock intermediate Green potential.", icon: "/assets/objects/orbs/green_medium_orb.png" },
  { id: "it-orb-large-nature", name: "Large Green Orb", category: "Evolution", rarity: "SSR", description: "Used to unlock advanced Green potential.", icon: "/assets/objects/orbs/green_large_orb.png" },
  { id: "it-orb-small-light", name: "Small Yellow Orb", category: "Evolution", rarity: "Common", description: "Used to unlock basic Yellow potential.", icon: "/assets/objects/orbs/yellow_orb.png" },
  { id: "it-orb-medium-light", name: "Medium Yellow Orb", category: "Evolution", rarity: "Rare", description: "Used to unlock intermediate Yellow potential.", icon: "/assets/objects/orbs/yellow_medium_orb.png" },
  { id: "it-orb-large-light", name: "Large Yellow Orb", category: "Evolution", rarity: "SSR", description: "Used to unlock advanced Yellow potential.", icon: "/assets/objects/orbs/yellow_large_orb.png" },
  { id: "it-orb-small-dark", name: "Small Purple Orb", category: "Evolution", rarity: "Common", description: "Used to unlock basic Purple potential.", icon: "/assets/objects/orbs/purple_orb.png" },
  { id: "it-orb-medium-dark", name: "Medium Purple Orb", category: "Evolution", rarity: "Rare", description: "Used to unlock intermediate Purple potential.", icon: "/assets/objects/orbs/purple_medium_orb.png" },
  { id: "it-orb-large-dark", name: "Large Purple Orb", category: "Evolution", rarity: "SSR", description: "Used to unlock advanced Purple potential.", icon: "/assets/objects/orbs/purple_large_orb.png" },
  { id: "it-orb-small-electric", name: "Small Cyan Orb", category: "Evolution", rarity: "Common", description: "Used to unlock basic Cyan potential.", icon: "/assets/objects/orbs/cyan_orb.png" },
  { id: "it-orb-medium-electric", name: "Medium Cyan Orb", category: "Evolution", rarity: "Rare", description: "Used to unlock intermediate Cyan potential.", icon: "/assets/objects/orbs/cyan_medium_orb.png" },
  { id: "it-orb-large-electric", name: "Large Cyan Orb", category: "Evolution", rarity: "SSR", description: "Used to unlock advanced Cyan potential.", icon: "/assets/objects/orbs/cyan_large_orb.png" },
  { id: "it-orb-small-neutral", name: "Small Gray Orb", category: "Evolution", rarity: "Common", description: "Used to unlock basic Gray potential.", icon: "/assets/objects/orbs/gray_orb.png" },
  { id: "it-orb-medium-neutral", name: "Medium Gray Orb", category: "Evolution", rarity: "Rare", description: "Used to unlock intermediate Gray potential.", icon: "/assets/objects/orbs/gray_medium_orb.png" },
  { id: "it-orb-large-neutral", name: "Large Gray Orb", category: "Evolution", rarity: "SSR", description: "Used to unlock advanced Gray potential.", icon: "/assets/objects/orbs/gray_large_orb.png" },

  // Tier chipsets — crafting currency for Tamer armor sets, dropped by their matching Events >
  // Challenge trial (Blue: Crimson/Scarlet Inferno; the other 3 tiers aren't live yet, see
  // CHALLENGE_EVENTS in lib/raidBosses.ts). Spent via TAMER_EQUIPMENT_CATALOG's "craft-item" source.
  { id: "it-chipset-blue", name: "Blue Chipset", category: "Crafting", rarity: "SSR", description: "Tier 1 crafting currency — forges pieces of the Crimson armor set.", icon: "/assets/objects/chipsets/blue_chipset.png" },
  { id: "it-chipset-golden", name: "Golden Chipset", category: "Crafting", rarity: "SSR", description: "Tier crafting currency for a future armor set.", icon: "/assets/objects/chipsets/golden_chipset.png" },
  { id: "it-chipset-green", name: "Green Chipset", category: "Crafting", rarity: "SSR", description: "Tier crafting currency for a future armor set.", icon: "/assets/objects/chipsets/green_chipset.png" },
  { id: "it-chipset-purple", name: "Purple Chipset", category: "Crafting", rarity: "SSR", description: "Tier crafting currency for a future armor set.", icon: "/assets/objects/chipsets/purple_chipset.png" },
];

// --- Awaken (it-awaken-coin) ---
// Only SSR->Mythic exists today — Mythic->LR is a real future step (some Mythics will eventually
// awaken into a specific LR) but there's no target/mapping data for that yet, so applyAwakenBump
// below is intentionally a no-op past SSR rather than guessing at it.
export const AWAKEN_COST = 140;
// Tuned against the existing hand-authored Mythic roster (lib/gameData.ts's "Mythic tier" block)
// so a freshly-awakened SSR lands comfortably inside that band regardless of which SSR it was,
// same "clearly beats the tier below" rule that block's own comments already establish.
export const AWAKEN_STAT_MULTIPLIER = { hp: 1.8, atk: 1.45, def: 1.6, spd: 1.15 };

/** Applies the Awaken rarity+stat bump on top of a creature's *template* rarity/baseStats — used
 * both by the awakenCreature store action (fresh spend) and by both rehydrate paths in
 * lib/store.ts (reapplying a previously-spent Awaken on top of the pristine template every time a
 * creature is rebuilt from STARTER_CREATURES, since rarity/baseStats themselves are never what's
 * persisted — see lib/store.ts's Creature.awakenLevel comment). */
export function applyAwakenBump(rarity: Rarity, baseStats: CreatureStats): { rarity: Rarity; baseStats: CreatureStats } {
  if (rarity !== "SSR") return { rarity, baseStats };
  return {
    rarity: "Mythic",
    baseStats: {
      ...baseStats,
      hp: Math.round(baseStats.hp * AWAKEN_STAT_MULTIPLIER.hp),
      atk: Math.round(baseStats.atk * AWAKEN_STAT_MULTIPLIER.atk),
      def: Math.round(baseStats.def * AWAKEN_STAT_MULTIPLIER.def),
      spd: Math.round(baseStats.spd * AWAKEN_STAT_MULTIPLIER.spd),
    },
  };
}

// --- Creature Exchange (it-exchange-coin) ---
export const EXCHANGE_COST = 150;
export const EXCHANGE_CREATURE_IDS = [
  "cr-emperortoise",
  "cr-goldak",
  "cr-firefex",
  "cr-blazefire",
  "cr-blitzfire",
  "cr-jeshunter",
  "cr-mugen",
  "cr-wolfang",
  "cr-murasame",
];

// Weighted 60/30/10 draw across the three training-item tiers — shared by Campaign's stage-clear
// drop roll (BattleScreen.tsx) and the "Expedition" tier's guaranteed reward below.
export function pickWeightedTrainingItemId(): string {
  const roll = Math.random() * 100;
  if (roll < 60) return "it-training-box";
  if (roll < 90) return "it-training-trx";
  return "it-training-dumbbell";
}

export interface ExpeditionDef {
  id: string;
  name: string;
  durationMs: number;
  baseSuccessRate: number; // 0-100
  requiredPower: number;
  rewardGoldMin: number;
  rewardGoldMax: number;
  /** Independent chance (0-100) at one of these items on success. */
  rewardItemChances: { itemId: string; chance: number }[];
  /** Independent chance (0-100) at +1 Seal Coin on success — a currency, not an ITEM_CATALOG entry. */
  rewardSealCoinChance?: number;
  guaranteedTrainingItem?: boolean;
}

export const EXPEDITION_DEFS: ExpeditionDef[] = [
  {
    id: "exp-scout-run",
    name: "Scout Run",
    durationMs: 30 * 60 * 1000,
    baseSuccessRate: 85,
    requiredPower: 500,
    rewardGoldMin: 300,
    rewardGoldMax: 600,
    rewardItemChances: [{ itemId: "it-rotten-egg", chance: 30 }],
  },
  {
    id: "exp-patrol",
    name: "Patrol",
    durationMs: 2 * 60 * 60 * 1000,
    baseSuccessRate: 70,
    requiredPower: 1500,
    rewardGoldMin: 1200,
    rewardGoldMax: 2000,
    rewardItemChances: [{ itemId: "it-chicken", chance: 40 }],
    rewardSealCoinChance: 15,
  },
  {
    id: "exp-expedition",
    name: "Expedition",
    durationMs: 6 * 60 * 60 * 1000,
    baseSuccessRate: 55,
    requiredPower: 4000,
    rewardGoldMin: 4000,
    rewardGoldMax: 7000,
    rewardItemChances: [{ itemId: "it-frontier-emblem", chance: 10 }],
    guaranteedTrainingItem: true,
  },
];

export interface ShopListing {
  id: string;
  description: string;
  rarity: Rarity;
  price: { gold?: number; gems?: number };
  grants:
    | { kind: "item"; itemId: string; amount?: number }
    | { kind: "creature"; creatureId: string }
    | { kind: "tamer"; tamerId: string };
  /** Max total quantity purchasable per calendar day — resets at local midnight, same mechanism
   * as profile.dailyEventAttempts (see ensureFreshShopPurchases in lib/store.ts). Undefined means
   * unlimited, same as every listing before this field existed. */
  dailyLimit?: number;
  /** Same idea as dailyLimit, but resets weekly (local Monday) instead — see
   * ensureFreshWeeklyShopPurchases in lib/store.ts. A listing uses one or the other, never both. */
  weeklyLimit?: number;
}

// No standalone icon field — the Shop page resolves art at render time from whatever the listing
// grants (ITEM_CATALOG's icon/CATEGORY_ICON for items, the creature's own sprite for creatures,
// the Tamer's own sprite for avatars), so nothing here can drift out of sync with the real catalog.
export const SHOP_LISTINGS: ShopListing[] = [
  {
    id: "shop-chicken",
    description: "Restores 30 Tamer energy.",
    rarity: "Common",
    price: { gold: 150 },
    grants: { kind: "item", itemId: "it-chicken" },
    dailyLimit: 6,
  },
  {
    id: "shop-training-box",
    description: "Grants 200 EXP to one Creature.",
    rarity: "Common",
    price: { gold: 300 },
    grants: { kind: "item", itemId: "it-training-box" },
    dailyLimit: 10,
  },
  {
    id: "shop-training-trx",
    description: "Grants 600 EXP to one Creature.",
    rarity: "Rare",
    price: { gold: 900 },
    grants: { kind: "item", itemId: "it-training-trx" },
    dailyLimit: 10,
  },
  {
    id: "shop-training-dumbbell",
    description: "Grants 1500 EXP to one Creature.",
    rarity: "SSR",
    price: { gold: 2200 },
    grants: { kind: "item", itemId: "it-training-dumbbell" },
    dailyLimit: 10,
  },
  {
    id: "shop-skin-crimson-emberling",
    description: "An alternate look for Emberling.",
    rarity: "Mythic",
    price: { gems: 500 },
    grants: { kind: "item", itemId: "it-skin-crimson-emberling" },
  },
  {
    id: "shop-creature-venomshade",
    description: "A Dark-type Creature, available directly for gems.",
    rarity: "Rare",
    price: { gems: 300 },
    grants: { kind: "creature", creatureId: "cr-venomshade" },
  },
  {
    id: "shop-creature-tidewarden",
    description: "A Water-type Creature, available directly for gems.",
    rarity: "Rare",
    price: { gems: 300 },
    grants: { kind: "creature", creatureId: "cr-tidewarden" },
  },
  { id: "shop-orb-s-fire", description: "50x Small Red Orbs", rarity: "Common", price: { gold: 1000 }, grants: { kind: "item", itemId: "it-orb-small-fire", amount: 50 }, weeklyLimit: 10 },
  { id: "shop-orb-m-fire", description: "20x Medium Red Orbs", rarity: "Rare", price: { gold: 1500 }, grants: { kind: "item", itemId: "it-orb-medium-fire", amount: 20 }, weeklyLimit: 10 },
  { id: "shop-orb-l-fire", description: "5x Large Red Orbs", rarity: "SSR", price: { gold: 2000 }, grants: { kind: "item", itemId: "it-orb-large-fire", amount: 5 }, weeklyLimit: 10 },
  { id: "shop-orb-s-water", description: "50x Small Blue Orbs", rarity: "Common", price: { gold: 1000 }, grants: { kind: "item", itemId: "it-orb-small-water", amount: 50 }, weeklyLimit: 10 },
  { id: "shop-orb-m-water", description: "20x Medium Blue Orbs", rarity: "Rare", price: { gold: 1500 }, grants: { kind: "item", itemId: "it-orb-medium-water", amount: 20 }, weeklyLimit: 10 },
  { id: "shop-orb-l-water", description: "5x Large Blue Orbs", rarity: "SSR", price: { gold: 2000 }, grants: { kind: "item", itemId: "it-orb-large-water", amount: 5 }, weeklyLimit: 10 },
  { id: "shop-orb-s-nature", description: "50x Small Green Orbs", rarity: "Common", price: { gold: 1000 }, grants: { kind: "item", itemId: "it-orb-small-nature", amount: 50 }, weeklyLimit: 10 },
  { id: "shop-orb-m-nature", description: "20x Medium Green Orbs", rarity: "Rare", price: { gold: 1500 }, grants: { kind: "item", itemId: "it-orb-medium-nature", amount: 20 }, weeklyLimit: 10 },
  { id: "shop-orb-l-nature", description: "5x Large Green Orbs", rarity: "SSR", price: { gold: 2000 }, grants: { kind: "item", itemId: "it-orb-large-nature", amount: 5 }, weeklyLimit: 10 },
  { id: "shop-orb-s-light", description: "50x Small Yellow Orbs", rarity: "Common", price: { gold: 1000 }, grants: { kind: "item", itemId: "it-orb-small-light", amount: 50 }, weeklyLimit: 10 },
  { id: "shop-orb-m-light", description: "20x Medium Yellow Orbs", rarity: "Rare", price: { gold: 1500 }, grants: { kind: "item", itemId: "it-orb-medium-light", amount: 20 }, weeklyLimit: 10 },
  { id: "shop-orb-l-light", description: "5x Large Yellow Orbs", rarity: "SSR", price: { gold: 2000 }, grants: { kind: "item", itemId: "it-orb-large-light", amount: 5 }, weeklyLimit: 10 },
  { id: "shop-orb-s-dark", description: "50x Small Purple Orbs", rarity: "Common", price: { gold: 1000 }, grants: { kind: "item", itemId: "it-orb-small-dark", amount: 50 }, weeklyLimit: 10 },
  { id: "shop-orb-m-dark", description: "20x Medium Purple Orbs", rarity: "Rare", price: { gold: 1500 }, grants: { kind: "item", itemId: "it-orb-medium-dark", amount: 20 }, weeklyLimit: 10 },
  { id: "shop-orb-l-dark", description: "5x Large Purple Orbs", rarity: "SSR", price: { gold: 2000 }, grants: { kind: "item", itemId: "it-orb-large-dark", amount: 5 }, weeklyLimit: 10 },
  { id: "shop-orb-s-electric", description: "50x Small Cyan Orbs", rarity: "Common", price: { gold: 1000 }, grants: { kind: "item", itemId: "it-orb-small-electric", amount: 50 }, weeklyLimit: 10 },
  { id: "shop-orb-m-electric", description: "20x Medium Cyan Orbs", rarity: "Rare", price: { gold: 1500 }, grants: { kind: "item", itemId: "it-orb-medium-electric", amount: 20 }, weeklyLimit: 10 },
  { id: "shop-orb-l-electric", description: "5x Large Cyan Orbs", rarity: "SSR", price: { gold: 2000 }, grants: { kind: "item", itemId: "it-orb-large-electric", amount: 5 }, weeklyLimit: 10 },
  { id: "shop-orb-s-neutral", description: "50x Small Gray Orbs", rarity: "Common", price: { gold: 1000 }, grants: { kind: "item", itemId: "it-orb-small-neutral", amount: 50 }, weeklyLimit: 10 },
  { id: "shop-orb-m-neutral", description: "20x Medium Gray Orbs", rarity: "Rare", price: { gold: 1500 }, grants: { kind: "item", itemId: "it-orb-medium-neutral", amount: 20 }, weeklyLimit: 10 },
  { id: "shop-orb-l-neutral", description: "5x Large Gray Orbs", rarity: "SSR", price: { gold: 2000 }, grants: { kind: "item", itemId: "it-orb-large-neutral", amount: 5 }, weeklyLimit: 10 },
];

/** Real-money-only Premium Shop listing — deliberately NOT a ShopListing (no gold/gems price, no
 * `grants`) since there's nothing to purchase yet: every entry here renders with a disabled
 * "Coming Soon" button in the Shop's Premium tab, ahead of real payment integration. */
export interface PremiumShopItem {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// Five Lacrima bundle sizes, smallest to largest — the game's future premium gem currency.
export const PREMIUM_SHOP_ITEMS: PremiumShopItem[] = [
  { id: "premium-lacrima", name: "Lacrima", description: "A single shimmering Lacrima.", icon: "/assets/objects/lacrima.png" },
  { id: "premium-lacrima-pack01", name: "Lacrima Pack", description: "A small pack of Lacrima.", icon: "/assets/objects/lacrima_pack01.png" },
  { id: "premium-lacrima-pack02", name: "Lacrima Bundle", description: "A larger bundle of Lacrima.", icon: "/assets/objects/lacrima_pack02.png" },
  { id: "premium-lacrima-bag", name: "Lacrima Bag", description: "A bag brimming with Lacrima.", icon: "/assets/objects/lacrima_bag.png" },
  { id: "premium-lacrima-box", name: "Lacrima Box", description: "A box overflowing with Lacrima.", icon: "/assets/objects/lacrima_box.png" },
];

// task-login ships pre-completed (progress = target) — reaching this fresh-day clone at all (see
// lib/store.ts's ensureFreshDailyTasks/bundleToStateFields) already implies a same-day login, so
// there's no separate "did they log in" check to wire up. The other three now track real progress
// (see the tickMissionProgress call sites in BattleScreen.tsx, gacha/page.tsx, shop/page.tsx) and
// correctly start at 0 — they used to ship fake-pre-completed too, before any backend existed.
// task-enhance kept its id (was "Enhance a piece of gear", from the now-removed Creature Equipment
// system) to avoid a pointless persisted-task-id migration — only its description/trigger changed.
export const DEFAULT_DAILY_TASKS: DailyTask[] = [
  { id: "task-login", description: "Log in to the city hub", progress: 1, target: 1, rewardGold: 500, claimed: false },
  { id: "task-dungeon", description: "Clear 3 dungeon waves", progress: 0, target: 3, rewardGems: 30, claimed: false },
  { id: "task-gacha", description: "Perform 1 summon", progress: 0, target: 1, rewardGold: 1000, claimed: false },
  { id: "task-enhance", description: "Craft a piece of Tamer gear", progress: 0, target: 1, rewardGems: 20, claimed: false },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "ach-crimson-conqueror",
    name: "Crimson Conqueror",
    description: "Defeat the Crimson Paladin raid boss on Super3 difficulty.",
  },
  {
    id: "ach-early-access-2026",
    name: "Early Access 2026",
    description: "Joined the Digital World during 2026, before the gates opened to everyone.",
  },
  {
    id: "ach-explorer-digital-world",
    name: "Explorer of the Digital World",
    description: "Clear every stage through World 5 in Campaign.",
  },
  {
    id: "ach-survivor-class",
    name: "Survivor Class",
    description: "Clear the first stage of Survival mode.",
  },
];

export const GACHA_BANNERS: GachaBanner[] = [
  {
    id: "banner-legendary",
    name: "Legendary Carnival",
    tagline: "Summon the greatest champions.",
    type: "Creature",
    bannerImage: "/assets/banners/first_mythic_banner.png",
    featuredIds: ["cr-blazefire", "cr-wolfang", "cr-astarion", "cr-chronos", "cr-emperortoise"],
    singlePullCost: 1,
    multiPullCost: 10,
    multiPullCount: 10,
    currencyType: "item",
    currencyItemId: "it-mythic-ticket",
  },
  {
    id: "banner-lr-omega",
    name: "Omega Awakening",
    tagline: "The absolute pinnacle of power.",
    type: "Creature",
    bannerImage: "/assets/banners/omega_banner_legendary.png",
    featuredIds: ["cr-omega"],
    singlePullCost: 1,
    multiPullCost: 10,
    multiPullCount: 10,
    currencyType: "item",
    currencyItemId: "it-legendary-ticket",
  },
  {
    id: "banner-lr-abaddo",
    name: "Abyssal Void",
    tagline: "Embrace the inevitable entropy.",
    type: "Creature",
    bannerImage: "/assets/banners/banner_abaddo_legendary.png",
    featuredIds: ["cr-abaddo"],
    singlePullCost: 1,
    multiPullCost: 10,
    multiPullCount: 10,
    currencyType: "item",
    currencyItemId: "it-legendary-ticket",
  },
];

export const PVP_LEADERBOARD: PvpOpponent[] = [
  { id: "pvp-1", name: "Kael the Ashen", tier: "Grandmaster", rank: 1, power: 18420, defenseTeamCreatureIds: ["cr-tidalfin", "cr-emberling", "cr-gale-sprite"] },
  { id: "pvp-2", name: "Lyra Nightshade", tier: "Diamond", rank: 2, power: 16210, defenseTeamCreatureIds: ["cr-tidalfin", "cr-emberling"] },
  { id: "pvp-3", name: "Doran Ironfist", tier: "Platinum", rank: 3, power: 14980, defenseTeamCreatureIds: ["cr-emberling", "cr-gale-sprite"] },
  { id: "pvp-4", name: "Mira Frostwing", tier: "Gold", rank: 4, power: 12340, defenseTeamCreatureIds: ["cr-gale-sprite"] },
  { id: "pvp-5", name: "Bram Stonehide", tier: "Silver", rank: 5, power: 9870, defenseTeamCreatureIds: ["cr-emberling"] },
];

const STAGE_NAMES = [
  // Chapter 1 (15 areas) — see lib/campaignChapters.ts's CAMPAIGN_CHAPTERS, which must stay in
  // sync with this list (same names, same order). Area 15 is the chapter's boss.
  "The Beginning", "An Unsettling Feeling", "Spacetime Distortion", "An Uncertain Future",
  "The Prophecy", "An Unexpected Turn", "Our World", "Bonds of Friendship",
  "True Strength", "Awakening", "A Dangerous Enemy Approaches", "Together, We'll Save Our World",
  "The Power Within", "Mystery of the Digital Network", "The Royal Knights",

  // Chapter 2 (15 areas) — see lib/campaignChapters.ts's CAMPAIGN_CHAPTERS, must stay in sync
  // (same names, same order). Area 30 (this chapter's 15th) is the chapter's boss.
  "The Parallel World", "Two Worlds, One Balance", "The Resonance Within", "Chosen by Resonance",
  "Beyond Their Limits", "A Consciousness Awakens", "The Unknown Entity", "Signs of Another World",
  "A World That Shouldn't Exist", "The First Replica", "Echoes of Reality", "Worlds Out of Sync",
  "The Collision Begins", "Reality in Danger", "Protect the Original World",

  // Chapter 3 (20 areas) — see lib/campaignChapters.ts's CAMPAIGN_CHAPTERS, which must stay in
  // sync with this list (same names, same order). Area 20 (this chapter's 20th) is the chapter's
  // boss: the parallel-world collision from Chapter 2 left the Digital World scarred, and a
  // shadow entity (Habakiri) has been growing in the cracks ever since.
  "The Lingering Static", "Cracks in Reality", "A World Half-Formed", "Corrupted Frontier",
  "Whispers From the Rift", "The Fractured Plains", "Data Gone Wild", "Where Two Skies Meet",
  "The Wandering Anomaly", "Echoes That Shouldn't Be", "A Shadow Takes Root", "The Hollow Frontier",
  "Static Overload", "Beneath the Broken Sky", "Fracture Point", "A World Unraveling",
  "Where Shadows Gather", "The Silence Before", "Descent Into Darkness", "The Devourer Awakens",

  // Chapter 4 (15 areas) — see lib/campaignChapters.ts's CAMPAIGN_CHAPTERS, must stay in sync
  // (same names, same order). Area 15 (this chapter's 15th) is the chapter's boss: with the
  // shadow in Chapter 3 put down, a splinter faction of Royal Knights — the same order Chapter 1
  // first glimpsed — moves in, and their corrupted vanguard Magnagold makes its stand here.
  "A Knight's Warning", "Banners of Gold", "The Silent Garrison", "Steel Against Shadow",
  "Trial by Fire and Faith", "The Iron Oath", "Beyond Their Duty", "A Guardian's Doubt",
  "The Fallen Vanguard", "Cracks in the Armor", "The Gathering Storm", "Where Loyalty Ends",
  "The Last Bastion", "A Knight's Reckoning", "The Golden Guardian's Wrath",

  // World 5 (14 stages)
  "Astral Pathway", "Nebula Cloud", "Comet Trail", "Starlight Bridge",
  "Galaxy Center", "Black Hole Event", "Cosmic Forge", "Chronos Rift",
  "Time Stream", "Quantum Realm", "Dimension Door", "Nexus Point",
  "The Final Stand", "Ether Core"
];

const HIGHEST_STAGE_CLEARED = 0;

// Stage 1-2 are most players' very first wins — the normal formula's 120/160 EXP barely dents a
// starter creature's next-level bar (they typically need ~260-270 more), so a win there wouldn't
// visibly reward the player with a level-up. Bumped well above that gap for stages 1-2 only.
const EARLY_STAGE_REWARD_EXP: Record<number, number> = { 1: 300, 2: 220 };

const WORLD_SIZES = [15, 15, 20, 15, 14];

/** Cumulative stage count through the end of `world` (1-indexed) — e.g. 5 -> 54, since worlds
 * 1-5 are sized [8,8,12,12,14]. Used to check "has this player cleared through World N" against
 * dungeon.highestStageCleared, without scattering the raw WORLD_SIZES math (or a magic stage
 * number) at each call site. */
export function cumulativeStageCountThroughWorld(world: number): number {
  return WORLD_SIZES.slice(0, world).reduce((sum, size) => sum + size, 0);
}

// Highest rarity first — the default sort for every screen that lists a player's creatures
// (team select, formations, monsters, sell, etc.), so the rarest/most-relevant ones surface
// without the player having to hunt for them.
export const RARITY_SORT_ORDER: Record<Rarity, number> = {
  LR: 0,
  Mythic: 1,
  SSR: 2,
  Rare: 3,
  Common: 4,
};

/** Sorts creatures highest-rarity-first; ties broken by level (higher first) then name. */
export function sortCreaturesByRarity<T extends { rarity: Rarity; level: number; name: string }>(
  creatures: T[],
): T[] {
  return [...creatures].sort((a, b) => {
    const rarityDiff = RARITY_SORT_ORDER[a.rarity] - RARITY_SORT_ORDER[b.rarity];
    if (rarityDiff !== 0) return rarityDiff;
    if (b.level !== a.level) return b.level - a.level;
    return a.name.localeCompare(b.name);
  });
}

/** Same palette SummonRevealModal uses per rarity, shared here so a creature's rarity reads at a
 * glance everywhere it's shown persistently (Monsters grid + detail modal), not just in the
 * one-off pull reveal. */
export const RARITY_BORDER_CLASS: Record<Rarity, string> = {
  Common: "border-rarity-common/70",
  Rare: "border-rarity-rare/70",
  SSR: "border-rarity-ssr/70",
  Mythic: "border-rarity-mythic",
  LR: "border-amber-400",
};

// Rarity-tiered base + a per-level scalar — mirrors how ITEM_CATALOG.sellPriceGold works for
// items, just on a scale that reflects a creature actually being the bigger investment.
const CREATURE_SELL_BASE: Record<Rarity, number> = {
  Common: 300,
  Rare: 800,
  SSR: 2500,
  Mythic: 8000,
  LR: 25000,
};

/** Gold a single copy of this creature is worth in Sell Monster (app/(game)/formations/sell) —
 * see lib/store.ts's sellCreature, which multiplies this by however many copies are being sold. */
export function creatureSellValue(creature: Creature): number {
  return CREATURE_SELL_BASE[creature.rarity] + creature.level * 25;
}

export const DUNGEON_STAGES: DungeonStage[] = STAGE_NAMES.map((name, i) => {
  const stageNumber = i + 1;
  const difficulty = stageNumber <= 8 ? "Normal" : stageNumber <= 16 ? "Hard" : "Nightmare";
  
  let world = 1;
  let worldStageNumber = stageNumber;
  
  for (let j = 0; j < WORLD_SIZES.length; j++) {
    if (worldStageNumber <= WORLD_SIZES[j]) {
      world = j + 1;
      break;
    }
    worldStageNumber -= WORLD_SIZES[j];
  }
  return {
    id: `dg-stage-${stageNumber}`,
    stageNumber,
    world,
    worldStageNumber,
    name,
    difficulty,
    staminaCost: 6 + Math.floor(stageNumber / 3),
    recommendedPower: 800 + stageNumber * 420,
    rewardGold: 300 + stageNumber * 180,
    rewardExp: EARLY_STAGE_REWARD_EXP[stageNumber] ?? 80 + stageNumber * 40,
    equipmentDropChance: Math.min(45, 10 + stageNumber * 2),
    isLocked: stageNumber > HIGHEST_STAGE_CLEARED + 1,
    isCleared: stageNumber <= HIGHEST_STAGE_CLEARED,
  };
});

