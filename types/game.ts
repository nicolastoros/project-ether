// Core domain types for the Monster Gacha prototype.
// All data here is mock/client-side only — no backend contracts yet.

export type Rarity = "Common" | "Rare" | "SSR" | "Mythic" | "LR";

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
  dp?: number; // Digital/Defense Points
  as?: number; // Attack Speed
  ht?: number; // Hit Rate
  cd?: number; // Crit Damage %
  scd?: number; // Skill Crit Damage %
  ct?: number; // Crit Chance %
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
  /** Duplicate copies owned beyond the first — starts at 1. A future "overlock"/limit-break
   * system will spend these to power the creature up; for now they're just tracked and shown. */
  copies: number;
  /** Level of the creature's first skill (Super Attack). */
  superAttackLevel: number;
  /** List of unlocked Hidden Potential node IDs (e.g., 'tl-1', 'tr-2'). */
  potentialNodes: string[];
  /** Number of frames if spriteFolder is a frame animation, or a map of animationName -> frames. */
  animationFrames?: number | Record<string, number>;
}

export interface Currencies {
  gold: number;
  gems: number;
  /** Event/crafting currency dropped by Campaign stages — spent crafting Tamer gear. */
  sealCoins: number;
  energy: number;
  energyMax: number;
  energyRegenMinutes: number; // minutes per +1 energy
  lastEnergyTickAt: number;
}

// The Tamer is the player's own on-screen avatar, distinct from their Digimon — its gear is
// tracked separately from Creature.equipment (which is per-creature, e.g. weapons/armor for a
// specific monster). Slot list is deliberately small for now; more will join Chest/Hat/etc. as
// more sets are added.
export type TamerSlotType = "Chest" | "Hat" | "Legs" | "Shoes" | "Shoulders" | "Gloves" | "Aura" | "Wings";

export interface TamerEquipment {
  id: string;
  name: string;
  slot: TamerSlotType;
  rarity: Rarity;
  setName: string;
  icon: string;
  /** How this piece is obtained — shown in the Tamer tab so a locked piece explains itself. */
  source: { kind: "campaign-clear"; stageId: string } | { kind: "craft"; sealCoinCost: number };
  /** Percent stat bonus this piece grants to every Creature in battle (e.g. hp: 3 -> +3% HP). */
  statBonus?: Partial<Record<"hp" | "atk" | "def" | "spd" | "dp" | "as" | "ht" | "cd" | "scd" | "ct", number>>;
}

/** The player's own on-screen avatar — distinct from TamerEquipment (which is gear worn ON a
 * Tamer). Owning/equipping one applies its `buffs` to every Digimon in battle (lib/tamerBuffs.ts). */
export interface TamerAvatar {
  id: string;
  name: string;
  /** Folder holding 8-directional idle frames, same convention as Creature.spriteFolder. */
  spriteFolder: string;
  price?: { gold?: number; gems?: number };
  baseStats: CreatureStats;
  buffs: {
    hpPercent?: number;
    atkPercent?: number;
    defPercent?: number;
    spdPercent?: number;
    dpPercent?: number;
    asPercent?: number;
    htPercent?: number;
    cdPercent?: number;
    scdPercent?: number;
    ctPercent?: number;
    elementAtkBonus?: Partial<Record<Element, number>>;
  };
}

export type InventoryItemCategory = "Consumable" | "Quest" | "Evolution" | "Skin" | "Crafting";

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryItemCategory;
  rarity: Rarity;
  description: string;
  /** Real art path, e.g. "/assets/objects/rotten_egg.png" — falls back to CATEGORY_ICON when absent. */
  icon?: string;
  /** Sellable in the Shop for this much gold, if set. */
  sellPriceGold?: number;
  /** Usable from Inventory to restore this much Tamer energy, if set. */
  energyRestore?: number;
  /** Usable from Inventory on a chosen creature to grant this much EXP, if set. */
  creatureExpValue?: number;
}

export interface OwnedInventoryItem {
  itemId: string;
  quantity: number;
}

export interface ActiveExpedition {
  id: string;
  defId: string;
  creatureIds: string[];
  startedAt: number;
  durationMs: number;
}

export interface DungeonProgress {
  highestStageCleared: number;
  currentWave: number;
  autoBattleEnabled: boolean;
  autoDgEnabled: boolean;
  speedMultiplier: 1 | 2 | 4;
  perfectStages: string[];
  stageStars: Record<string, { noDeaths: boolean; noItems: boolean; underFiveTurns: boolean }>;
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
  dailyEventAttempts?: Record<string, number>;
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
  currencyType?: "gems" | "gold" | "item";
  currencyItemId?: string;
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
  bgmKey?: string;
  eventId?: string;
  eventRewards?: { itemId: string; amount: number }[];
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
  id: string; // This corresponds to user_id
  name: string; // username
  role: GuildRole;
  level: number;
  totalContribution: number;
  weeklyContribution?: number;
}

export interface GuildInfo {
  id: string;
  name: string;
  level: number;
  exp: number;
  expToNextLevel: number;
  memberCount: number;
  memberCap: number;
  description: string;
  avatarKey: string;
  members: GuildMember[];
}

export interface Gift {
  id: string;
  type: "item" | "creature";
  itemId?: string;
  creatureId?: string;
  quantity: number;
  message: string;
  createdAt: number;
}
