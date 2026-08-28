import type {
  Creature,
  DailyTask,
  DungeonStage,
  Equipment,
  Friend,
  GachaBanner,
  GuildInfo,
  InventoryItem,
  PvpOpponent,
  Rarity,
  Skill,
  TamerAvatar,
  TamerEquipment,
  UserProfile,
} from "@/types/game";

// Lives here (rather than lib/store.ts) so server-only modules — e.g. lib/db/bigquery.ts,
// deciding how many of an admin account's creatures go into the hub team — can read it
// without pulling zustand/React into a server bundle.
export const HUB_TEAM_SIZE = 7;

// Shared by both creature and Tamer leveling (lib/store.ts's applyExpGain/applyProfileExpGain).
// Early levels stay quick so the opening hours feel generous; the climb visibly steepens at 25,
// then again at 60, so late-game leveling reads as real, slower progress instead of a flat grind.
export const MAX_LEVEL = 100;
export function nextLevelExpRequirement(currentRequirement: number, newLevel: number): number {
  const rate = newLevel < 25 ? 1.12 : newLevel < 60 ? 1.18 : 1.24;
  return Math.round(currentRequirement * rate);
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

export const STARTER_CREATURES: Creature[] = [
  {
    id: "cr-emberling",
    name: "Emberling",
    element: "Fire",
    rarity: "Rare",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-tidalfin",
    name: "Tidalfin",
    element: "Water",
    rarity: "SSR",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-gale-sprite",
    name: "Gale Sprite",
    element: "Nature",
    rarity: "Common",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-voltling",
    name: "Voltling",
    element: "Electric",
    rarity: "Rare",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-firebit",
    name: "Firebit",
    element: "Fire",
    rarity: "Rare",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-dragoon",
    name: "Dragoon",
    element: "Nature",
    rarity: "SSR",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-crimson-guardian",
    name: "CrimsonGuardian",
    element: "Fire",
    rarity: "Mythic",
    level: 30,
    exp: 800,
    expToNextLevel: 2000,
    stage: 3,
    spriteKey: "crimsonguardian",
    spriteFolder: "/assets/creatures/crimsonguardian/idle",
    // Mythic sits below only LR (the top rarity) — every stat here clears the best SSR-or-lower
    // value by a wide margin (previously SPD 92 was actually below several Rares/SSRs —
    // Voltling's 140 is the highest SSR-or-lower SPD in the roster — letting lower-rarity
    // creatures act first and undercutting "most powerful"). CrimsonGuardian leans tanky (HP/DEF)
    // next to SilverDragon's swift-striker profile below.
    baseStats: { hp: 1150, atk: 215, def: 150, spd: 148 },
    skills: [
      skill("sk-cg-1", "Blazing Judgment", "A sword strike wreathed in crimson flame on one enemy.", "Attack", 172, 0),
      skill("sk-cg-2", "Aegis of Embers", "Raises own DEF sharply for 2 turns with the ceremonial shield.", "Defense", 0, 3, 5),
      skill("sk-cg-3", "Crimson Cataclysm", "An overwhelming flame judgment on all enemies.", "Attack", 138, 5, 15),
      skill("sk-cg-4", "Guardian's Resolve", "Passively reduces damage taken when HP falls below 30%.", "Passive", 0, 0, 20),
    ],
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-silver-dragon",
    name: "SilverDragon",
    element: "Light",
    rarity: "Mythic",
    level: 32,
    exp: 950,
    expToNextLevel: 2200,
    stage: 3,
    spriteKey: "silverdragon",
    spriteFolder: "/assets/creatures/silverdragon/idle",
    // Swift-striker Mythic profile (higher ATK/SPD, slightly less tanky than CrimsonGuardian
    // above) — still clears every non-Mythic creature's HP/DEF too, just by a smaller margin.
    baseStats: { hp: 1080, atk: 230, def: 135, spd: 150 },
    skills: [
      skill("sk-sd-1", "Radiant Fang", "A blessed bite crackling with electric light on one enemy.", "Attack", 168, 0),
      skill("sk-sd-2", "Sacred Scales", "Raises own DEF and SPD for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-sd-3", "Astral Nova", "A burst of sacred light damages all enemies with a chance to blind.", "Attack", 132, 5, 15),
      skill("sk-sd-4", "Celestial Ward", "Passively shields the lowest-HP ally each turn.", "Passive", 0, 0, 20),
    ],
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-venomshade",
    name: "Venomshade",
    element: "Dark",
    rarity: "Rare",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-tidewarden",
    name: "Tidewarden",
    element: "Water",
    rarity: "Rare",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-emberfiend",
    name: "Emberfiend",
    element: "Dark",
    rarity: "SSR",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-thundracoil",
    name: "Thundracoil",
    element: "Electric",
    rarity: "SSR",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-starweaver",
    name: "Starweaver",
    element: "Light",
    rarity: "SSR",
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
    equipment: {},
    copies: 1,
  },

  // --- Mythic tier ---
  // Every stat here clears the SSR ceiling (Thundracoil's 780hp/168atk/98def/140spd band) by a
  // wide margin, matching CrimsonGuardian/SilverDragon above — same "Mythic clearly beats SSR"
  // rule the pre-existing pair already established. Each leans into its own combat profile
  // (swift striker, tank, balanced, glass-cannon-aerial, heavy bruiser) rather than being flat
  // stat clones of each other.
  {
    id: "cr-wargek",
    name: "Wargek",
    element: "Fire",
    rarity: "Mythic",
    level: 31,
    exp: 820,
    expToNextLevel: 2050,
    stage: 3,
    spriteKey: "wargek",
    spriteFolder: "/assets/creatures/wargek/idle",
    // Swift striker — highest ATK/SPD of the new Mythics, echoing SilverDragon's profile.
    baseStats: { hp: 1100, atk: 235, def: 140, spd: 152 },
    skills: [
      skill("sk-wg-1", "Dramon Claw Rend", "Twin golden dragon-claw gauntlets tear into one enemy.", "Attack", 178, 0),
      skill("sk-wg-2", "Brave Shield Guard", "Raises own DEF sharply for 2 turns behind the Brave Shield.", "Defense", 0, 3, 5),
      skill("sk-wg-3", "Terra Force", "A devastating energy sphere scorches all enemies.", "Attack", 140, 5, 15),
      skill("sk-wg-4", "Warrior's Instinct", "Passively raises ATK when HP falls below 40%.", "Passive", 0, 0, 20),
    ],
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-goldak",
    name: "Goldak",
    element: "Water",
    rarity: "Mythic",
    level: 29,
    exp: 760,
    expToNextLevel: 1950,
    stage: 3,
    spriteKey: "goldak",
    spriteFolder: "/assets/creatures/goldak/idle",
    // Tank — highest HP/DEF of the new Mythics, trading off the lowest SPD.
    baseStats: { hp: 1200, atk: 210, def: 155, spd: 140 },
    skills: [
      skill("sk-gd-1", "Hydro Drill Impale", "The spinning hydro-drill gauntlet bores into one enemy.", "Attack", 165, 0),
      skill("sk-gd-2", "Tower Barrier", "Raises own DEF sharply for 2 turns behind a holographic barrier.", "Defense", 0, 3, 5),
      skill("sk-gd-3", "Abyssal Tentacle Storm", "Four cybernetic tentacles lash all enemies with a chance to slow.", "Attack", 128, 4, 14),
      skill("sk-gd-4", "Pressure Hide", "Passively reduces damage taken when HP falls below 30%.", "Passive", 0, 0, 19),
    ],
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-gallantknight",
    name: "GallantKnight",
    element: "Light",
    rarity: "Mythic",
    level: 30,
    exp: 800,
    expToNextLevel: 2000,
    stage: 3,
    spriteKey: "gallantknight",
    spriteFolder: "/assets/creatures/gallantknight/idle",
    // Balanced all-rounder, splitting the difference between Wargek's speed and Goldak's bulk.
    baseStats: { hp: 1130, atk: 222, def: 148, spd: 146 },
    skills: [
      skill("sk-gk-1", "Lightning Joust", "A holy lance thrust crackling with judgment light on one enemy.", "Attack", 170, 0),
      skill("sk-gk-2", "Aegis Cape", "Raises own DEF for 2 turns behind the flowing cape-shield.", "Defense", 0, 3, 5),
      skill("sk-gk-3", "Final Elysion", "A holy energy blast judges all enemies.", "Attack", 134, 5, 15),
      skill("sk-gk-4", "Knight's Vow", "Passively shields the lowest-HP ally each turn.", "Passive", 0, 0, 20),
    ],
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-firefex",
    name: "Firefex",
    element: "Fire",
    rarity: "Mythic",
    level: 28,
    exp: 700,
    expToNextLevel: 1900,
    stage: 3,
    spriteKey: "firefex",
    spriteFolder: "/assets/creatures/firefex/idle",
    // Aerial glass-cannon — highest SPD of any Mythic (player or enemy) in the roster, lowest DEF.
    baseStats: { hp: 1070, atk: 228, def: 132, spd: 155 },
    skills: [
      skill("sk-fx-1", "Solar Talon Rake", "Golden talons wreathed in radiant plasma strike one enemy.", "Attack", 174, 0),
      skill("sk-fx-2", "Radiant Wingspan", "Raises own SPD and DEF for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-fx-3", "Phoenix Flare", "A cascade of solar embers burns all enemies with a chance to burn.", "Attack", 136, 4, 14),
      skill("sk-fx-4", "Solar Rebirth", "Passively regenerates HP each turn, fueled by the reactor core.", "Passive", 0, 0, 18),
    ],
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-blitzfire",
    name: "Blitzfire",
    element: "Fire",
    rarity: "Mythic",
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
    equipment: {},
    copies: 1,
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-poseidon",
    name: "Poseidon",
    element: "Water",
    rarity: "LR",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-magnagold",
    name: "Magnagold",
    element: "Light",
    rarity: "LR",
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
    equipment: {},
    copies: 1,
  },
  {
    id: "cr-abaddo",
    name: "Abaddo",
    element: "Dark",
    rarity: "LR",
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
    equipment: {},
    copies: 1,
  },
];

// The 3 creatures offered during registration. All stage 1, one per starter element.
export const STARTER_CHOICE_IDS = ["cr-emberling", "cr-gale-sprite", "cr-voltling"] as const;
export type StarterChoiceId = (typeof STARTER_CHOICE_IDS)[number];

export const STARTER_EQUIPMENT: Equipment[] = [
  {
    id: "eq-ember-blade",
    name: "Ember Blade",
    slot: "Weapon",
    rarity: "Rare",
    enhancementLevel: 3,
    baseStats: { atk: 42 },
    setName: "Blazing Fury",
  },
  {
    id: "eq-tidal-crown",
    name: "Tidal Crown",
    slot: "Helmet",
    rarity: "SSR",
    enhancementLevel: 5,
    baseStats: { hp: 120, def: 18 },
    setName: "Abyssal Guard",
  },
  {
    id: "eq-gale-wings",
    name: "Gale Wings",
    slot: "Wings",
    rarity: "Rare",
    enhancementLevel: 2,
    baseStats: { spd: 24 },
    setName: "Windrunner",
  },
  {
    id: "eq-ashen-aura",
    name: "Ashen Aura",
    slot: "Aura",
    rarity: "Mythic",
    enhancementLevel: 0,
    baseStats: { atk: 30, spd: 12 },
    setName: "Blazing Fury",
  },
  {
    id: "eq-scale-plate",
    name: "Scale Plate",
    slot: "Armor",
    rarity: "Common",
    enhancementLevel: 1,
    baseStats: { hp: 90, def: 22 },
  },
];

// The Tamer's first gear set. Hat + Shoulders are one-time Campaign clear rewards (World 1's
// stage 5 and its final/boss stage — see BattleScreen.tsx's TAMER_SET_STAGE_REWARDS); the rest
// is crafted with Seal Coins, which Campaign stages also drop (DungeonStage.equipmentDropChance).
export const TAMER_EQUIPMENT_CATALOG: TamerEquipment[] = [
  {
    id: "tamer-crimson-hat",
    name: "Crimson Hood",
    slot: "Hat",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_hat.png",
    source: { kind: "campaign-clear", stageId: "dg-stage-5" },
    statBonus: { hp: 2, ht: 5, dp: 10 },
  },
  {
    id: "tamer-crimson-shoulders",
    name: "Crimson Shoulders",
    slot: "Shoulders",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_shoulders.png",
    source: { kind: "campaign-clear", stageId: "dg-stage-8" },
    statBonus: { def: 2, dp: 15, cd: 10 },
  },
  {
    id: "tamer-crimson-chest",
    name: "Crimson Chestplate",
    slot: "Chest",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_chest.png",
    source: { kind: "craft", sealCoinCost: 20 },
    statBonus: { hp: 3, ht: 10, dp: 20 },
  },
  {
    id: "tamer-crimson-legs",
    name: "Crimson Greaves",
    slot: "Legs",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_legs.png",
    source: { kind: "craft", sealCoinCost: 15 },
    statBonus: { spd: 2, as: 5, ct: 3 },
  },
  {
    id: "tamer-crimson-shoes",
    name: "Crimson Boots",
    slot: "Shoes",
    rarity: "SSR",
    setName: "Crimson",
    icon: "/assets/objects/tamer_gear/crimson_shoes.png",
    source: { kind: "craft", sealCoinCost: 15 },
    statBonus: { spd: 2, atk: 1, as: 8, scd: 15 },
  },
];

// The player's own on-screen avatar (distinct from Digimon) — owning/equipping one applies its
// buffs to every Digimon in battle (lib/tamerBuffs.ts). tamer1 is the free default every account
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
};

// Generic collectible items — Consumable/Quest/Evolution/Skin/Crafting. Equipment (creature gear)
// stays in its own richer catalog above (STARTER_EQUIPMENT/Equipment type) since it has slot/
// enhancement/equipped-to fields this simpler stackable-quantity model doesn't need.
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
    energyRestore: 20,
  },
  {
    id: "it-training-box",
    name: "Training Box",
    category: "Consumable",
    rarity: "Common",
    description: "Basic training gear — a small dose of EXP for one Digimon.",
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
    description: "Serious training gear — the biggest single dose of EXP for one Digimon.",
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
    | { kind: "item"; itemId: string }
    | { kind: "creature"; creatureId: string }
    | { kind: "tamer"; tamerId: string };
}

// No standalone icon field — the Shop page resolves art at render time from whatever the listing
// grants (ITEM_CATALOG's icon/CATEGORY_ICON for items, the creature's own sprite for creatures,
// the Tamer's own sprite for avatars), so nothing here can drift out of sync with the real catalog.
export const SHOP_LISTINGS: ShopListing[] = [
  {
    id: "shop-chicken",
    description: "Restores 20 Tamer energy.",
    rarity: "Common",
    price: { gold: 150 },
    grants: { kind: "item", itemId: "it-chicken" },
  },
  {
    id: "shop-training-box",
    description: "Grants 200 EXP to one Digimon.",
    rarity: "Common",
    price: { gold: 300 },
    grants: { kind: "item", itemId: "it-training-box" },
  },
  {
    id: "shop-training-trx",
    description: "Grants 600 EXP to one Digimon.",
    rarity: "Rare",
    price: { gold: 900 },
    grants: { kind: "item", itemId: "it-training-trx" },
  },
  {
    id: "shop-training-dumbbell",
    description: "Grants 1500 EXP to one Digimon.",
    rarity: "SSR",
    price: { gold: 2200 },
    grants: { kind: "item", itemId: "it-training-dumbbell" },
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
    description: "A Dark-type Digimon, available directly for gems.",
    rarity: "Rare",
    price: { gems: 300 },
    grants: { kind: "creature", creatureId: "cr-venomshade" },
  },
  {
    id: "shop-creature-tidewarden",
    description: "A Water-type Digimon, available directly for gems.",
    rarity: "Rare",
    price: { gems: 300 },
    grants: { kind: "creature", creatureId: "cr-tidewarden" },
  },
];

export const DEFAULT_DAILY_TASKS: DailyTask[] = [
  { id: "task-login", description: "Log in to the city hub", progress: 1, target: 1, rewardGold: 500, claimed: false },
  { id: "task-dungeon", description: "Clear 3 dungeon waves", progress: 1, target: 3, rewardGems: 30, claimed: false },
  { id: "task-gacha", description: "Perform 1 summon", progress: 0, target: 1, rewardGold: 1000, claimed: false },
  { id: "task-enhance", description: "Enhance a piece of gear", progress: 0, target: 1, rewardGems: 20, claimed: false },
];

export const GACHA_BANNERS: GachaBanner[] = [
  {
    id: "banner-corazon-de-roca",
    name: "Corazón de Roca",
    tagline: "El latido del mundo. Inquebrantable.",
    type: "Creature",
    bannerImage: "/assets/banners/banner_demo_1.png",
    featuredIds: ["cr-dragoon"],
    singlePullCost: 100,
    multiPullCost: 650,
    multiPullCount: 7,
  },
  {
    id: "banner-caballero-real-dragon",
    name: "Caballero Real",
    tagline: "La justicia protege al mundo.",
    type: "Creature",
    bannerImage: "/assets/banners/banner_knight_real_2.png",
    featuredIds: ["cr-voltling"],
    singlePullCost: 100,
    multiPullCost: 650,
    multiPullCount: 7,
  },
  {
    id: "banner-caballero-real-knight",
    name: "Caballero Real",
    tagline: "La justicia es mi espada. Mi escudo, mi honor.",
    type: "Creature",
    bannerImage: "/assets/banners/banner_royal_knight_1.png",
    featuredIds: ["cr-firebit"],
    singlePullCost: 100,
    multiPullCost: 650,
    multiPullCount: 7,
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
  // World 1 (8 stages)
  "Whispering Grove", "Ember Foothills", "Tidewater Shoals", "Sunken Ruins",
  "Ashfall Canyon", "Glimmering Caverns", "Thornwood Depths", "Frostpeak Pass",
  
  // World 2 (8 stages)
  "Molten Bastion", "Stormlit Shrine", "Duskveil Marsh", "Obsidian Spire",
  "Verdant Labyrinth", "Crimson Aqueduct", "Hollow Bellfort", "Wraithlight Hollow",
  
  // World 3 (12 stages)
  "Ironclad Foundry", "Sable Undercroft", "Gale Citadel", "Dragon's Reprieve",
  "Celestial Terrace", "Lunar Eclipse", "Solar Flare", "Abyssal Trench",
  "Crystal Peak", "Shadow Veil", "Thunder Plains", "Aero Heights",
  
  // World 4 (12 stages)
  "Void's Edge", "Neon Ruins", "Cyber Core", "Glitch Matrix",
  "Ethereal Realm", "Phantom Keep", "Spirit Woods", "Mirage Desert",
  "Oasis Shrine", "Volcanic Ash", "Lava Tube", "Inferno Core",
  
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

const WORLD_SIZES = [8, 8, 12, 12, 14];

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

export const MOCK_FRIENDS: Friend[] = [
  { id: "fr-1", name: "Astrid Vale", level: 34, status: "Online", lastActive: "now" },
  { id: "fr-2", name: "Renji Okami", level: 41, status: "In Battle", lastActive: "now" },
  { id: "fr-3", name: "Cass Whitlock", level: 19, status: "Offline", lastActive: "3h ago" },
  { id: "fr-4", name: "Nova Sundstrom", level: 27, status: "Online", lastActive: "now" },
  { id: "fr-5", name: "Emrys Kade", level: 52, status: "Offline", lastActive: "1d ago" },
];

export const MOCK_GUILD: GuildInfo = {
  id: "guild-emberwatch",
  name: "Emberwatch Vanguard",
  level: 12,
  memberCount: 5,
  memberCap: 30,
  description: "A friendly guild focused on dungeon co-op and weekly guild raids. Casual pace, active chat.",
  members: [
    { id: "gm-1", name: "Summoner", role: "Leader", level: 7, weeklyContribution: 4200 },
    { id: "gm-2", name: "Astrid Vale", role: "Officer", level: 34, weeklyContribution: 8900 },
    { id: "gm-3", name: "Renji Okami", role: "Officer", level: 41, weeklyContribution: 7600 },
    { id: "gm-4", name: "Cass Whitlock", role: "Member", level: 19, weeklyContribution: 2100 },
    { id: "gm-5", name: "Nova Sundstrom", role: "Member", level: 27, weeklyContribution: 5400 },
  ],
};
