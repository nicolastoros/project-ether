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

/** Paralysis/Sleep/Poison skip or damage the afflicted combatant each of their own turns;
 * Confusion instead has a chance to redirect an Attack skill onto a random ally. See
 * lib/combat.ts's status-effect handling in applyAction() for the exact per-status rules. */
export type StatusEffectType = "paralysis" | "sleep" | "poison" | "confusion";

/** An LR-EXCLUSIVE "Ultimate Attack" — a 5th move, separate from the regular 4-skill kit, gated
 * behind a much higher Resonance cost than any regular skill (see lib/combat.ts's
 * resonanceCostForSkill). Named "Ultimate" (not "Super Attack") to avoid colliding with the
 * unrelated, already-shipped Creature.superAttackLevel system. Casting one always plays the
 * Dokkan-style gold "Ultimate Attack" epic banner (components/combat/UltimateAttackIntro.tsx)
 * before damage lands — never skip that, and never give this to a non-LR creature. */
export interface UltimateSkill {
  id: string;
  name: string;
  description: string;
  power: number;
  resonanceCost: number;
  /** Rolled once per hit against each struck target; on success the target's statusEffects
   * entry for `status` is (re)set to `turns`. */
  inflicts?: { status: StatusEffectType; turns: number; chance: number };
  /** Path to a centered GIF played during the epic banner (e.g.
   * "/assets/creatures/omega/animations/special_attack.gif") — each creature's own asset folder,
   * added per-creature as art becomes available. Undefined means the banner still shows (name +
   * gold treatment) without a centered animation. */
  animationGif?: string;
}

/** Which of this passive's team gets buffed — a creature matches if it satisfies ANY of the
 * groups actually set (OR across groups, and OR within each list — e.g. Poseidon's "Water
 * type OR LR rarity" is `{ elements: ["Water"], rarities: ["LR"] }`). Every field omitted means
 * unrestricted (the whole side), used by Magnagold's team-wide evasion boost. `categories` matches
 * against Creature.categories below — Dokkan-style archetype tags (e.g. "Royal Knights") that
 * cut across Element/Rarity, e.g. GallantKnight's own passive. */
export interface LrPassiveCondition {
  elements?: Element[];
  rarities?: Rarity[];
  categories?: string[];
}

export type LrPassiveEffectType = "atk-buff" | "def-buff" | "evasion-buff" | "double-hit-chance";

/** LR-exclusive team-wide passive, activating automatically the instant battle starts — every
 * real battle screen (Campaign, Raid/Challenge), never Sweep (which skips combat entirely). See
 * lib/combat.ts's applyLrPassives for how `effect`/`percent`/`turns` actually get applied, and
 * components/combat/LrPassiveIntro.tsx for the Dokkan-style neon activation banner. `description`
 * is shown verbatim in that banner, so keep it exactly what the effect does. */
export interface LrPassive {
  name: string;
  description: string;
  effect: LrPassiveEffectType;
  /** Magnitude — meaning depends on `effect` (e.g. atk-buff: +percent% ATK; double-hit-chance: a
   * 0-100 per-hit probability of a second, fully separate hit landing on the same action). */
  percent: number;
  /** Turns this lasts from battle start, counted on the buffed combatant's own turns — omitted
   * means it never expires this battle (only double-hit-chance ever uses that, per the current
   * roster; see applyLrPassives' comment on why turns-tracking isn't per-effect). */
  turns?: number;
  appliesTo: LrPassiveCondition;
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
  /** Duplicate copies owned beyond the first — starts at 1. A future "overlock"/limit-break
   * system will spend these to power the creature up; for now they're just tracked and shown. */
  copies: number;
  /** Level of the creature's first skill (Super Attack). */
  superAttackLevel: number;
  /** List of unlocked Hidden Potential node IDs (e.g., 'tl-1', 'tr-2'). */
  potentialNodes: string[];
  /** Number of frames if spriteFolder is a frame animation, or a map of animationName -> frames. */
  animationFrames?: number | Record<string, number>;
  /** LR-EXCLUSIVE 5th move — see UltimateSkill's own comment for why and for the activation
   * banner this always plays. Absent for every non-LR creature, and for any LR that doesn't have
   * one authored yet (GallantKnight, currently). */
  ultimateSkill?: UltimateSkill;
  /** How many times this creature has been Awakened — 0/absent = not awakened, 1 = SSR->Mythic
   * done (a future Mythic->LR step would be 2). NOT the source of truth for the bumped rarity/
   * stats themselves — rarity/baseStats are always rebuilt fresh from the STARTER_CREATURES
   * template on every load (see lib/store.ts's bundleToStateFields and its persist `merge`
   * option), so this counter is what actually persists; lib/gameData.ts's applyAwakenBump
   * reapplies the bump on top of the template each time using this value. */
  awakenLevel?: number;
  /** LR-exclusive team-wide battle-start passive — see the LrPassive comment above. Absent for
   * every non-LR creature and for LRs that don't have one authored yet. */
  lrPassive?: LrPassive;
  /** Dokkan-style Categories — every creature carries a handful of these, assigned by lore/
   * element/role so team-building has real cross-unit synergy (see components/monsters/
   * CreatureDetailModal.tsx for where a player sees them, and lib/gameData.ts's
   * CREATURE_CATEGORIES for the canonical 21-name list). Also doubles as the passive-targeting
   * hook for conditions that aren't a real Element — matched against LrPassiveCondition.categories
   * (e.g. "Royal Knights" for GallantKnight's own Royal Knight passive). */
  categories?: string[];
  /** Transient "Skill Damage" multiplier from a fully-equipped Tamer gear Set Effect (Thunder/
   * Ice's "+20% Skill Damage") — 1 means no bonus. Never persisted: only lib/tamerBuffs.ts's
   * applyTamerBuffs ever sets this, the same clone-at-battle-start pattern as the baseStats bump
   * right above it. lib/combat.ts's calcDamage reads it straight off the attacker. */
  skillDamageMult?: number;
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
  /** Premium, real-money-only currency for lib/gameData.ts's PREMIUM_SHOP_ITEMS (Lacrima) — no
   * store action grants or spends this yet (the Premium Shop tab is "Coming Soon"), so it always
   * reads 0/undefined today. Optional (not a hard `: number`) on purpose: adding real purchase
   * flow later is the natural time to also wire DB persistence (lib/db/bigquery.ts, lib/syncProgress.ts)
   * the same way awakenLevel/dailyChallengeAttempts were — no need to build that round-trip now for
   * a value nothing can change yet. */
  lacrima?: number;
}

// The Tamer is the player's own on-screen avatar, distinct from their Creatures — its gear is
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
  /** How this piece is obtained — shown in the Tamer tab so a locked piece explains itself.
   * "craft-item" spends one or more generic ITEM_CATALOG items (e.g. Crimson's 30x Blue Chipset,
   * Aqua/Wind's 30x Blue + 30x Purple) instead of Seal Coins — see lib/store.ts's
   * craftTamerEquipment, which requires every entry in costs to be affordable at once. */
  source:
    | { kind: "campaign-clear"; stageId: string }
    | { kind: "craft"; sealCoinCost: number }
    | { kind: "craft-item"; costs: { itemId: string; quantity: number }[] };
  /** Percent stat bonus this piece grants to every Creature in battle (e.g. hp: 3 -> +3% HP). */
  statBonus?: Partial<Record<"hp" | "atk" | "def" | "spd" | "dp" | "as" | "ht" | "cd" | "scd" | "ct", number>>;
}

/** A single bonus that activates only when every piece of one setName is simultaneously EQUIPPED
 * (not merely owned) — see lib/tamerBuffs.ts's getActiveTamerSetEffects. Exactly one entry per
 * set in lib/gameData.ts's TAMER_SET_EFFECTS; a set with no entry (Crimson) has no Set Effect at
 * all. `statBonus` folds into the same percent pipeline as TamerEquipment.statBonus (Aqua's Crit
 * Rate, Thunder/Ice's ATK); `expMultiplierBonus`/`skillDamageBonus` are separate mechanics with no
 * existing stat field (Wind's EXP, Thunder/Ice's Skill Damage) — see getTamerExpMultiplierBonus
 * and Creature.skillDamageMult respectively. */
export interface TamerSetEffect {
  description: string;
  statBonus?: Partial<Record<"hp" | "atk" | "def" | "spd" | "dp" | "as" | "ht" | "cd" | "scd" | "ct", number>>;
  /** e.g. 1 => Creature/Tamer EXP from that win is x2 (a +100% bonus, not a replacement). */
  expMultiplierBonus?: number;
  /** e.g. 0.2 => Creature.skillDamageMult is 1.2, scaling every attack's power by +20%. */
  skillDamageBonus?: number;
}

/** The player's own on-screen avatar — distinct from TamerEquipment (which is gear worn ON a
 * Tamer). Owning/equipping one applies its `buffs` to every Creature in battle (lib/tamerBuffs.ts). */
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

/** Trophy/achievement catalog entry — see lib/gameData.ts's ACHIEVEMENTS. Unlocked state itself
 * isn't part of this (that's just an id living in GameState.achievements / the server's
 * users.achievements column), so this type is pure content/design data, same as DailyTask isn't
 * either (its own progress/claimed fields are the exception, kept for backward compatibility). */
export interface Achievement {
  id: string;
  name: string;
  description: string;
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
  /** Despite the "daily" name (kept to avoid a DB rename), this now resets weekly — see
   * lib/store.ts's ensureFreshWeeklyEventAttempts for the actual reset logic/reasoning. */
  dailyEventAttempts?: Record<string, number>;
  /** "YYYY-MM-DD" of the Monday this account's dailyEventAttempts counts were last reset for. */
  dailyEventAttemptsDate?: string;
  /** Total quantity bought today per Shop listing id (e.g. "shop-chicken") — enforces
   * ShopListing.dailyLimit. Same reset mechanism as dailyEventAttempts, see
   * lib/store.ts's ensureFreshShopPurchases. */
  dailyShopPurchases?: Record<string, number>;
  dailyShopPurchasesDate?: string;
  /** Same as dailyShopPurchases/dailyShopPurchasesDate but for ShopListing.weeklyLimit (Orbs) —
   * see lib/store.ts's ensureFreshWeeklyShopPurchases. */
  weeklyShopPurchases?: Record<string, number>;
  weeklyShopPurchasesDate?: string;
  /** Events > Challenge attempt counters, keyed by event id (e.g. "event-crimson-set") — enforces
   * RaidEvent.weeklyAttemptLimit. Field/DB column names kept as "daily*" (avoids a migration for a
   * rename with zero behavior change) even though this resets weekly, not daily — repurposed the
   * same way dailyEventAttempts above was for Orb Training: 2/day (too easy to farm a full armor
   * set) became 3/week. See lib/store.ts's ensureFreshWeeklyChallengeAttempts for where "fresh" is
   * actually decided; anything reading this Record directly must run that same weekly-boundary
   * check itself first (see ChallengeTab.tsx). */
  dailyChallengeAttempts?: Record<string, number>;
  dailyChallengeAttemptsDate?: string;
  hasReceivedStarterGifts?: boolean;
  /** Best single-run total damage dealt against the current week's Overclock boss (see
   * lib/overclock.ts) — a plain number, not a Record, since only one week is ever "current" at a
   * time. Stale (belongs to a past week) whenever overclockWeekId !== currentOverclockWeekId();
   * see lib/store.ts's submitOverclockScore for the same "ensureFresh" reset-on-write pattern
   * every other weekly field here already uses. */
  overclockBestDamage?: number;
  /** "YYYY-MM-DD" of the Friday this account's overclockBestDamage was last recorded for — note
   * this is a *Friday* boundary (lib/utils.ts's thisOverclockWeekStartDateString), unlike every
   * other weekly field above which resets on Monday. */
  overclockWeekId?: string;
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

/** Per-stage, player-selected challenge tier — Easy through Super, unlocked sequentially per
 * stage (clear Easy on a stage to unlock Medium on that same stage, etc). Deliberately a
 * different concept/field from DungeonDifficulty above, which is just a cosmetic label derived
 * from a stage's absolute position in Campaign and unrelated to tier selection. See
 * lib/difficultyTiers.ts. */
export type DifficultyTier = "Easy" | "Medium" | "Hard" | "Super";

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
  /** Absent/undefined means Easy — the original, unscaled stage. Set on the on-the-fly variants
   * lib/difficultyTiers.ts's getTierStage() produces for Medium/Hard/Super. */
  tier?: DifficultyTier;
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
