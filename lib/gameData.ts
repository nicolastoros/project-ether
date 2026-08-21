import type {
  Creature,
  DailyTask,
  DungeonStage,
  Equipment,
  Friend,
  GachaBanner,
  GuildInfo,
  PvpOpponent,
  Skill,
  UserProfile,
} from "@/types/game";

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
    baseStats: { hp: 620, atk: 148, def: 76, spd: 104 },
    skills: [
      skill("sk-em-1", "Cinder Claw", "A blazing slash dealing fire damage to one enemy.", "Attack", 140, 0),
      skill("sk-em-2", "Flare Guard", "Raises own DEF for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-em-3", "Ash Cyclone", "Hits all enemies with a spinning ember burst.", "Attack", 95, 4, 10),
      skill("sk-em-4", "Rekindle", "Passively regenerates HP each turn.", "Passive", 0, 0, 15),
    ],
    equipment: {},
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
    baseStats: { hp: 780, atk: 132, def: 94, spd: 96 },
    skills: [
      skill("sk-ti-1", "Riptide Slash", "A pressurized water strike on one enemy.", "Attack", 132, 0),
      skill("sk-ti-2", "Healing Tide", "Restores HP to the lowest-HP ally.", "Support", 110, 3, 8),
      skill("sk-ti-3", "Whirlpool", "Pulls all enemies in, dealing water damage.", "Attack", 88, 4, 12),
      skill("sk-ti-4", "Deep Focus", "Passively boosts SPD when HP is above 50%.", "Passive", 0, 0, 18),
    ],
    equipment: {},
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
    baseStats: { hp: 480, atk: 110, def: 62, spd: 132 },
    skills: [
      skill("sk-ga-1", "Vine Whip", "A quick nature strike on one enemy.", "Attack", 105, 0),
      skill("sk-ga-2", "Thorn Veil", "Reduces incoming damage for 2 turns.", "Defense", 0, 3, 5),
      skill("sk-ga-3", "Bloom Burst", "Nature damage to all enemies with a chance to slow.", "Attack", 80, 4, 10),
      skill("sk-ga-4", "Photosynthesis", "Passively restores small HP each turn in daylight.", "Passive", 0, 0, 12),
    ],
    equipment: {},
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
  },
];

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

export const DEFAULT_PROFILE: UserProfile = {
  id: "player-1",
  name: "Summoner",
  title: "Novice Tamer",
  level: 7,
  exp: 240,
  expToNextLevel: 500,
  avatarKey: "avatar-default",
};

export const DEFAULT_DAILY_TASKS: DailyTask[] = [
  { id: "task-login", description: "Log in to the city hub", progress: 1, target: 1, rewardGold: 500, claimed: false },
  { id: "task-dungeon", description: "Clear 3 dungeon waves", progress: 1, target: 3, rewardGems: 30, claimed: false },
  { id: "task-gacha", description: "Perform 1 summon", progress: 0, target: 1, rewardGold: 1000, claimed: false },
  { id: "task-enhance", description: "Enhance a piece of gear", progress: 0, target: 1, rewardGems: 20, claimed: false },
];

export const GACHA_BANNERS: GachaBanner[] = [
  {
    id: "banner-featured-creature",
    name: "Tempest Dawn",
    type: "Creature",
    description: "Featured summon: rate-up for Tidalfin and other SSR creatures.",
    featuredIds: ["cr-tidalfin"],
    singlePullCost: 100,
    tenPullCost: 900,
    bannerArtKey: "banner-tempest-dawn",
  },
  {
    id: "banner-mythic-equipment",
    name: "Forgeheart Vault",
    type: "Equipment",
    description: "Featured summon: rate-up for Mythic set equipment.",
    featuredIds: ["eq-ashen-aura"],
    singlePullCost: 100,
    tenPullCost: 900,
    bannerArtKey: "banner-forgeheart-vault",
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
  "Whispering Grove", "Ember Foothills", "Tidewater Shoals", "Sunken Ruins",
  "Ashfall Canyon", "Glimmering Caverns", "Thornwood Depths", "Frostpeak Pass",
  "Molten Bastion", "Stormlit Shrine", "Duskveil Marsh", "Obsidian Spire",
  "Verdant Labyrinth", "Crimson Aqueduct", "Hollow Bellfort", "Wraithlight Hollow",
  "Ironclad Foundry", "Sable Undercroft", "Gale Citadel", "Dragon's Reprieve",
];

const HIGHEST_STAGE_CLEARED = 14;

export const DUNGEON_STAGES: DungeonStage[] = STAGE_NAMES.map((name, i) => {
  const stageNumber = i + 1;
  const difficulty = stageNumber <= 8 ? "Normal" : stageNumber <= 16 ? "Hard" : "Nightmare";
  return {
    id: `dg-stage-${stageNumber}`,
    stageNumber,
    name,
    difficulty,
    staminaCost: 6 + Math.floor(stageNumber / 3),
    recommendedPower: 800 + stageNumber * 420,
    rewardGold: 300 + stageNumber * 180,
    rewardExp: 80 + stageNumber * 40,
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
