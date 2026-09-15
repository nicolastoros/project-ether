import type { Creature, DungeonStage, TamerEquipment } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { ACHIEVEMENTS, cumulativeStageCountThroughWorld, DUNGEON_STAGES, pickWeightedTrainingItemId, TAMER_EQUIPMENT_CATALOG } from "@/lib/gameData";
import { notifyAchievementUnlocked } from "@/lib/achievementNotify";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import { isFinalAreaOfChapter } from "@/lib/campaignChapters";
import { getTamerExpMultiplierBonus } from "@/lib/tamerBuffs";
import {
  grantCreatureOnServer,
  grantItemOnServer,
  grantTamerEquipmentOnServer,
  syncProgressToServer,
  unlockAchievementOnServer,
} from "@/lib/syncProgress";
import { addGuildExpAction } from "@/app/actions/guild";
import type { CreatureResultEntry, TamerResultEntry } from "@/components/combat/BattleResultScreen";

export interface StageRewardParams {
  stage: DungeonStage;
  /** The party as picked at team-select — used for exp gain and displaying per-creature results,
   * same "original unbuffed" list BattleScreen.tsx already threads through its own reward block. */
  playerCreatures: Creature[];
  isEventBattle: boolean;
  /** Caller's own currently-equipped Tamer gear (for the Wind Set Effect's EXP bonus check). */
  activeTamerGear: TamerEquipment[];
  guild: ReturnType<typeof useGameStore.getState>["guild"];
}

export interface StageRewardResult {
  rewardMultiplier: number;
  isExpEventStage: boolean;
  tamerResult: TamerResultEntry;
  creatureResults: CreatureResultEntry[];
  sealCoinsDropped: number;
  itemsDropped: { itemId: string; quantity: number }[];
  firstClearGift: { isNew: boolean; copies: number } | null;
  tamerGearGranted: string | null;
  isFirstClearOfThisStage: boolean;
}

// One-time welcome gift for clearing World 1-1 for the very first time — see the
// isFirstStage1Clear check below. Admins already own every creature, so grantCreature() is simply
// a no-op for them. Kept here (not re-exported) since this is the only place it's used now that
// the reward block lives in one place instead of two.
const FIRST_CLEAR_GIFT_CREATURE_ID = "cr-dragoon";

/** Grants every Campaign-stage-clear reward (gold/exp, first-clear 2x, Exchange/Awaken Coins,
 * Tamer gear, the first-clear creature gift, achievement checks, item drops, guild EXP) and
 * syncs to the server — extracted from BattleScreen.tsx's settle() so BattleScreen.tsx and
 * SweepScreen.tsx (the instant-clear path) grant identical rewards instead of Sweep's previous,
 * independently-reimplemented and incomplete version. Call this BEFORE the caller's own
 * recordStageStars/markStagePerfect writes, if it has any — this function reads
 * dungeon.stageStars[stage.id] itself (before mutating anything) to determine
 * isFirstClearOfThisStage, so a prior write to that same stage id would make every clear look
 * like a repeat. Not itself a React hook — safe to call from a plain event handler or effect. */
export function grantStageRewards({
  stage,
  playerCreatures,
  isEventBattle,
  activeTamerGear,
  guild,
}: StageRewardParams): StageRewardResult {
  const store = useGameStore.getState();
  const highestBefore = store.dungeon.highestStageCleared;
  // Keyed off this exact stage id (so it's correct per difficulty tier, not just per base stage
  // number) rather than highestStageCleared, which only ever tracks Easy-tier progress. Always
  // false for event battles — that "first clear" bonus track (2x gold/exp, Exchange Coins, Tamer
  // gear) is Campaign-only. Read before any of this function's own writes below.
  const wasStageAlreadyCleared = isEventBattle ? false : Boolean(store.dungeon.stageStars[stage.id]);
  const isFirstClearOfThisStage = !isEventBattle && !wasStageAlreadyCleared;
  const rewardMultiplier = isFirstClearOfThisStage ? 2 : 1;

  const isExpEventStage = !isEventBattle && stage.id === getDailyExpEventStageId(stage.world, DUNGEON_STAGES);
  // Wind's "EXP +100%" Set Effect (only when every Wind piece is equipped) stacks with the
  // existing first-clear/exp-event multipliers rather than replacing them.
  const expMultiplier = rewardMultiplier * (isExpEventStage ? 2 : 1) * (1 + getTamerExpMultiplierBonus(activeTamerGear));

  store.addGold(stage.rewardGold * rewardMultiplier);
  const expGainAmount = stage.rewardExp * expMultiplier;
  const levelsBefore = new Map(playerCreatures.map((c) => [c.id, c.level]));
  const tamerBefore = store.profile;
  playerCreatures.forEach((c) => store.gainCreatureExp(c.id, expGainAmount));
  store.gainProfileExp(expGainAmount);
  const updatedCreatures = useGameStore.getState().creatures;
  const tamerAfter = useGameStore.getState().profile;
  const tamerResult: TamerResultEntry = {
    expGained: expGainAmount,
    levelBefore: tamerBefore.level,
    levelAfter: tamerAfter.level,
    exp: tamerAfter.exp,
    expToNextLevel: tamerAfter.expToNextLevel,
  };
  const creatureResults: CreatureResultEntry[] = playerCreatures.map((c) => {
    const updated = updatedCreatures.find((uc) => uc.id === c.id);
    return {
      creature: c,
      expGained: expGainAmount,
      levelBefore: levelsBefore.get(c.id) ?? c.level,
      levelAfter: updated?.level ?? c.level,
      exp: updated?.exp ?? c.exp,
      expToNextLevel: updated?.expToNextLevel ?? c.expToNextLevel,
    };
  });

  // Easy-tier clears are the only thing allowed to advance the base 54-stage counter
  // CampaignHome.tsx's stage-lock logic depends on — a Hard/Super run of an already-unlocked
  // stage must never touch it.
  const isEasyTier = !stage.tier || stage.tier === "Easy";
  const isFirstStage1Clear = !isEventBattle && isEasyTier && stage.stageNumber === 1 && highestBefore === 0;
  if (isEasyTier && !isEventBattle) store.clearDungeonStage(stage.stageNumber);
  store.tickMissionProgress("task-dungeon");
  // "Explorer of the Digital World" — cleared every stage through World 5. Checked against this
  // stage's own number rather than the post-clear highestStageCleared so a lower-stage replay
  // after already clearing World 5 doesn't matter either way.
  if (!isEventBattle && stage.stageNumber >= cumulativeStageCountThroughWorld(5)) {
    const achievementId = "ach-explorer-digital-world";
    if (store.unlockAchievement(achievementId)) {
      unlockAchievementOnServer(achievementId);
      const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
      if (achievement) notifyAchievementUnlocked(achievement);
    }
  }

  let firstClearGift: { isNew: boolean; copies: number } | null = null;
  if (isFirstStage1Clear) {
    const gift = store.grantCreature(FIRST_CLEAR_GIFT_CREATURE_ID);
    if (gift) {
      firstClearGift = gift;
      grantCreatureOnServer(FIRST_CLEAR_GIFT_CREATURE_ID);
    }
  }

  let sealCoinsDropped = 0;
  if (Math.random() * 100 < stage.equipmentDropChance) {
    sealCoinsDropped = 1;
    store.addSealCoins(1);
  }

  const itemsDropped: { itemId: string; quantity: number }[] = [];

  // Exchange Coins: 2 per area, per difficulty tier, the first time that exact tier is cleared —
  // a 4-tier area yields 8 one-time. Chapter-agnostic (keyed off stage.id, which already encodes
  // both the area and the tier), so this covers every chapter automatically.
  if (isFirstClearOfThisStage) {
    store.grantItem("it-exchange-coin", 2);
    grantItemOnServer("it-exchange-coin", 2);
    itemsDropped.push({ itemId: "it-exchange-coin", quantity: 2 });
  }

  // Awaken Coins: 1-5 random, every time a chapter's boss area is beaten (not gated by
  // first-clear — a boss re-run still pays out, same as a Raid win). Campaign-only.
  if (!isEventBattle && isFinalAreaOfChapter(stage.world, stage.worldStageNumber)) {
    const awakenCoins = 1 + Math.floor(Math.random() * 5);
    store.grantItem("it-awaken-coin", awakenCoins);
    grantItemOnServer("it-awaken-coin", awakenCoins);
    itemsDropped.push({ itemId: "it-awaken-coin", quantity: awakenCoins });
  }

  let tamerGearGranted: string | null = null;
  if (isFirstClearOfThisStage) {
    const tamerPiece = TAMER_EQUIPMENT_CATALOG.find(
      (t) => t.source.kind === "campaign-clear" && t.source.stageId === stage.id
    );
    if (tamerPiece && store.grantTamerEquipment(tamerPiece.id)) {
      tamerGearGranted = tamerPiece.name;
      grantTamerEquipmentOnServer(tamerPiece.id);
    }
  }

  const drop = (itemId: string, chance: number) => {
    if (Math.random() * 100 < chance) {
      store.grantItem(itemId, 1);
      grantItemOnServer(itemId, 1);
      itemsDropped.push({ itemId, quantity: 1 });
    }
  };

  if (stage.eventRewards) {
    // Event logic: guarantee event rewards
    for (const reward of stage.eventRewards) {
      store.grantItem(reward.itemId, reward.amount);
      grantItemOnServer(reward.itemId, reward.amount);
      itemsDropped.push({ itemId: reward.itemId, quantity: reward.amount });
    }
  } else {
    // Normal campaign logic
    drop("it-rotten-egg", 35);
    drop("it-chicken", 20);
    if (Math.random() * 100 < stage.equipmentDropChance) {
      drop(pickWeightedTrainingItemId(), 100);
    }

    if (isFirstClearOfThisStage && stage.world === 1 && isFinalAreaOfChapter(1, stage.worldStageNumber)) {
      store.grantItem("it-frontier-emblem", 1);
      grantItemOnServer("it-frontier-emblem", 1);
      itemsDropped.push({ itemId: "it-frontier-emblem", quantity: 1 });
    }
  }

  if (guild) {
    addGuildExpAction(guild.id, stage.rewardExp).catch(() => {});
  }

  syncProgressToServer();

  return {
    rewardMultiplier,
    isExpEventStage,
    tamerResult,
    creatureResults,
    sealCoinsDropped,
    itemsDropped,
    firstClearGift,
    tamerGearGranted,
    isFirstClearOfThisStage,
  };
}
