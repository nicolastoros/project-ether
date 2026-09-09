import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActiveExpedition,
  Creature,
  Currencies,
  DailyTask,
  DungeonProgress,
  Equipment,
  OwnedInventoryItem,
  TamerEquipment,
  TamerSlotType,
  UserProfile,
  Gift,
  Element,
} from "@/types/game";
import {
  applyAwakenBump,
  AWAKEN_COST,
  creatureLevelCap,
  creatureSellValue,
  DEFAULT_DAILY_TASKS,
  DEFAULT_PROFILE,
  expToNextLevelForLevel,
  EXPEDITION_DEFS,
  HUB_TEAM_SIZE,
  ITEM_CATALOG,
  MAX_LEVEL,
  nextLevelExpRequirement,
  pickWeightedTrainingItemId,
  SHOP_LISTINGS,
  STARTER_CREATURES,
  STARTER_EQUIPMENT,
  TAMER_EQUIPMENT_CATALOG,
} from "@/lib/gameData";
import { partyPower } from "@/lib/power";
import { getPotentialBonuses } from "@/lib/hiddenPotential";
import { thisWeekStartDateString, todayDateString } from "@/lib/utils";
// Type-only import: erased at compile time, so this never pulls the server-only
// BigQuery client (lib/db/bigquery.ts) into the client bundle.
import type { AccountBundle } from "@/lib/db/bigquery";

export { HUB_TEAM_SIZE };

function freshDailyTasks(): DailyTask[] {
  return DEFAULT_DAILY_TASKS.map((t) => ({ ...t }));
}

/** Shared by tickMissionProgress, claimTask and claimDailyBonus: resets to a fresh day's tasks
 * (and un-claims the all-tasks bonus) if the persisted `dailyTasksDate` doesn't match today (a
 * tab left open across midnight, or a stale persisted cache), otherwise passes the current state
 * through unchanged. */
function ensureFreshDailyTasks(
  dailyTasks: DailyTask[],
  dailyTasksDate: string,
  dailyBonusClaimed: boolean
): { tasks: DailyTask[]; date: string; bonusClaimed: boolean } {
  const today = todayDateString();
  if (dailyTasksDate === today) return { tasks: dailyTasks, date: today, bonusClaimed: dailyBonusClaimed };
  return { tasks: freshDailyTasks(), date: today, bonusClaimed: false };
}

export const DAILY_BONUS_GOLD = 2000;
export const DAILY_BONUS_GEMS = 20;

/** Same reset-on-stale-date pattern as ensureFreshDailyTasks above, for Hidden Training's weekly
 * attempts (lib/eventData.ts's ORB_EVENTS) — resets at local Monday instead of local midnight.
 * The stored field/DB column are still named profile.dailyEventAttempts(Date) (kept as-is to
 * avoid a DB migration for a rename with zero behavior change) even though nothing about this is
 * daily anymore; this function is the one place that actually encodes what "fresh" means, so its
 * own name says weekly.
 * IMPORTANT: this is only ever applied here, inside consumeEventAttempt below — anything that
 * just reads profile.dailyEventAttempts directly (e.g. to display "X attempts left") must run the
 * same "is dailyEventAttemptsDate === thisWeekStartDateString()" check itself first, or it'll show
 * a stale pre-reset count and disable its own Start button forever after the first week's attempts
 * run out. Confirmed live: that's exactly what was happening before this — the reset only ever
 * happened at the moment an attempt was actually consumed, but the UI's disabled-button check read
 * the raw unreset count, so the button could never be clicked again to reach that reset. */
function ensureFreshWeeklyEventAttempts(
  attempts: Record<string, number>,
  attemptsDate: string
): { attempts: Record<string, number>; date: string } {
  const thisWeek = thisWeekStartDateString();
  if (attemptsDate === thisWeek) return { attempts, date: thisWeek };
  return { attempts: {}, date: thisWeek };
}

/** Same reset-on-stale-date pattern, for Shop.buyListing's per-listing dailyLimit (e.g. Chicken:
 * 6/day) — see ShopListing.dailyLimit in lib/gameData.ts. */
function ensureFreshShopPurchases(
  purchases: Record<string, number>,
  purchasesDate: string
): { purchases: Record<string, number>; date: string } {
  const today = todayDateString();
  if (purchasesDate === today) return { purchases, date: today };
  return { purchases: {}, date: today };
}

/** Weekly counterpart to ensureFreshShopPurchases, for ShopListing.weeklyLimit (Orbs: 10/week) —
 * resets at local Monday instead of local midnight. */
function ensureFreshWeeklyShopPurchases(
  purchases: Record<string, number>,
  purchasesDate: string
): { purchases: Record<string, number>; date: string } {
  const thisWeek = thisWeekStartDateString();
  if (purchasesDate === thisWeek) return { purchases, date: thisWeek };
  return { purchases: {}, date: thisWeek };
}

function applyExpGain(creature: Creature, gained: number): Creature {
  // Varies by rarity (and Awaken state) now instead of a flat MAX_LEVEL — see
  // creatureLevelCap/LEVEL_CAP_BY_RARITY in lib/gameData.ts.
  const levelCap = creatureLevelCap(creature);
  if (creature.level >= levelCap) return creature;
  let exp = creature.exp + gained;
  let level = creature.level;
  // Never trust creature.expToNextLevel itself — see expToNextLevelForLevel's doc comment for why
  // a stored value can go stale (and silently throttle every level-up from here on) whenever the
  // curve above changes.
  let expToNextLevel = expToNextLevelForLevel(level);

  while (exp >= expToNextLevel && level < levelCap) {
    exp -= expToNextLevel;
    level += 1;
    expToNextLevel = nextLevelExpRequirement(expToNextLevel, level);
  }
  if (level >= levelCap) {
    level = levelCap;
    exp = 0;
  }

  const base = STARTER_CREATURES.find((c) => c.id === creature.id);
  const pot = getPotentialBonuses(creature.potentialNodes || []);

  const baseStats = base
    ? {
        hp: base.baseStats.hp + 8 * (level - 1) + pot.hp,
        atk: base.baseStats.atk + 3 * (level - 1) + pot.atk,
        def: base.baseStats.def + 2 * (level - 1) + pot.def,
        spd: base.baseStats.spd + 1 * (level - 1) + pot.spd,
      }
    : {
        hp: creature.baseStats.hp + pot.hp,
        atk: creature.baseStats.atk + pot.atk,
        def: creature.baseStats.def + pot.def,
        spd: creature.baseStats.spd + pot.spd,
      };

  return { ...creature, level, exp: Math.round(exp), expToNextLevel, baseStats };
}

function applyProfileExpGain(profile: UserProfile, gained: number): UserProfile {
  if (profile.level >= MAX_LEVEL) return profile;
  let exp = profile.exp + gained;
  let level = profile.level;
  // See applyExpGain's identical fix just above — a stored expToNextLevel can go stale.
  let expToNextLevel = expToNextLevelForLevel(level);

  while (exp >= expToNextLevel && level < MAX_LEVEL) {
    exp -= expToNextLevel;
    level += 1;
    expToNextLevel = nextLevelExpRequirement(expToNextLevel, level);
  }
  if (level >= MAX_LEVEL) {
    level = MAX_LEVEL;
    exp = 0;
  }

  // Same rounding reasoning as applyExpGain above — keeps this INT64-typed on the sync path too.
  return { ...profile, level, exp: Math.round(exp), expToNextLevel };
}

/** A single comparable "how far along is this creature" score — level dominates, then exp within
 * that level, then Hidden Potential nodes and Super Attack training as tie-breakers. Used by
 * reconcileCreatureProgress below; never persisted or sent anywhere, just a local ranking. */
function creatureProgressScore(c: Creature): number {
  return c.level * 1_000_000 + c.exp + c.potentialNodes.length * 1_000 + c.superAttackLevel * 100;
}

/** Whichever side — the server bundle just fetched, or whatever's already sitting in the store —
 * represents strictly more progress for this creature wins ALL of its progress fields together
 * (never mixed field-by-field, which could pair a level with the wrong potential-derived
 * baseStats). This guards against a real, confirmed bug: syncProgressToServer (see
 * lib/syncProgress.ts) is fire-and-forget and only reliably lands a few hundred ms to a couple
 * seconds later (BigQuery's own DML job latency), while a page reload's refreshAccountInStore
 * re-fetches the server bundle right away — its waitForPendingSync guard only tracks requests
 * still in flight *within the same page load*, so it can't know about one orphaned by a reload
 * that happened moments after a battle ended. Without this, leveling up (or unlocking a Hidden
 * Potential node) and then reloading shortly after — closing and reopening the tab, a hard
 * refresh, anything that re-mounts the app — silently rolled that progress back to whatever the
 * server had a moment before. Identity fields (name/sprite/rarity/skills/...) and ownership
 * fields (copies/awakenLevel, both already synced through their own dedicated grant endpoints)
 * always come from the server regardless — only the fields a battle/potential-unlock actually
 * touches are contested here. */
function reconcileCreatureProgress(serverCreature: Creature, localCreature: Creature | undefined): Creature {
  if (!localCreature) return serverCreature;
  const winner = creatureProgressScore(localCreature) > creatureProgressScore(serverCreature) ? localCreature : serverCreature;
  return {
    ...serverCreature,
    level: winner.level,
    exp: winner.exp,
    expToNextLevel: winner.expToNextLevel,
    baseStats: winner.baseStats,
    potentialNodes: winner.potentialNodes,
    superAttackLevel: winner.superAttackLevel,
  };
}

/** Shared server-bundle → store-fields mapping used by both hydrateFromServer (fresh sign-in,
 * full reset) and refreshFromServer (an already-open session picking up server-side changes) —
 * see their respective doc comments on GameState for how the two differ. */
function bundleToStateFields(bundle: AccountBundle) {
  const creatureCatalogById = new Map(STARTER_CREATURES.map((c) => [c.id, c]));
  const creatures = bundle.creatures
    .map((owned): Creature | null => {
      const base = creatureCatalogById.get(owned.creatureId);
      if (!base) return null;
      const pot = getPotentialBonuses(owned.potentialNodes || []);
      // Rarity/baseStats are never what's persisted for an Awaken — only the small awakenLevel
      // counter is (see Creature.awakenLevel's doc comment) — so the bump is reapplied here, on
      // top of the pristine template, every time a creature is rebuilt from a server hydrate.
      const awakenLevel = owned.awakenLevel ?? 0;
      const { rarity, baseStats: awakenedBase } =
        awakenLevel >= 1 ? applyAwakenBump(base.rarity, base.baseStats) : base;
      return {
        ...base,
        rarity,
        level: owned.level,
        exp: owned.exp,
        // Not owned.expToNextLevel — see expToNextLevelForLevel's doc comment.
        expToNextLevel: expToNextLevelForLevel(owned.level),
        baseStats: {
          hp: awakenedBase.hp + 8 * (owned.level - 1) + pot.hp,
          atk: awakenedBase.atk + 3 * (owned.level - 1) + pot.atk,
          def: awakenedBase.def + 2 * (owned.level - 1) + pot.def,
          spd: awakenedBase.spd + 1 * (owned.level - 1) + pot.spd,
        },
        equipment: {},
        copies: owned.copies,
        superAttackLevel: owned.superAttackLevel,
        potentialNodes: owned.potentialNodes || [],
        awakenLevel,
      };
    })
    .filter((c): c is Creature => c !== null);

  const equipmentCatalogById = new Map(STARTER_EQUIPMENT.map((e) => [e.id, e]));
  const inventory = bundle.equipment
    .map((owned): Equipment | null => {
      const base = equipmentCatalogById.get(owned.equipmentId);
      if (!base) return null;
      return { ...base, enhancementLevel: owned.enhancementLevel, equippedTo: owned.equippedTo ?? undefined };
    })
    .filter((e): e is Equipment => e !== null);

  const hubTeamIds = bundle.creatures.filter((c) => c.isInHubTeam).map((c) => c.creatureId);
  const partyCreatureIds: (string | null)[] = [null, null];
  for (const c of bundle.creatures) {
    if (c.partySlot && c.partySlot >= 1 && c.partySlot <= 2) {
      partyCreatureIds[c.partySlot - 1] = c.creatureId;
    }
  }

  const tamerCatalogById = new Map(TAMER_EQUIPMENT_CATALOG.map((t) => [t.id, t]));
  const tamerInventory = bundle.tamerEquipment
    .map((owned) => tamerCatalogById.get(owned.itemId))
    .filter((t): t is TamerEquipment => t !== undefined);

  const itemCatalogIds = new Set(ITEM_CATALOG.map((i) => i.id));
  const ownedItems = bundle.items.filter((owned) => itemCatalogIds.has(owned.itemId));

  return {
    profile: {
      id: bundle.profile.id,
      name: bundle.profile.displayName,
      title: bundle.profile.title,
      level: bundle.profile.level,
      exp: bundle.profile.exp,
      // Not bundle.profile.expToNextLevel — see expToNextLevelForLevel's doc comment.
      expToNextLevel: expToNextLevelForLevel(bundle.profile.level),
      avatarKey: bundle.profile.avatarKey,
      isAdmin: bundle.profile.isAdmin,
      dailyEventAttempts: bundle.profile.dailyEventAttempts || {},
      dailyEventAttemptsDate: bundle.profile.dailyEventAttemptsDate || "",
      dailyShopPurchases: bundle.profile.dailyShopPurchases || {},
      dailyShopPurchasesDate: bundle.profile.dailyShopPurchasesDate || "",
      weeklyShopPurchases: bundle.profile.weeklyShopPurchases || {},
      weeklyShopPurchasesDate: bundle.profile.weeklyShopPurchasesDate || "",
      hasReceivedStarterGifts: bundle.profile.hasReceivedStarterGifts || false,
    },
    currencies: {
      ...bundle.currencies,
      // If the DB doesn't have lastEnergyTickAt yet (older accounts), default to now.
      lastEnergyTickAt: bundle.currencies.lastEnergyTickAt ?? Date.now(),
    },
    creatures,
    partyCreatureIds,
    hubTeamIds,
    inventory,
    tamerInventory,
    ownedItems,
    ownedTamerIds: bundle.ownedTamerIds.length ? bundle.ownedTamerIds : ["tamer1"],
    activeExpeditions: bundle.expeditions.map((e) => ({
      id: e.id,
      defId: e.defId,
      creatureIds: e.creatureIds,
      startedAt: e.startedAt,
      durationMs: e.durationMs,
    })),
    teamPresets: bundle.teamPresets,
    guild: bundle.guild,
    dungeon: {
      ...bundle.dungeon,
      perfectStages: bundle.dungeon.perfectStages || [],
      stageStars: parseStageStars(bundle.dungeon.perfectStages || []),
    },
    pendingGuildInvitesCount: bundle.pendingGuildInvitesCount || 0,
    // bundle.dailyMissionsState is already null unless its stored date is today (see
    // getAccountBundle's parseDailyMissionsState) — merged onto DEFAULT_DAILY_TASKS by id rather
    // than trusted as-is, so a task type added in a later release still shows up even for an
    // account whose saved blob predates it.
    dailyTasks: bundle.dailyMissionsState
      ? DEFAULT_DAILY_TASKS.map((def) => {
          const saved = bundle.dailyMissionsState!.tasks[def.id];
          return saved ? { ...def, progress: saved.progress, claimed: saved.claimed } : { ...def };
        })
      : freshDailyTasks(),
    dailyTasksDate: bundle.dailyMissionsState?.date ?? todayDateString(),
    dailyBonusClaimed: bundle.dailyMissionsState?.bonusClaimed ?? false,
    achievements: bundle.achievements || [],
  };
}

function parseStageStars(perfectStages: string[]) {
  const map: Record<string, { noDeaths: boolean; noItems: boolean; underFiveTurns: boolean }> = {};
  for (const s of perfectStages) {
    if (s.endsWith("_nd")) {
      const id = s.replace("_nd", "");
      if (!map[id]) map[id] = { noDeaths: false, noItems: false, underFiveTurns: false };
      map[id].noDeaths = true;
    } else if (s.endsWith("_ni")) {
      const id = s.replace("_ni", "");
      if (!map[id]) map[id] = { noDeaths: false, noItems: false, underFiveTurns: false };
      map[id].noItems = true;
    } else if (s.endsWith("_u5")) {
      const id = s.replace("_u5", "");
      if (!map[id]) map[id] = { noDeaths: false, noItems: false, underFiveTurns: false };
      map[id].underFiveTurns = true;
    } else {
      // Legacy "perfectStages" string (just the stage ID) implies all 3 were obtained.
      map[s] = { noDeaths: true, noItems: true, underFiveTurns: true };
    }
  }
  return map;
}

interface GameState {
  guild?: {
    id: string;
    name: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    memberCap: number;
    description: string;
    avatarKey: string;
    role: string;
  };
  profile: UserProfile;
  currencies: Currencies;
  creatures: Creature[];
  activeCreatureId: string;
  partyCreatureIds: (string | null)[];
  hubTeamIds: string[];
  inventory: Equipment[];
  /** Tamer gear owned by the player — unlike creature Equipment, there's no separate "equipped"
   * step yet: each slot has at most one obtainable item so far, so owning a piece means wearing
   * it. See types/game.ts's TamerEquipment comment. */
  tamerInventory: TamerEquipment[];
  equippedTamerGear: Partial<Record<TamerSlotType, string>>;
  /** Generic collectible items (Consumable/Quest/Evolution/Skin/Crafting) — Equipment stays in
   * `inventory` above. Quantities stack per item id via OwnedInventoryItem.quantity. */
  ownedItems: OwnedInventoryItem[];
  /** True once an item lands in `ownedItems` that the player hasn't opened Inventory to see yet —
   * drives the notification dot on the Inventory nav link. */
  hasUnseenInventory: boolean;
  hasUnseenCampaign: boolean;
  hasUnseenTamer: boolean;
  pendingGuildInvitesCount: number;
  teamPresets: { id: string; name: string; creatureIds: string[]; mode: "campaign" | "raid" }[];
  /** Which TAMER_CATALOG avatar is currently worn — its buffs apply to every Digimon in battle. */
  equippedTamerId: string;
  ownedTamerIds: string[];
  activeExpeditions: ActiveExpedition[];
  dungeon: DungeonProgress;
  dailyTasks: DailyTask[];
  /** "YYYY-MM-DD" (local date) the current `dailyTasks` snapshot was generated for — checked
   * against today's date before every progress tick/claim so a tab left open across midnight (or
   * a stale persisted cache) rolls over to a fresh set instead of ticking/claiming yesterday's.
   * Mirrored server-side in users.daily_missions_state's own "date" field. */
  dailyTasksDate: string;
  /** Bumps one daily task's progress (capped at its target), resetting to a fresh day's tasks
   * first if `dailyTasksDate` is stale. Called from the real gameplay hooks that back each task —
   * see BattleScreen.tsx (task-dungeon), gacha/page.tsx (task-gacha), inventory/page.tsx
   * (task-enhance) — NOT from claimTask, which only pays out an already-completed task. */
  tickMissionProgress: (taskId: string, amount?: number) => void;
  /** Grants DAILY_BONUS_GOLD/DAILY_BONUS_GEMS once every one of today's dailyTasks is claimed —
   * false (no-op) if any task is still unclaimed or the bonus was already claimed today. */
  claimDailyBonus: () => boolean;
  achievements: string[];
  /** Adds an achievement id to local state if not already present. Returns whether it was newly
   * added (false if already unlocked) — callers use that to decide whether to fire the server
   * grant + unlock notification, not just on every check. */
  unlockAchievement: (achievementId: string) => boolean;
  gifts: Gift[];
  claimGift: (giftId: string) => void;
  /** Highest Survival stage number cleared so far (see lib/survivalStages.ts) — local-only for now, same as `dungeon`. */
  survivalHighestStageCleared: number;
  hasHydrated: boolean;
  hasReceivedLaunchTicketsV3: boolean;
  hasReceivedGiftsV6: boolean;
  hasReceivedGiftsV7: boolean;
  hasReceivedGiftsV8: boolean;
  hasReceivedGiftsV9: boolean;
  hasReceivedGiftsV10: boolean;
  /** Ids of onboarding tips (see lib/tutorialTips.ts) already dismissed — TutorialBubble.tsx
   * won't show one again once its id lands here. Local-only (never synced to BigQuery): it's a
   * UI nicety, not game progress, so a new device simply seeing a tip again is harmless. */
  seenTutorialTips: string[];
  /** Base Campaign stage ids (never tier-suffixed — "attempted" is tracked per area, not per
   * difficulty tier) the player has started and lost at least once — see ChapterAreaList.tsx's
   * badge: NEW until first attempted, blank while attempted-but-not-yet-won (no longer "unseen",
   * not yet "completed" either), COMPLETED once >=1 star is earned. Local-only, same rationale as
   * seenTutorialTips above — purely a "have I looked at this" UI cue, not real progress. */
  attemptedStageIds: string[];
  /** True once the bonus for clearing all of today's Daily Tasks has been claimed — resets
   * alongside dailyTasks/dailyTasksDate whenever the persisted date rolls over (see
   * ensureFreshDailyTasks). Synced server-side inside the same daily_missions_state JSON blob
   * as the tasks themselves, since it grants real currency and shouldn't be re-farmable by
   * clearing local storage. */
  dailyBonusClaimed: boolean;
  /** Creature ids the player has starred in Formations > Teams — purely a personal sort/filter
   * convenience (see the roster's "Favorites only" filter chip), same local-only rationale as
   * seenTutorialTips above, not real progress worth cross-device durability. */
  favoriteCreatureIds: string[];
  /** Gacha pity: pulls made on each banner currency (keyed by ITEM_CATALOG id, e.g.
   * "it-mythic-ticket") since that currency's last guaranteed-rarity hit — see
   * app/(game)/gacha/page.tsx's PITY_CONFIG. Client-only: losing this on a fresh device just
   * resets a player back to base odds (worse for them, not an exploit), so it doesn't need the
   * server round-trip favoriteCreatureIds' neighbors above also skip. */
  gachaPityCounters: Record<string, number>;
  setGachaPityCount: (currencyItemId: string, count: number) => void;

  /** Replaces local profile/currencies/creatures/dungeon with what the server (BigQuery) has on file, right after sign-in or registration. */
  hydrateFromServer: (bundle: AccountBundle) => void;
  /** Same server data as hydrateFromServer, but for an already-open session (see GameGate.tsx,
   * which calls this once per app load) rather than a fresh sign-in: preserves local-only
   * selections (active creature, equipped Tamer, Survival progress) instead of resetting them,
   * so picking up server-side changes — e.g. new creatures an admin granted directly in BigQuery —
   * doesn't discard what the player was doing in this tab. */
  refreshFromServer: (bundle: AccountBundle) => void;
  /** Clears account-specific local state so a different account signing in next doesn't inherit it. */
  logout: () => void;
  setHasHydrated: (hydrated: boolean) => void;
  setHasReceivedGiftsV6: (received: boolean) => void;
  setHasReceivedGiftsV7: (received: boolean) => void;
  setHasReceivedGiftsV8: (received: boolean) => void;
  setHasReceivedGiftsV9: (received: boolean) => void;

  markStagePerfect: (stageId: string) => void;
  recordStageStars: (stageId: string, stars: { noDeaths: boolean; noItems: boolean; underFiveTurns: boolean }) => void;
  markTutorialTipSeen: (id: string) => void;
  markStageAttempted: (baseStageId: string) => void;

  setActiveCreature: (creatureId: string) => void;
  setPartySlot: (slotIndex: number, creatureId: string | null) => void;
  toggleHubTeamMember: (creatureId: string) => void;
  gainCreatureExp: (creatureId: string, amount: number) => void;
  gainProfileExp: (amount: number) => void;
  /** Adds a catalog creature to the collection at its default level, or — if already owned —
   * increments its dupe count instead (creature ids are unique per account, but duplicates are
   * tracked via Creature.copies rather than being rejected; a future "overlock" system will spend
   * them). Returns null only if creatureId isn't a real catalog id. */
  grantCreature: (creatureId: string, quantity?: number) => { isNew: boolean; copies: number } | null;
  /** Spends AWAKEN_COST it-awaken-coin to permanently bump an owned SSR creature to Mythic (see
   * lib/gameData.ts's applyAwakenBump) — false if the creature isn't owned, isn't SSR, is already
   * awakened, or there aren't enough coins. */
  awakenCreature: (creatureId: string) => boolean;
  addGuildExp: (exp: number) => void;
  trainSuperAttack: (creatureId: string) => boolean;
  unlockPotentialNode: (creatureId: string, nodeId: string, orbCost: { small: number; medium: number; large: number; element: Element }, consumesDupe: boolean) => boolean;
  saveTeamPreset: (id: string, name: string, creatureIds: string[], mode: "campaign" | "raid") => void;
  deleteTeamPreset: (id: string) => void;
  toggleFavorite: (creatureId: string) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => void;
  addGems: (amount: number) => void;
  spendGems: (amount: number) => boolean;
  addSealCoins: (amount: number) => void;
  spendSealCoins: (amount: number) => boolean;
  spendEnergy: (amount: number) => boolean;
  regenEnergy: (amount: number) => void;
  tickEnergy: () => void;

  equipItem: (creatureId: string, equipmentId: string) => void;
  unequipItem: (creatureId: string, equipmentId: string) => void;
  enhanceEquipment: (equipmentId: string) => void;

  equipTamerGear: (itemId: string) => void;
  unequipTamerGear: (slot: TamerSlotType) => void;

  /** Adds a Tamer gear piece if not already owned — a no-op (returns false) if it's already
   * owned, since there's nothing to stack (unlike Creature.copies). */
  grantTamerEquipment: (itemId: string) => boolean;
  /** Spends Seal Coins to craft a Tamer gear piece (its cost comes from TAMER_EQUIPMENT_CATALOG's
   * "craft" source) — false if already owned, not craftable, or not enough Seal Coins. */
  craftTamerEquipment: (itemId: string) => boolean;

  /** Adds (or stacks) a generic collectible item and flags the Inventory nav dot. No-op if
   * itemId isn't a real ITEM_CATALOG id. */
  grantItem: (itemId: string, quantity?: number) => void;
  /** Clears the Inventory nav dot — called once when the Inventory page mounts. */
  markInventorySeen: () => void;
  markCampaignSeen: () => void;
  markTamerSeen: () => void;
  joinGuildLocally: (guildData: any) => void;
  /** Removes `quantity` of an owned item (Inventory's "Use" action, or a Shop sale) — false if
   * fewer than `quantity` are owned. */
  consumeItem: (itemId: string, quantity?: number) => boolean;
  /** Sells `quantity` of an item with a sellPriceGold set — false if not sellable or not owned. */
  sellItem: (itemId: string, quantity?: number) => boolean;
  /** Sells `quantity` copies of an owned creature for gold (see lib/gameData.ts's
   * creatureSellValue). Refuses (returns false) if that would drop the owned count below what's
   * currently needed by the hub team, the Campaign party, or any saved formation — selling out
   * from under an active team silently breaks it otherwise. */
  sellCreature: (creatureId: string, quantity?: number) => boolean;
  /** Buys a SHOP_LISTINGS entry in a specific quantity — false if unaffordable or the listing id is unknown. */
  buyListing: (listingId: string, quantity?: number) => boolean;

  /** Sends up to 6 owned, not-already-busy creatures on an expedition — null if the def id is
   * invalid, no creatures were given, or any are already on another expedition. */
  startExpedition: (defId: string, creatureIds: string[]) => ActiveExpedition | null;
  /** Resolves an expedition once its timer has elapsed — rolls success, grants rewards, and
   * frees its creatures. Null if the expedition doesn't exist or hasn't finished yet. */
  collectExpedition: (expeditionId: string) => {
    success: boolean;
    gold: number;
    sealCoins: number;
    items: { itemId: string; quantity: number }[];
  } | null;
  isOnExpedition: (creatureId: string) => boolean;

  toggleAutoBattle: () => void;
  toggleAutoDg: () => void;
  setSpeedMultiplier: (speed: 1 | 2 | 4) => void;

  clearSurvivalStage: (stageNumber: number) => void;
  clearDungeonStage: (stageNumber: number) => void;

  claimTask: (taskId: string) => void;
  /** Spends one of this week's attempts for a Hidden Training event (lib/eventData.ts's
   * ORB_EVENTS) — false (no-op) if this event has already used all `maxAttempts` this week.
   * Resets automatically the first time it's called after local Monday. */
  consumeEventAttempt: (eventId: string, maxAttempts: number) => boolean;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      currencies: {
        gold: 0,
        gems: 0,
        sealCoins: 0,
        energy: 82,
        energyMax: 240,
        energyRegenMinutes: 1,
        lastEnergyTickAt: Date.now(),
      },
      creatures: STARTER_CREATURES,
      activeCreatureId: STARTER_CREATURES[0].id,
      partyCreatureIds: STARTER_CREATURES.slice(0, 2).map((c) => c.id),
      hubTeamIds: STARTER_CREATURES.slice(0, HUB_TEAM_SIZE).map((c) => c.id),
      inventory: STARTER_EQUIPMENT,
      tamerInventory: [],
      equippedTamerGear: {},
      ownedItems: [],
      hasUnseenInventory: false,
      hasUnseenCampaign: true,
      hasUnseenTamer: true,
      pendingGuildInvitesCount: 0,
      teamPresets: [],
      equippedTamerId: "tamer1",
      ownedTamerIds: ["tamer1"],
      activeExpeditions: [],
      dungeon: {
        highestStageCleared: 0,
        currentWave: 0,
        autoBattleEnabled: false,
        autoDgEnabled: false,
        speedMultiplier: 1,
        perfectStages: [],
        stageStars: {},
      },
      dailyTasks: DEFAULT_DAILY_TASKS,
      dailyTasksDate: todayDateString(),
      achievements: [],
      gifts: [
        { id: "gift-3", type: "item", itemId: "it-mythic-ticket", quantity: 40, message: "Special LR Event!", createdAt: Date.now() },
        { id: "gift-4", type: "item", itemId: "it-legendary-ticket", quantity: 40, message: "Mythic Celebration", createdAt: Date.now() },
        { id: "gift-5", type: "item", itemId: "it-mythic-ticket", quantity: 40, message: "Sorry for the bug! More tickets!", createdAt: Date.now() },
        { id: "gift-6", type: "item", itemId: "it-legendary-ticket", quantity: 40, message: "Compensation Tickets", createdAt: Date.now() }
      ],
      survivalHighestStageCleared: 0,
      hasHydrated: false,
      hasReceivedLaunchTicketsV3: false,
      hasReceivedGiftsV6: false,
      hasReceivedGiftsV7: false,
      hasReceivedGiftsV8: false,
      hasReceivedGiftsV9: false,
      hasReceivedGiftsV10: false,
      seenTutorialTips: [],
      attemptedStageIds: [],
      dailyBonusClaimed: false,
      favoriteCreatureIds: [],
      gachaPityCounters: {},

      hydrateFromServer: (bundle) => {
        const fields = bundleToStateFields(bundle);
        set((state) => {
          // The persisted local cache (this browser's last-known state, from before this login)
          // can be ahead of what just came back from the server — see reconcileCreatureProgress's
          // comment. Whatever's already in `state.creatures` at this point is exactly that cache,
          // since zustand's persist rehydration runs before this fires.
          const localById = new Map(state.creatures.map((c) => [c.id, c]));
          const creatures = fields.creatures.map((c) => reconcileCreatureProgress(c, localById.get(c.id)));
          return {
            ...fields,
            creatures,
            activeCreatureId: creatures[0]?.id ?? "",
            hasUnseenInventory: false,
            // No "switch avatar" UI exists yet (only tamer1, the free default) — only ownership
            // is server-persisted for now; which one is equipped stays client-side.
            equippedTamerId: "tamer1",
            // Auto-equip all gear on fresh login since it's client-side only
            equippedTamerGear: fields.tamerInventory.reduce((acc, gear) => {
              acc[gear.slot] = gear.id;
              return acc;
            }, {} as Partial<Record<TamerSlotType, string>>),
            // Not synced server-side yet (see docs/gcp-database-schema.md) — reset so a different
            // account signing in on this browser doesn't inherit the previous one's local progress.
            survivalHighestStageCleared: 0,
          };
        });
      },

      refreshFromServer: (bundle) => {
        const fields = bundleToStateFields(bundle);
        set((state) => {
          // See reconcileCreatureProgress's comment — this is the exact race it exists for: an
          // already-open session's own periodic/one-time reconcile racing a battle/potential-
          // unlock sync that hasn't landed server-side yet.
          const localById = new Map(state.creatures.map((c) => [c.id, c]));
          const creatures = fields.creatures.map((c) => reconcileCreatureProgress(c, localById.get(c.id)));
          return {
            ...fields,
            creatures,
            // Only fall back to the bundle's first creature if the previously active one is no
            // longer owned (shouldn't normally happen mid-session) — otherwise keep whatever the
            // player currently has selected instead of yanking it back to creatures[0].
            activeCreatureId: creatures.some((c) => c.id === state.activeCreatureId)
              ? state.activeCreatureId
              : (creatures[0]?.id ?? ""),
          };
        });
      },

      logout: () =>
        set({
          profile: DEFAULT_PROFILE,
          currencies: {
            gold: 0,
            gems: 0,
            sealCoins: 0,
            energy: 0,
            energyMax: 240,
            energyRegenMinutes: 1,
            lastEnergyTickAt: Date.now(),
          },
          creatures: [],
          activeCreatureId: "",
          partyCreatureIds: [null, null],
          hubTeamIds: [],
          inventory: [],
          tamerInventory: [],
          equippedTamerGear: {},
          ownedItems: [],
          hasUnseenInventory: false,
          hasUnseenCampaign: true,
          hasUnseenTamer: true,
          equippedTamerId: "tamer1",
          ownedTamerIds: ["tamer1"],
          activeExpeditions: [],
          teamPresets: [],
          favoriteCreatureIds: [],
          gachaPityCounters: {},
          dungeon: {
            highestStageCleared: 0,
            currentWave: 0,
            autoBattleEnabled: false,
            autoDgEnabled: false,
            speedMultiplier: 1,
            perfectStages: [],
            stageStars: {},
          },
          survivalHighestStageCleared: 0,
          dailyTasks: freshDailyTasks(),
          dailyTasksDate: todayDateString(),
          dailyBonusClaimed: false,
          achievements: [],
        }),

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      setHasReceivedGiftsV6: (received) => set({ hasReceivedGiftsV6: received }),
      setHasReceivedGiftsV7: (received) => set({ hasReceivedGiftsV7: received }),
      setHasReceivedGiftsV8: (received) => set({ hasReceivedGiftsV8: received }),
      setHasReceivedGiftsV9: (received) => set({ hasReceivedGiftsV9: received }),

      markStagePerfect: (stageId) =>
        set((state) => {
          if (state.dungeon.perfectStages.includes(stageId)) return state;
          return { dungeon: { ...state.dungeon, perfectStages: [...state.dungeon.perfectStages, stageId] } };
        }),

      markTutorialTipSeen: (id) =>
        set((state) => {
          if (state.seenTutorialTips.includes(id)) return state;
          return { seenTutorialTips: [...state.seenTutorialTips, id] };
        }),

      markStageAttempted: (baseStageId) =>
        set((state) => {
          if (state.attemptedStageIds.includes(baseStageId)) return state;
          return { attemptedStageIds: [...state.attemptedStageIds, baseStageId] };
        }),

      recordStageStars: (stageId, stars) =>
        set((state) => {
          const current = state.dungeon.stageStars[stageId] || { noDeaths: false, noItems: false, underFiveTurns: false };
          const next = {
            noDeaths: current.noDeaths || stars.noDeaths,
            noItems: current.noItems || stars.noItems,
            underFiveTurns: current.underFiveTurns || stars.underFiveTurns,
          };
          // Don't update if no change
          if (current.noDeaths === next.noDeaths && current.noItems === next.noItems && current.underFiveTurns === next.underFiveTurns) {
            return state;
          }
          return {
            dungeon: {
              ...state.dungeon,
              stageStars: { ...state.dungeon.stageStars, [stageId]: next },
            },
          };
        }),

      setActiveCreature: (creatureId) => set({ activeCreatureId: creatureId }),

      setPartySlot: (slotIndex, creatureId) =>
        set((state) => {
          const next = [...state.partyCreatureIds];
          // A creature can only occupy one slot at a time.
          for (let i = 0; i < next.length; i++) {
            if (next[i] === creatureId) next[i] = null;
          }
          next[slotIndex] = creatureId;
          return { partyCreatureIds: next };
        }),

      toggleHubTeamMember: (creatureId) =>
        set((state) => {
          const isMember = state.hubTeamIds.includes(creatureId);

          if (isMember) {
            const nextTeam = state.hubTeamIds.filter((id) => id !== creatureId);
            const activeCreatureId =
              state.activeCreatureId === creatureId
                ? nextTeam[0] ?? state.creatures[0]?.id ?? state.activeCreatureId
                : state.activeCreatureId;
            return { hubTeamIds: nextTeam, activeCreatureId };
          }

          if (state.hubTeamIds.length >= HUB_TEAM_SIZE) return state;
          return { hubTeamIds: [...state.hubTeamIds, creatureId] };
        }),


      gainCreatureExp: (creatureId, amount) => {
        set((state) => ({
          creatures: state.creatures.map((c) =>
            c.id === creatureId ? applyExpGain(c, amount) : c
          ),
        }));
      },
      trainSuperAttack: (creatureId) => {
        let success = false;
        set((state) => {
          const c = state.creatures.find(cr => cr.id === creatureId);
          if (!c || c.copies <= 1) return state; // Need at least 1 spare copy
          
          let maxLevel = 10;
          if (c.rarity === "SSR" || c.rarity === "Mythic") maxLevel = 15;
          if (c.rarity === "LR") maxLevel = 20;

          if (c.superAttackLevel >= maxLevel) return state;

          success = true;
          return {
            creatures: state.creatures.map(cr =>
              cr.id === creatureId
                ? { ...cr, copies: cr.copies - 1, superAttackLevel: cr.superAttackLevel + 1 }
                : cr
            )
          };
        });
        return success;
      },
      unlockPotentialNode: (creatureId, nodeId, orbCost, consumesDupe) => {
        let success = false;
        set((state) => {
          const c = state.creatures.find(cr => cr.id === creatureId);
          if (!c) return state;
          if (c.potentialNodes.includes(nodeId)) return state; // already unlocked
          if (consumesDupe && c.copies <= 1) return state; // not enough dupes

          // Check orbs
          const smallOrbId = `it-orb-small-${orbCost.element.toLowerCase()}`;
          const mediumOrbId = `it-orb-medium-${orbCost.element.toLowerCase()}`;
          const largeOrbId = `it-orb-large-${orbCost.element.toLowerCase()}`;

          const smallOrb = state.ownedItems.find(i => i.itemId === smallOrbId);
          const mediumOrb = state.ownedItems.find(i => i.itemId === mediumOrbId);
          const largeOrb = state.ownedItems.find(i => i.itemId === largeOrbId);

          if ((smallOrb?.quantity || 0) < orbCost.small) return state;
          if ((mediumOrb?.quantity || 0) < orbCost.medium) return state;
          if ((largeOrb?.quantity || 0) < orbCost.large) return state;

          // Deduct cost
          const nextItems = state.ownedItems.map(item => {
            if (item.itemId === smallOrbId) return { ...item, quantity: item.quantity - orbCost.small };
            if (item.itemId === mediumOrbId) return { ...item, quantity: item.quantity - orbCost.medium };
            if (item.itemId === largeOrbId) return { ...item, quantity: item.quantity - orbCost.large };
            return item;
          }).filter(i => i.quantity > 0);

          success = true;
          return {
            ownedItems: nextItems,
            creatures: state.creatures.map((cr) => {
              if (cr.id === creatureId) {
                return applyExpGain(
                  {
                    ...cr,
                    copies: consumesDupe ? cr.copies - 1 : cr.copies,
                    potentialNodes: [...cr.potentialNodes, nodeId],
                  },
                  0
                );
              }
              return cr;
            }),
          };
        });
        return success;
      },
      gainProfileExp: (amount) => {
        set((state) => ({ profile: applyProfileExpGain(state.profile, amount) }));
      },

      grantCreature: (creatureId, quantity = 1) => {
        const { creatures } = get();
        const existing = creatures.find((c) => c.id === creatureId);
        if (existing) {
          const copies = existing.copies + quantity;
          set({
            creatures: creatures.map((c) => (c.id === creatureId ? { ...c, copies } : c)),
          });
          return { isNew: false, copies };
        }
        const template = STARTER_CREATURES.find((c) => c.id === creatureId);
        if (!template) return null;
        set({ creatures: [...creatures, { ...template, copies: quantity, level: 1, exp: 0, expToNextLevel: expToNextLevelForLevel(1), superAttackLevel: 1, potentialNodes: [] }] });
        return { isNew: true, copies: quantity };
      },

      awakenCreature: (creatureId) => {
        const { creatures, ownedItems } = get();
        const creature = creatures.find((c) => c.id === creatureId);
        if (!creature || creature.rarity !== "SSR" || (creature.awakenLevel ?? 0) >= 1) return false;
        const owned = ownedItems.find((o) => o.itemId === "it-awaken-coin")?.quantity ?? 0;
        if (owned < AWAKEN_COST) return false;
        if (!get().consumeItem("it-awaken-coin", AWAKEN_COST)) return false;
        const { rarity, baseStats } = applyAwakenBump(creature.rarity, creature.baseStats);
        set({
          creatures: get().creatures.map((c) => (c.id === creatureId ? { ...c, rarity, baseStats, awakenLevel: 1 } : c)),
        });
        return true;
      },

      addGuildExp: (exp: number) => set((s) => {
        if (!s.guild) return {};
        return { guild: { ...s.guild, exp: s.guild.exp + exp } };
      }),

      saveTeamPreset: (id, name, creatureIds, mode) => set((s) => ({
        teamPresets: [...s.teamPresets, { id, name, creatureIds, mode }]
      })),

      deleteTeamPreset: (id) => set((s) => ({
        teamPresets: s.teamPresets.filter((p) => p.id !== id)
      })),

      toggleFavorite: (creatureId) => set((s) => ({
        favoriteCreatureIds: s.favoriteCreatureIds.includes(creatureId)
          ? s.favoriteCreatureIds.filter((id) => id !== creatureId)
          : [...s.favoriteCreatureIds, creatureId]
      })),

      setGachaPityCount: (currencyItemId, count) => set((s) => ({
        gachaPityCounters: { ...s.gachaPityCounters, [currencyItemId]: count },
      })),

      addGold: (amount) =>
        set((state) => ({
          currencies: { ...state.currencies, gold: state.currencies.gold + amount },
        })),

      spendGold: (amount) =>
        set((state) => ({ currencies: { ...state.currencies, gold: Math.max(0, state.currencies.gold - amount) } })),

      addGems: (amount) =>
        set((state) => ({
          currencies: { ...state.currencies, gems: state.currencies.gems + amount },
        })),

      spendGems: (amount) => {
        const { currencies } = get();
        if (currencies.gems < amount) return false;
        set({ currencies: { ...currencies, gems: currencies.gems - amount } });
        return true;
      },

      addSealCoins: (amount) =>
        set((state) => ({
          currencies: { ...state.currencies, sealCoins: state.currencies.sealCoins + amount },
        })),

      spendSealCoins: (amount) => {
        const { currencies } = get();
        if (currencies.sealCoins < amount) return false;
        set({ currencies: { ...currencies, sealCoins: currencies.sealCoins - amount } });
        return true;
      },

      spendEnergy: (amount) => {
        const { currencies } = get();
        if (currencies.energy < amount) return false;
        set({ currencies: { ...currencies, energy: currencies.energy - amount } });
        return true;
      },

      regenEnergy: (amount) =>
        set((state) => ({
          currencies: {
            ...state.currencies,
            energy: state.currencies.energy + amount,
          },
        })),

      tickEnergy: () =>
        set((state) => {
          if (state.currencies.energy >= state.currencies.energyMax) return state;
          const now = Date.now();
          const elapsed = now - state.currencies.lastEnergyTickAt;
          const tickMs = state.currencies.energyRegenMinutes * 60 * 1000;
          if (elapsed >= tickMs) {
            const ticks = Math.floor(elapsed / tickMs);
            
            let bonusEnergyMax = 0;
            if (state.guild && state.guild.level >= 5) {
              bonusEnergyMax = 30; // Level 5+ guild gives +30 energy cap
            }
            
            return {
              currencies: {
                ...state.currencies,
                energy: Math.min(state.currencies.energyMax + bonusEnergyMax, state.currencies.energy + ticks),
                lastEnergyTickAt: state.currencies.lastEnergyTickAt + ticks * tickMs,
              },
            };
          }
          return state;
        }),

      equipItem: (creatureId, equipmentId) =>
        set((state) => {
          const item = state.inventory.find((eq) => eq.id === equipmentId);
          if (!item) return state;
          return {
            inventory: state.inventory.map((eq) =>
              eq.id === equipmentId ? { ...eq, equippedTo: creatureId } : eq
            ),
            creatures: state.creatures.map((c) =>
              c.id === creatureId
                ? { ...c, equipment: { ...c.equipment, [item.slot]: equipmentId } }
                : c
            ),
          };
        }),

      unequipItem: (creatureId, equipmentId) =>
        set((state) => {
          const item = state.inventory.find((eq) => eq.id === equipmentId);
          if (!item) return state;
          return {
            inventory: state.inventory.map((eq) =>
              eq.id === equipmentId ? { ...eq, equippedTo: undefined } : eq
            ),
            creatures: state.creatures.map((c) => {
              if (c.id !== creatureId) return c;
              const nextEquipment = { ...c.equipment };
              delete nextEquipment[item.slot];
              return { ...c, equipment: nextEquipment };
            }),
          };
        }),

      enhanceEquipment: (equipmentId) =>
        set((state) => ({
          inventory: state.inventory.map((eq) =>
            eq.id === equipmentId && eq.enhancementLevel < 10
              ? { ...eq, enhancementLevel: eq.enhancementLevel + 1 }
              : eq
          ),
        })),

      equipTamerGear: (itemId) => set((state) => {
        const item = state.tamerInventory.find((t) => t.id === itemId);
        if (!item) return state;
        return {
          equippedTamerGear: { ...state.equippedTamerGear, [item.slot]: item.id },
        };
      }),

      unequipTamerGear: (slot) => set((state) => {
        const next = { ...state.equippedTamerGear };
        delete next[slot];
        return { equippedTamerGear: next };
      }),

      grantTamerEquipment: (itemId) => {
        const { tamerInventory } = get();
        if (tamerInventory.some((t) => t.id === itemId)) return false;
        const item = TAMER_EQUIPMENT_CATALOG.find((t) => t.id === itemId);
        if (!item) return false;
        set({ tamerInventory: [...tamerInventory, item] });
        return true;
      },

      craftTamerEquipment: (itemId) => {
        const { tamerInventory, currencies } = get();
        if (tamerInventory.some((t) => t.id === itemId)) return false;
        const item = TAMER_EQUIPMENT_CATALOG.find((t) => t.id === itemId);
        if (!item || item.source.kind !== "craft") return false;
        if (currencies.sealCoins < item.source.sealCoinCost) return false;
        set({
          currencies: { ...currencies, sealCoins: currencies.sealCoins - item.source.sealCoinCost },
          tamerInventory: [...tamerInventory, item],
        });
        return true;
      },

      grantItem: (itemId, quantity = 1) => {
        if (!ITEM_CATALOG.some((i) => i.id === itemId)) return;
        set((state) => {
          const existing = state.ownedItems.find((o) => o.itemId === itemId);
          const ownedItems = existing
            ? state.ownedItems.map((o) =>
                o.itemId === itemId ? { ...o, quantity: o.quantity + quantity } : o
              )
            : [...state.ownedItems, { itemId, quantity }];
          return { ownedItems, hasUnseenInventory: true };
        });
      },

      markInventorySeen: () => set({ hasUnseenInventory: false }),
      markCampaignSeen: () => set({ hasUnseenCampaign: false }),
      markTamerSeen: () => set({ hasUnseenTamer: false }),
      joinGuildLocally: (guildData) => set({ guild: guildData }),

      consumeItem: (itemId, quantity = 1) => {
        const { ownedItems } = get();
        const existing = ownedItems.find((o) => o.itemId === itemId);
        if (!existing || existing.quantity < quantity) return false;
        const nextQuantity = existing.quantity - quantity;
        set({
          ownedItems:
            nextQuantity > 0
              ? ownedItems.map((o) => (o.itemId === itemId ? { ...o, quantity: nextQuantity } : o))
              : ownedItems.filter((o) => o.itemId !== itemId),
        });
        return true;
      },

      sellItem: (itemId, quantity = 1) => {
        const item = ITEM_CATALOG.find((i) => i.id === itemId);
        if (!item?.sellPriceGold) return false;
        if (!get().consumeItem(itemId, quantity)) return false;
        get().addGold(item.sellPriceGold * quantity);
        return true;
      },

      sellCreature: (creatureId, quantity = 1) => {
        const { creatures, hubTeamIds, partyCreatureIds, teamPresets } = get();
        const creature = creatures.find((c) => c.id === creatureId);
        if (!creature || quantity < 1 || quantity > creature.copies) return false;

        // Only the LAST copy leaving actually matters for team references — a formation just
        // holds the creature's id, not a specific copy, so selling down to copies > 0 never
        // breaks anything already using it.
        const wouldRemoveLastCopy = creature.copies - quantity <= 0;
        if (wouldRemoveLastCopy) {
          const isReferenced =
            hubTeamIds.includes(creatureId) ||
            partyCreatureIds.includes(creatureId) ||
            teamPresets.some((p) => p.creatureIds.includes(creatureId));
          if (isReferenced) return false;
        }

        set((state) => ({
          creatures: wouldRemoveLastCopy
            ? state.creatures.filter((c) => c.id !== creatureId)
            : state.creatures.map((c) => (c.id === creatureId ? { ...c, copies: c.copies - quantity } : c)),
        }));
        get().addGold(creatureSellValue(creature) * quantity);
        return true;
      },

      buyListing: (listingId, quantity = 1) => {
        const listing = SHOP_LISTINGS.find((l) => l.id === listingId);
        if (!listing || quantity < 1) return false;
        const { currencies, ownedTamerIds, profile } = get();

        const { purchases: dailyPurchases, date: dailyDate } = ensureFreshShopPurchases(
          profile.dailyShopPurchases ?? {},
          profile.dailyShopPurchasesDate ?? ""
        );
        const { purchases: weeklyPurchases, date: weeklyDate } = ensureFreshWeeklyShopPurchases(
          profile.weeklyShopPurchases ?? {},
          profile.weeklyShopPurchasesDate ?? ""
        );
        const purchasedToday = dailyPurchases[listingId] || 0;
        const purchasedThisWeek = weeklyPurchases[listingId] || 0;
        const overDailyLimit = listing.dailyLimit !== undefined && purchasedToday + quantity > listing.dailyLimit;
        const overWeeklyLimit = listing.weeklyLimit !== undefined && purchasedThisWeek + quantity > listing.weeklyLimit;
        if (overDailyLimit || overWeeklyLimit) {
          // Still persist the reset(s) even on a failed attempt, same as consumeEventAttempt — a
          // new day/week's fresh {} shouldn't get lost just because this particular buy was
          // rejected.
          set((s) => ({
            profile: {
              ...s.profile,
              dailyShopPurchases: dailyPurchases,
              dailyShopPurchasesDate: dailyDate,
              weeklyShopPurchases: weeklyPurchases,
              weeklyShopPurchasesDate: weeklyDate,
            },
          }));
          return false;
        }

        const totalGold = (listing.price.gold ?? 0) * quantity;
        const totalGems = (listing.price.gems ?? 0) * quantity;

        if (totalGold && currencies.gold < totalGold) return false;
        if (totalGems && currencies.gems < totalGems) return false;
        if (totalGold) get().spendGold(totalGold);
        if (totalGems) get().spendGems(totalGems);

        if (listing.grants.kind === "item") {
          get().grantItem(listing.grants.itemId, (listing.grants.amount ?? 1) * quantity);
        } else if (listing.grants.kind === "creature") {
          get().grantCreature(listing.grants.creatureId, quantity);
        } else if (!ownedTamerIds.includes(listing.grants.tamerId)) {
          set({ ownedTamerIds: [...ownedTamerIds, listing.grants.tamerId] });
        }

        if (listing.dailyLimit !== undefined || listing.weeklyLimit !== undefined) {
          set((s) => ({
            profile: {
              ...s.profile,
              ...(listing.dailyLimit !== undefined && {
                dailyShopPurchasesDate: dailyDate,
                dailyShopPurchases: { ...dailyPurchases, [listingId]: purchasedToday + quantity },
              }),
              ...(listing.weeklyLimit !== undefined && {
                weeklyShopPurchasesDate: weeklyDate,
                weeklyShopPurchases: { ...weeklyPurchases, [listingId]: purchasedThisWeek + quantity },
              }),
            },
          }));
        }
        return true;
      },

      startExpedition: (defId, creatureIds) => {
        const def = EXPEDITION_DEFS.find((d) => d.id === defId);
        if (!def || creatureIds.length === 0 || creatureIds.length > 6) return null;
        const { activeExpeditions } = get();
        const busy = new Set(activeExpeditions.flatMap((e) => e.creatureIds));
        if (creatureIds.some((id) => busy.has(id))) return null;

        const expedition: ActiveExpedition = {
          id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          defId,
          creatureIds,
          startedAt: Date.now(),
          durationMs: def.durationMs,
        };
        set({ activeExpeditions: [...activeExpeditions, expedition] });
        return expedition;
      },

      collectExpedition: (expeditionId) => {
        const { activeExpeditions, creatures } = get();
        const expedition = activeExpeditions.find((e) => e.id === expeditionId);
        if (!expedition) return null;
        if (Date.now() < expedition.startedAt + expedition.durationMs) return null;
        const def = EXPEDITION_DEFS.find((d) => d.id === expedition.defId);
        if (!def) return null;

        set({ activeExpeditions: activeExpeditions.filter((e) => e.id !== expeditionId) });

        const sentCreatures = expedition.creatureIds
          .map((id) => creatures.find((c) => c.id === id))
          .filter((c): c is Creature => Boolean(c));
        const power = partyPower(sentCreatures);
        const chance = Math.min(
          98,
          Math.max(20, def.baseSuccessRate + ((power - def.requiredPower) / def.requiredPower) * 40)
        );
        const success = Math.random() * 100 < chance;
        if (!success) return { success: false, gold: 0, sealCoins: 0, items: [] };

        const gold = Math.round(def.rewardGoldMin + Math.random() * (def.rewardGoldMax - def.rewardGoldMin));
        get().addGold(gold);

        let sealCoins = 0;
        if (def.rewardSealCoinChance && Math.random() * 100 < def.rewardSealCoinChance) {
          sealCoins = 1;
          get().addSealCoins(1);
        }

        const items: { itemId: string; quantity: number }[] = [];
        for (const { itemId, chance: itemChance } of def.rewardItemChances) {
          if (Math.random() * 100 < itemChance) {
            get().grantItem(itemId, 1);
            items.push({ itemId, quantity: 1 });
          }
        }
        if (def.guaranteedTrainingItem) {
          const itemId = pickWeightedTrainingItemId();
          get().grantItem(itemId, 1);
          items.push({ itemId, quantity: 1 });
        }

        return { success: true, gold, sealCoins, items };
      },

      isOnExpedition: (creatureId) =>
        get().activeExpeditions.some((e) => e.creatureIds.includes(creatureId)),

      toggleAutoBattle: () =>
        set((state) => ({
          dungeon: { ...state.dungeon, autoBattleEnabled: !state.dungeon.autoBattleEnabled },
        })),

      toggleAutoDg: () =>
        set((state) => ({
          dungeon: { ...state.dungeon, autoDgEnabled: !state.dungeon.autoDgEnabled },
        })),

      setSpeedMultiplier: (speed) =>
        set((state) => ({ dungeon: { ...state.dungeon, speedMultiplier: speed } })),

      clearSurvivalStage: (stageNumber) =>
        set((state) => ({
          survivalHighestStageCleared: Math.max(state.survivalHighestStageCleared, stageNumber),
        })),

      clearDungeonStage: (stageNumber) =>
        set((state) => ({
          dungeon: {
            ...state.dungeon,
            highestStageCleared: Math.max(state.dungeon.highestStageCleared, stageNumber),
          },
        })),

      claimGift: (giftId) =>
        set((state) => {
          const gift = state.gifts.find((g) => g.id === giftId);
          if (!gift) return state;
          
          const newItems = [...state.ownedItems];
          if (gift.type === "item" && gift.itemId) {
            const existingIndex = newItems.findIndex((i) => i.itemId === gift.itemId);
            if (existingIndex !== -1) {
              newItems[existingIndex] = {
                ...newItems[existingIndex],
                quantity: newItems[existingIndex].quantity + gift.quantity
              };
            } else {
              newItems.push({ itemId: gift.itemId, quantity: gift.quantity });
            }
          }
          
          let newCreatures = state.creatures;
          if (gift.type === "creature" && gift.creatureId) {
            const existing = state.creatures.find((c) => c.id === gift.creatureId);
            if (existing) {
              // Immutable update — mutating the existing object in place left it aliased with
              // whatever else still held a reference to the pre-claim creature.
              newCreatures = state.creatures.map((c) =>
                c.id === gift.creatureId ? { ...c, copies: c.copies + gift.quantity } : c
              );
            } else {
              // Not owned yet — same catalog-entry construction grantCreature() uses. Admin-sent
              // gifts (see components/layout/GiftsModal.tsx) are the first real path that can hand
              // a brand-new creature this way.
              const template = STARTER_CREATURES.find((c) => c.id === gift.creatureId);
              if (template) {
                newCreatures = [
                  ...state.creatures,
                  { ...template, copies: gift.quantity, level: 1, exp: 0, expToNextLevel: expToNextLevelForLevel(1), superAttackLevel: 1, potentialNodes: [] },
                ];
              }
            }
          }
          
          return {
            gifts: state.gifts.filter((g) => g.id !== giftId),
            ownedItems: newItems,
            creatures: newCreatures
          };
        }),

      consumeEventAttempt: (eventId, maxAttempts) => {
        const state = get();
        const { attempts, date } = ensureFreshWeeklyEventAttempts(
          state.profile.dailyEventAttempts ?? {},
          state.profile.dailyEventAttemptsDate ?? ""
        );
        const currentAttempts = attempts[eventId] || 0;
        if (currentAttempts >= maxAttempts) {
          set((s) => ({ profile: { ...s.profile, dailyEventAttempts: attempts, dailyEventAttemptsDate: date } }));
          return false;
        }

        set((s) => ({
          profile: {
            ...s.profile,
            dailyEventAttemptsDate: date,
            dailyEventAttempts: {
              ...attempts,
              [eventId]: currentAttempts + 1,
            },
          },
        }));
        return true;
      },

      tickMissionProgress: (taskId, amount = 1) =>
        set((state) => {
          const { tasks, date, bonusClaimed } = ensureFreshDailyTasks(state.dailyTasks, state.dailyTasksDate, state.dailyBonusClaimed);
          return {
            dailyTasksDate: date,
            dailyBonusClaimed: bonusClaimed,
            dailyTasks: tasks.map((t) =>
              t.id === taskId && !t.claimed
                ? { ...t, progress: Math.min(t.target, t.progress + amount) }
                : t
            ),
          };
        }),

      unlockAchievement: (achievementId) => {
        const already = get().achievements.includes(achievementId);
        if (!already) set((state) => ({ achievements: [...state.achievements, achievementId] }));
        return !already;
      },

      claimTask: (taskId) =>
        set((state) => {
          const { tasks, date, bonusClaimed } = ensureFreshDailyTasks(state.dailyTasks, state.dailyTasksDate, state.dailyBonusClaimed);
          const task = tasks.find((t) => t.id === taskId);
          if (!task || task.claimed || task.progress < task.target) {
            return { dailyTasks: tasks, dailyTasksDate: date, dailyBonusClaimed: bonusClaimed };
          }
          return {
            dailyTasksDate: date,
            dailyBonusClaimed: bonusClaimed,
            dailyTasks: tasks.map((t) =>
              t.id === taskId ? { ...t, claimed: true } : t
            ),
            currencies: {
              ...state.currencies,
              gold: state.currencies.gold + (task.rewardGold ?? 0),
              gems: state.currencies.gems + (task.rewardGems ?? 0),
            },
          };
        }),

      claimDailyBonus: () => {
        let granted = false;
        set((state) => {
          const { tasks, date, bonusClaimed } = ensureFreshDailyTasks(state.dailyTasks, state.dailyTasksDate, state.dailyBonusClaimed);
          if (bonusClaimed || !tasks.every((t) => t.claimed)) {
            return { dailyTasks: tasks, dailyTasksDate: date, dailyBonusClaimed: bonusClaimed };
          }
          granted = true;
          return {
            dailyTasksDate: date,
            dailyTasks: tasks,
            dailyBonusClaimed: true,
            currencies: {
              ...state.currencies,
              gold: state.currencies.gold + DAILY_BONUS_GOLD,
              gems: state.currencies.gems + DAILY_BONUS_GEMS,
            },
          };
        });
        return granted;
      },
    }),
    {
      name: "monster-gacha-save",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Creatures and equipment are mostly design/content data we control from code —
      // always take the latest definitions on load so name, sprite, or skill changes
      // show up immediately instead of being shadowed by whatever shape happened to be
      // cached in the browser from an earlier session. Level/EXP/stat growth and gear
      // assignment ARE real player progress though, so those are preserved per id.
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState;
        const persisted = persistedState as Partial<GameState>;
        const merged: GameState = { ...currentState, ...persisted };

        // Same reasoning as the creatures fixup below — a persisted profile.expToNextLevel can go
        // stale relative to the current curve (see expToNextLevelForLevel's doc comment).
        if (merged.profile) {
          merged.profile = { ...merged.profile, expToNextLevel: expToNextLevelForLevel(merged.profile.level) };
        }

        if (!persisted.hasReceivedLaunchTicketsV3) {
          merged.gifts = [
            ...(merged.gifts || []),
            { id: "gift-v3-mythic", type: "item", itemId: "it-mythic-ticket", quantity: 40, message: "Mythic Celebration (Apology)", createdAt: Date.now() },
            { id: "gift-v3-legendary", type: "item", itemId: "it-legendary-ticket", quantity: 40, message: "Special LR Event! (Apology)", createdAt: Date.now() }
          ];
          merged.hasReceivedLaunchTicketsV3 = true;
        }

        // Only the creatures this account actually owns get persisted — refresh their
        // definition (name/sprite/skills/...) from the current catalog by id, but never
        // add catalog entries back in just because they exist in code (a real account's
        // roster is whatever the player owns, not "everything we've ever designed").
        const catalogById = new Map(STARTER_CREATURES.map((c) => [c.id, c]));
        merged.creatures = (persisted.creatures ?? [])
          .map((saved): Creature | undefined => {
            const base = catalogById.get(saved.id);
            if (!base) return undefined;
            // rarity is otherwise always refreshed from the pristine catalog (see the comment
            // above) — Awaken is the one exception, reapplying its bump on top of that fresh
            // rarity/baseStats each time, the same as the server-hydrate path in
            // bundleToStateFields above. baseStats itself doesn't need the same treatment here:
            // `saved.baseStats` below already IS the already-bumped value, since it's a straight
            // read of whatever this account's own last-persisted state actually was.
            const awakenLevel = saved.awakenLevel ?? 0;
            const rarity = awakenLevel >= 1 ? applyAwakenBump(base.rarity, base.baseStats).rarity : base.rarity;
            const newCreature: Creature = {
              id: base.id,
              name: base.name,
              element: base.element,
              rarity,
              level: 1,
              exp: 0,
              expToNextLevel: nextLevelExpRequirement(0, 1),
              stage: base.stage,
              spriteKey: base.spriteKey,
              spriteFolder: base.spriteFolder,
              baseStats: { ...base.baseStats },
              skills: base.skills.map((s) => ({ ...s })),
              // Explicitly whitelisted like every other field here rather than spread from
              // `base` (see the comment above) — easy to forget when a new Creature field is
              // added (this one was, for a session), so keep it in sync with types/game.ts.
              ultimateSkill: base.ultimateSkill,
              animationFrames: base.animationFrames,
              equipment: {},
              copies: 1,
              superAttackLevel: 1,
              potentialNodes: [],
            };
            return {
              ...newCreature,
              level: saved.level,
              exp: saved.exp,
              // Not saved.expToNextLevel — see expToNextLevelForLevel's doc comment.
              expToNextLevel: expToNextLevelForLevel(saved.level),
              baseStats: saved.baseStats,
              equipment: saved.equipment,
              copies: saved.copies,
              superAttackLevel: saved.superAttackLevel ?? 1,
              potentialNodes: saved.potentialNodes ?? [],
              awakenLevel,
            };
          })
          .filter((c): c is Creature => c !== undefined);

        // Same rule as creatures above: only equipment this account actually owns is
        // kept, refreshed by id from the current content definitions. Real accounts
        // don't own any starter gear yet (equipment isn't wired up server-side), so
        // this intentionally stays empty for them instead of showing demo items.
        const catalogEquipmentById = new Map(STARTER_EQUIPMENT.map((e) => [e.id, e]));
        merged.inventory = (persisted.inventory ?? []).map((saved) => {
          const item = catalogEquipmentById.get(saved.id);
          return item
            ? { ...item, enhancementLevel: saved.enhancementLevel, equippedTo: saved.equippedTo }
            : saved;
        });

        // Tamer gear has no per-owner mutable fields (no level/exp) — just re-resolve each
        // owned id against the current catalog, dropping any that no longer exist.
        const tamerCatalogById = new Map(TAMER_EQUIPMENT_CATALOG.map((t) => [t.id, t]));
        merged.tamerInventory = (persisted.tamerInventory ?? [])
          .map((saved) => tamerCatalogById.get(saved.id))
          .filter((t): t is TamerEquipment => t !== undefined);

        // Migration/loading for equippedTamerGear
        if (persisted.equippedTamerGear === undefined) {
          merged.equippedTamerGear = merged.tamerInventory.reduce((acc, gear) => {
            acc[gear.slot] = gear.id;
            return acc;
          }, {} as Partial<Record<TamerSlotType, string>>);
        } else {
          const validIds = new Set(merged.tamerInventory.map((t) => t.id));
          const loadedGear: Partial<Record<TamerSlotType, string>> = {};
          for (const [slot, id] of Object.entries(persisted.equippedTamerGear)) {
            if (id && validIds.has(id)) {
              loadedGear[slot as TamerSlotType] = id;
            }
          }
          merged.equippedTamerGear = loadedGear;
        }

        // Defends against a pre-sealCoins localStorage snapshot, where persisted.currencies
        // exists but has no sealCoins field at all (would otherwise merge in as undefined).
        merged.currencies = { ...merged.currencies, sealCoins: merged.currencies.sealCoins ?? 0 };

        // Generic items, same re-resolve-by-id rule as tamerInventory above — drop any id that
        // no longer exists in ITEM_CATALOG.
        const itemCatalogById = new Set(ITEM_CATALOG.map((i) => i.id));
        merged.ownedItems = (persisted.ownedItems ?? []).filter((o) => itemCatalogById.has(o.itemId));
        // Defends against a pre-Inventory localStorage snapshot with no hasUnseenInventory field.
        merged.hasUnseenInventory = persisted.hasUnseenInventory ?? false;

        // Defends against a pre-Tamer-avatar/Expeditions localStorage snapshot with none of these
        // fields at all.
        merged.equippedTamerId = persisted.equippedTamerId ?? "tamer1";
        merged.ownedTamerIds = persisted.ownedTamerIds?.length ? persisted.ownedTamerIds : ["tamer1"];
        merged.activeExpeditions = persisted.activeExpeditions ?? [];

        if (merged.dungeon) {
          merged.dungeon = { ...currentState.dungeon, ...merged.dungeon };
          merged.dungeon.perfectStages = merged.dungeon.perfectStages ?? [];
          merged.dungeon.stageStars = merged.dungeon.stageStars ?? {};
        }

        return merged;
      },
    }
  )
);

export const useActiveCreature = () =>
  useGameStore((state) =>
    state.creatures.find((c) => c.id === state.activeCreatureId) ?? state.creatures[0]
  );
