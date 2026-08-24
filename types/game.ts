// Core domain types for the Monster Gacha prototype.
// All data here is mock/client-side only — no backend contracts yet.

export type Rarity = "Common" | "Rare" | "SSR" | "Mythic";

export type Element =
  | "Fire"
  | "Water"
  | "Nature"
  | "Light"
  | "Dark"
  | "Electric"
  | "Neutral";

export type EvolutionStage = 1 | 2 | 3;

export interface CreatureStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export type SkillType = "Attack" | "Defense" | "Support" | "Passive";

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  power: number;
  cooldown: number;
  unlockLevel: number;
}

export type EquipmentSlotType =
  | "Weapon"
  | "Helmet"
  | "Armor"
  | "Gloves"
  | "Boots"
  | "Necklace"
  | "Ring"
  | "Belt"
  | "Wings"
  | "Aura";

export interface Equipment {
  id: string;
  name: string;
  slot: EquipmentSlotType;
  rarity: Rarity;
  enhancementLevel: number; // +0 to +10
  baseStats: Partial<CreatureStats>;
  setName?: string;
  equippedTo?: string; // creature id, if equipped
}

export interface Creature {
  id: string;
  name: string;
  element: Element;
  rarity: Rarity;
  level: number;
  exp: number;
  expToNextLevel: number;
  stage: EvolutionStage;
  spriteKey: string; // maps to a placeholder pixel-art sprite
  // Folder holding 8-directional idle frames (south.png, south-east.png, east.png, ...).
  // Falls back to the element icon when not set.
  spriteFolder?: string;
  baseStats: CreatureStats;
  skills: Skill[]; // up to 4 active skills
  equipment: Partial<Record<EquipmentSlotType, string>>; // slot -> equipment id
}

export interface Currencies {
  gold: number;
  gems: number;
  energy: number;
  energyMax: number;
  energyRegenMinutes: number; // minutes per +1 energy
}

export interface DungeonProgress {
  highestStageCleared: number;
  currentWave: number;
  autoBattleEnabled: boolean;
  autoDgEnabled: boolean;
  speedMultiplier: 1 | 2 | 4;
}

export interface DailyTask {
  id: string;
  description: string;
  progress: number;
  target: number;
  rewardGold?: number;
  rewardGems?: number;
  claimed: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  level: number;
  exp: number;
  expToNextLevel: number;
  avatarKey: string;
  isAdmin: boolean;
}

export type GachaBannerType = "Creature" | "Equipment";

export interface GachaBanner {
  id: string;
  name: string;
  tagline: string;
  type: GachaBannerType;
  bannerImage: string;
  featuredIds: string[];
  singlePullCost: number;
  multiPullCost: number;
  multiPullCount: number;
}

export type CombatantSide = "player" | "enemy";

export interface CombatantState {
  id: string;
  creatureId: string;
  side: CombatantSide;
  currentHp: number;
  maxHp: number;
  actionGauge: number; // ATB-style fill 0-100
  isAlive: boolean;
}

export interface CombatLogEntry {
  id: string;
  turn: number;
  message: string;
  kind: "attack" | "skill" | "defeat" | "info";
}

export interface CombatState {
  battleId: string;
  turn: number;
  playerTeam: CombatantState[];
  enemyTeam: CombatantState[];
  log: CombatLogEntry[];
  isAutoBattle: boolean;
  speedMultiplier: 1 | 2 | 4;
  status: "idle" | "in-progress" | "victory" | "defeat";
}

export type PvpTier =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Platinum"
  | "Diamond"
  | "Grandmaster";

export interface PvpOpponent {
  id: string;
  name: string;
  tier: PvpTier;
  rank: number;
  power: number;
  defenseTeamCreatureIds: string[];
}

export type DungeonDifficulty = "Normal" | "Hard" | "Nightmare";

export interface DungeonStage {
  id: string;
  stageNumber: number;
  world: number;
  worldStageNumber: number;
  name: string;
  difficulty: DungeonDifficulty;
  staminaCost: number;
  recommendedPower: number;
  rewardGold: number;
  rewardExp: number;
  equipmentDropChance: number; // 0-100
  isLocked: boolean;
  isCleared: boolean;
}

export type FriendStatus = "Online" | "In Battle" | "Offline";

export interface Friend {
  id: string;
  name: string;
  level: number;
  status: FriendStatus;
  lastActive: string;
}

export type GuildRole = "Leader" | "Officer" | "Member";

export interface GuildMember {
  id: string;
  name: string;
  role: GuildRole;
  level: number;
  weeklyContribution: number;
}

export interface GuildInfo {
  id: string;
  name: string;
  level: number;
  memberCount: number;
  memberCap: number;
  description: string;
  members: GuildMember[];
}
