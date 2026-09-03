"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown, Zap } from "lucide-react";
import type { Creature, DungeonStage, Skill, StatusEffectType } from "@/types/game";
import { CreatureSprite, type Direction } from "@/components/ui/CreatureSprite";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LegendaryCardAura } from "@/components/ui/MythicCardAura";
import { useGameStore } from "@/lib/store";
import { ACHIEVEMENTS, cumulativeStageCountThroughWorld, DUNGEON_STAGES, pickWeightedTrainingItemId, TAMER_EQUIPMENT_CATALOG } from "@/lib/gameData";
import { notifyAchievementUnlocked } from "@/lib/achievementNotify";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import { applyTamerBuffs } from "@/lib/tamerBuffs";
import {
  grantCreatureOnServer,
  grantItemOnServer,
  grantTamerEquipmentOnServer,
  syncProgressToServer,
  unlockAchievementOnServer,
} from "@/lib/syncProgress";
import { addGuildExpAction } from "@/app/actions/guild";
import {
  applyAction,
  createCombatant,
  getSkillTargetMode,
  getUltimateSkill,
  nextLogId,
  pickEnemyAction,
  resonanceCostForSkill,
  type BattleCombatant,
  type BattleLogEntry,
} from "@/lib/combat";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { SKILL_TYPE_STYLES } from "@/components/monsters/CreatureDetailModal";
import { CombatantCard, STATUS_BADGE } from "./CombatantCard";
import { BattleResultScreen, type CreatureResultEntry, type TamerResultEntry } from "./BattleResultScreen";
import { cn } from "@/lib/utils";

// One arena background per world with real battle content — each is the same portrait dimensions
// with 4 stone-circle markers in identical spots (see ARENA_SLOTS below), so a new world's
// background is a drop-in as long as it follows that same layout.
const ARENA_BACKGROUNDS: Record<number, string> = {
  1: "/assets/maps/battle_field_test1.png",
  2: "/assets/campaign/world2.jpg",
  3: "/assets/maps/w3.png",
  4: "/assets/maps/w4.png",
  5: "/assets/maps/w5.png",
};
// One-time welcome gift for clearing World 1-1 for the very first time — see the isFirstStage1Clear
// check below. Admins already own every creature, so grantCreature() is simply a no-op for them.
const FIRST_CLEAR_GIFT_CREATURE_ID = "cr-dragoon";
const FIRST_CLEAR_GIFT_CREATURE_NAME = "Dragoon";
const ARENA_SLOTS: { side: "player" | "enemy"; index: 0 | 1; left: string; top: string; direction: Direction }[] = [
  { side: "player", index: 0, left: "25%", top: "40%", direction: "south-east" },
  { side: "player", index: 1, left: "15%", top: "50%", direction: "south-east" },
  { side: "enemy", index: 0, left: "75%", top: "35%", direction: "south-west" },
  { side: "enemy", index: 1, left: "85%", top: "45%", direction: "south-west" },
];

// Desktop-only flanking roster card — allies to the left, enemies to the right, so name/level/HP
// is legible outside the busy arena art instead of only as tiny overlay text on the sprite itself.
function CombatantPlate({
  combatant,
  align,
  isActingTurn,
  className,
}: {
  combatant: BattleCombatant;
  align: "left" | "right";
  isActingTurn: boolean;
  className?: string;
}) {
  const { creature } = combatant;
  const hpPercent = Math.round((combatant.currentHp / combatant.maxHp) * 100);
  const resonancePercent = Math.round((combatant.resonance / combatant.resonanceMax) * 100);
  const activeStatuses = (Object.keys(combatant.statusEffects) as StatusEffectType[]).filter(
    (type) => (combatant.statusEffects[type] ?? 0) > 0
  );

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border-2 bg-black/80 p-2 shadow-md backdrop-blur-md transition-colors w-40 sm:w-48 xl:w-56",
        align === "right" && "flex-row-reverse",
        isActingTurn ? "border-gold shadow-[0_0_16px_-2px_rgba(255,184,77,0.5)]" : "border-white/20",
        !combatant.isAlive && "opacity-50 grayscale",
        className
      )}
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/50">
        <CreatureSprite
          creature={creature}
          direction={align === "left" ? "south-east" : "south-west"}
          className="h-8 w-8"
        />
        {activeStatuses.length > 0 && (
          <span className={cn("absolute -top-1.5 flex gap-0.5", align === "right" ? "-left-1.5" : "-right-1.5")}>
            {activeStatuses.map((type) => {
              const badge = STATUS_BADGE[type];
              const Icon = badge.icon;
              return (
                <span
                  key={type}
                  title={type}
                  className={cn("flex h-4 w-4 items-center justify-center rounded-full border border-arcade-border text-white", badge.className)}
                >
                  <Icon className="h-2.5 w-2.5" />
                </span>
              );
            })}
          </span>
        )}
      </div>
      <div className={cn("min-w-0 flex-1", align === "right" && "text-right")}>
        <p className="truncate text-[10px] sm:text-xs font-bold text-white">{creature.name}</p>
        <p className="text-[9px] sm:text-[10px] text-zinc-300">Lv.{creature.level}</p>
        <ProgressBar percent={hpPercent} color="hp" label={`${combatant.currentHp}/${combatant.maxHp}`} className="mt-1" />
        <ProgressBar percent={resonancePercent} color="resonance" className="mt-0.5" />
      </div>
    </div>
  );
}

interface BattleScreenProps {
  stage: DungeonStage;
  /** 1 or 2 creatures — Campaign no longer requires a full 2v2 lineup. */
  playerCreatures: Creature[];
  enemyCreatures: [Creature, Creature];
  onRematch: () => void;
  onExit: () => void;
}

type BattlePhase = "active" | "victory" | "defeat";

function buildInitialCombatants(playerCreatures: Creature[], enemyCreatures: [Creature, Creature]): BattleCombatant[] {
  return [
    ...playerCreatures.map((creature, i) => createCombatant(creature, "player", i)),
    createCombatant(enemyCreatures[0], "enemy", 0),
    createCombatant(enemyCreatures[1], "enemy", 1),
  ];
}

export function BattleScreen({ stage, playerCreatures, enemyCreatures, onRematch, onExit }: BattleScreenProps) {
  const addGold = useGameStore((s) => s.addGold);
  const gainCreatureExp = useGameStore((s) => s.gainCreatureExp);
  const gainProfileExp = useGameStore((s) => s.gainProfileExp);
  const clearDungeonStage = useGameStore((s) => s.clearDungeonStage);
  const tickMissionProgress = useGameStore((s) => s.tickMissionProgress);
  const unlockAchievement = useGameStore((s) => s.unlockAchievement);
  const grantCreature = useGameStore((s) => s.grantCreature);
  const recordStageStars = useGameStore((s) => s.recordStageStars);
  const addSealCoins = useGameStore((s) => s.addSealCoins);
  const grantTamerEquipment = useGameStore((s) => s.grantTamerEquipment);
  const grantItem = useGameStore((s) => s.grantItem);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);
  const equippedTamerGear = useGameStore((s) => s.equippedTamerGear);
  const guild = useGameStore((s) => s.guild);

  // Buffed once at battle start (not reactively — mid-fight gear changes shouldn't retroactively
  // rescale an in-progress combatant's stats). gainCreatureExp/etc. below still use the original
  // unbuffed playerCreatures since only their ids matter there, not baseStats.
  const buffedPlayerCreatures = useMemo(() => {
    const equippedGearIds = new Set(Object.values(equippedTamerGear).filter(Boolean));
    const activeGear = tamerInventory.filter((gear) => equippedGearIds.has(gear.id));

    return playerCreatures.map((c) =>
      applyTamerBuffs(
        c,
        activeGear,
        equippedTamerId,
        useGameStore.getState().profile.level,
        guild?.level
      )
    );
  }, [playerCreatures, tamerInventory, equippedTamerGear, equippedTamerId, guild?.level]);
  const [combatants, setCombatants] = useState<BattleCombatant[]>(() =>
    buildInitialCombatants(buffedPlayerCreatures, enemyCreatures)
  );
  const turnOrder = useMemo(
    () => [...combatants].sort((a, b) => b.creature.baseStats.spd - a.creature.baseStats.spd).map((c) => c.uid),
    // Fixed once at battle start — SPD-based turn order stays stable for the whole fight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [turnPointer, setTurnPointer] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [hasDeaths, setHasDeaths] = useState(false);
  const [phase, setPhase] = useState<BattlePhase>("active");
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([
    { id: nextLogId(), kind: "info", message: `${stage.name} — battle start!` },
  ]);
  const [rewardGranted, setRewardGranted] = useState(false);
  const [firstClearGift, setFirstClearGift] = useState<{ isNew: boolean; copies: number } | null>(null);
  const [rewardMultiplier, setRewardMultiplier] = useState(1);
  const [isExpEventStage, setIsExpEventStage] = useState(false);
  const [sealCoinsDropped, setSealCoinsDropped] = useState(0);
  const [tamerGearGranted, setTamerGearGranted] = useState<string | null>(null);
  const [itemsDropped, setItemsDropped] = useState<{ itemId: string; quantity: number }[]>([]);
  const [creatureResults, setCreatureResults] = useState<CreatureResultEntry[]>([]);
  const [tamerResult, setTamerResult] = useState<TamerResultEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [starsEarned, setStarsEarned] = useState<{ noDeaths: boolean; noItems: boolean; underFiveTurns: boolean } | null>(null);
  const [attackEvent, setAttackEvent] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });
  const [hitEvent, setHitEvent] = useState<{ uids: string[]; nonce: number }>({ uids: [], nonce: 0 });
  // uid of the combatant currently charging/unleashing an Ultimate Attack — see resolveTurn's
  // isUltimate branch, which holds this set for the charge-up delay before damage lands.
  const [activeUltimateUid, setActiveUltimateUid] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });
  const logEndRef = useRef<HTMLDivElement>(null);
  // Wall-clock battle start — captured once (in an effect, not during render, per the
  // react-hooks/purity rule against calling Date.now() directly in a render body), used to
  // compute elapsedSeconds on victory.
  const battleStartRef = useRef<number | null>(null);
  useEffect(() => {
    battleStartRef.current = Date.now();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  const actorUid = turnOrder[turnPointer];
  const actor = combatants.find((c) => c.uid === actorUid) ?? null;
  const isPlayerTurn = phase === "active" && actor?.side === "player";

  function resolveTurn(byUid: string, skill: Skill, explicitTargetUid: string | null) {
    const { combatants: next, logs, hitUids } = applyAction(combatants, byUid, skill, explicitTargetUid);
    const actingCombatant = combatants.find((c) => c.uid === byUid);
    const isUltimate = actingCombatant?.creature.ultimateSkill?.id === skill.id;

    const finalize = () => {
      if (skill.type === "Attack") {
        setAttackEvent((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
      }
      if (hitUids.length > 0) {
        setHitEvent((prev) => ({ uids: hitUids, nonce: prev.nonce + 1 }));
      }

      // Check for deaths
      const anyDeaths = next.some(c => c.side === "player" && !c.isAlive);
      if (anyDeaths) setHasDeaths(true);

      setCombatants(next);
      setLog((prev) => [...prev, ...logs]);
      setPendingSkill(null);

      const enemiesAlive = next.some((c) => c.side === "enemy" && c.isAlive);
      const playersAlive = next.some((c) => c.side === "player" && c.isAlive);

      if (!enemiesAlive) {
      setPhase("victory");
      setLog((prev) => [...prev, { id: nextLogId(), kind: "info", message: "Victory! All enemies defeated." }]);
      
      const isPerfectClear = playersAlive && next.filter(c => c.side === "player").every(c => c.isAlive);
      if (isPerfectClear) {
        useGameStore.getState().markStagePerfect(stage.id);
      }

      // Captured before recordStageStars writes below — that call itself would make this exact
      // id "already present", so the first-clear check has to run first.
      const wasStageAlreadyCleared = Boolean(useGameStore.getState().dungeon.stageStars[stage.id]);

      const stars = {
        noDeaths: !(hasDeaths || anyDeaths),
        noItems: true,
        underFiveTurns: turnCount < 5,
      };
      setStarsEarned(stars);
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - (battleStartRef.current ?? Date.now())) / 1000)));
      recordStageStars(stage.id, stars);

      if (!rewardGranted) {
        setRewardGranted(true);
        const highestBefore = useGameStore.getState().dungeon.highestStageCleared;
        // Keyed off this exact stage id (so it's correct per difficulty tier, not just per base
        // stage number) rather than highestStageCleared, which only ever tracks Easy-tier
        // progress.
        const isFirstClearOfThisStage = !wasStageAlreadyCleared;
        const multiplier = isFirstClearOfThisStage ? 2 : 1;
        setRewardMultiplier(multiplier);

        const expEventActive = stage.id === getDailyExpEventStageId(stage.world, DUNGEON_STAGES);
        setIsExpEventStage(expEventActive);
        const expMultiplier = multiplier * (expEventActive ? 2 : 1);

        addGold(stage.rewardGold * multiplier);
        const expGainAmount = stage.rewardExp * expMultiplier;
        const levelsBefore = new Map(playerCreatures.map((c) => [c.id, c.level]));
        const tamerBefore = useGameStore.getState().profile;
        playerCreatures.forEach((c) => gainCreatureExp(c.id, expGainAmount));
        gainProfileExp(expGainAmount);
        const updatedCreatures = useGameStore.getState().creatures;
        const tamerAfter = useGameStore.getState().profile;
        setTamerResult({
          expGained: expGainAmount,
          levelBefore: tamerBefore.level,
          levelAfter: tamerAfter.level,
          exp: tamerAfter.exp,
          expToNextLevel: tamerAfter.expToNextLevel,
        });
        setCreatureResults(
          playerCreatures.map((c) => {
            const updated = updatedCreatures.find((uc) => uc.id === c.id);
            return {
              creature: c,
              expGained: expGainAmount,
              levelBefore: levelsBefore.get(c.id) ?? c.level,
              levelAfter: updated?.level ?? c.level,
              exp: updated?.exp ?? c.exp,
              expToNextLevel: updated?.expToNextLevel ?? c.expToNextLevel,
            };
          })
        );
        // Easy-tier clears are the only thing allowed to advance the base 54-stage counter
        // CampaignHome.tsx's stage-lock logic depends on — a Hard/Super run of an already-unlocked
        // stage must never touch it.
        const isEasyTier = !stage.tier || stage.tier === "Easy";
        const isFirstStage1Clear = isEasyTier && stage.stageNumber === 1 && highestBefore === 0;
        if (isEasyTier) clearDungeonStage(stage.stageNumber);
        tickMissionProgress("task-dungeon");
        // "Explorer of the Digital World" — cleared every stage through World 5. Checked against
        // this stage's own number rather than the post-clear highestStageCleared so a lower-stage
        // replay after already clearing World 5 doesn't matter either way.
        if (stage.stageNumber >= cumulativeStageCountThroughWorld(5)) {
          const achievementId = "ach-explorer-digital-world";
          if (unlockAchievement(achievementId)) {
            unlockAchievementOnServer(achievementId);
            const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
            if (achievement) notifyAchievementUnlocked(achievement);
          }
        }
        if (isFirstStage1Clear) {
          const gift = grantCreature(FIRST_CLEAR_GIFT_CREATURE_ID);
          if (gift) {
            setFirstClearGift(gift);
            grantCreatureOnServer(FIRST_CLEAR_GIFT_CREATURE_ID);
          }
        }

        if (Math.random() * 100 < stage.equipmentDropChance) {
          setSealCoinsDropped(1);
          addSealCoins(1);
        }

        if (isFirstClearOfThisStage) {
          const tamerPiece = TAMER_EQUIPMENT_CATALOG.find(
            (t) => t.source.kind === "campaign-clear" && t.source.stageId === stage.id
          );
          if (tamerPiece && grantTamerEquipment(tamerPiece.id)) {
            setTamerGearGranted(tamerPiece.name);
            grantTamerEquipmentOnServer(tamerPiece.id);
          }
        }

        const drop = (itemId: string, chance: number) => {
          if (Math.random() * 100 < chance) {
            grantItem(itemId, 1);
            grantItemOnServer(itemId, 1);
            setItemsDropped((prev) => [...prev, { itemId, quantity: 1 }]);
          }
        };

        if (stage.eventRewards) {
          // Event logic: guarantee event rewards
          for (const reward of stage.eventRewards) {
            grantItem(reward.itemId, reward.amount);
            grantItemOnServer(reward.itemId, reward.amount);
            setItemsDropped((prev) => [...prev, { itemId: reward.itemId, quantity: reward.amount }]);
          }
        } else {
          // Normal campaign logic
          drop("it-rotten-egg", 35);
          drop("it-chicken", 20);
          if (Math.random() * 100 < stage.equipmentDropChance) {
            drop(pickWeightedTrainingItemId(), 100);
          }

          if (isFirstClearOfThisStage && stage.world === 1 && stage.worldStageNumber === 8) {
            grantItem("it-frontier-emblem", 1);
            grantItemOnServer("it-frontier-emblem", 1);
            setItemsDropped((prev) => [...prev, { itemId: "it-frontier-emblem", quantity: 1 }]);
          }
        }
        
        if (guild) {
          addGuildExpAction(guild.id, stage.rewardExp).catch(() => {});
        }

        syncProgressToServer();
      }
      return;
    }
    if (!playersAlive) {
      setPhase("defeat");
      setLog((prev) => [...prev, { id: nextLogId(), kind: "info", message: "Defeat... your team was wiped out." }]);
      return;
    }

    // Increment turn count when cycling back to start
    setTurnPointer((prevPointer) => {
      let nextIdx = prevPointer;
      for (let i = 1; i <= turnOrder.length; i++) {
        const idx = (prevPointer + i) % turnOrder.length;
        const c = next.find((cc) => cc.uid === turnOrder[idx]);
        if (c?.isAlive) {
          nextIdx = idx;
          break;
        }
      }
      if (nextIdx <= prevPointer) setTurnCount((c) => c + 1);
      return nextIdx;
    });
    };

    if (isUltimate) {
      // Play the charge-up aura on the caster before damage/status actually lands — mirrors
      // RaidBattleScreen's existing boss-telegraph delayed-animation pattern.
      setActiveUltimateUid((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
      setTimeout(() => {
        setActiveUltimateUid((prev) => ({ uid: "", nonce: prev.nonce }));
        finalize();
      }, 1300);
    } else {
      finalize();
    }
  }

  // Enemy turns resolve themselves after a short "thinking" delay.
  useEffect(() => {
    if (phase !== "active") return;
    const currentActor = combatants.find((c) => c.uid === turnOrder[turnPointer]);
    if (!currentActor || currentActor.side !== "enemy" || !currentActor.isAlive) return;

    const timeout = setTimeout(() => {
      const { skill, targetUid } = pickEnemyAction(currentActor, combatants);
      resolveTurn(currentActor.uid, skill, targetUid);
    }, 900);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnPointer, phase]);

  function handleSkillClick(skill: Skill) {
    if (!actor) return;
    const mode = getSkillTargetMode(skill);
    if (mode === "choose-enemy") {
      setPendingSkill((prev) => (prev?.id === skill.id ? null : skill));
      return;
    }
    resolveTurn(actor.uid, skill, null);
  }

  const players = combatants.filter((c) => c.side === "player");
  const enemies = combatants.filter((c) => c.side === "enemy");
  const arenaBg = ARENA_BACKGROUNDS[stage.world];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">
          World {stage.world}-{stage.worldStageNumber}
        </h1>
        <p className="text-xs text-zinc-500">{stage.name} · 2v2 Turn Battle</p>
      </div>

      <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-4xl xl:max-w-6xl 2xl:max-w-[1600px]">
        {arenaBg ? (
          <div
            className="relative mx-auto w-full overflow-hidden rounded-3xl border-2 border-arcade-border shadow-2xl bg-black aspect-[3/4] sm:aspect-[4/5] lg:aspect-[16/9] min-h-[500px] sm:min-h-[600px] xl:min-h-[700px] 2xl:min-h-[800px]"
          >
            <Image
              src={arenaBg}
              alt=""
              fill
              priority
              unoptimized
              className="object-cover"
              style={{ imageRendering: "pixelated" }}
            />

            {/* Enemy HP Plates (Top Right) — large-desktop only. Each CombatantCard sprite already
                carries its own compact name/HP/Resonance readout right above its head (see
                CombatantCard.tsx), so these bigger portrait plates are pure duplication; below
                2xl the arena isn't wide enough yet for both to coexist without crowding into the
                sprites themselves (confirmed by screenshot at an in-between ~1100-1400px width —
                only genuinely large monitors have room to spare for both). */}
            <div className="hidden 2xl:flex absolute top-4 right-4 flex-row flex-wrap justify-end gap-2 sm:gap-4 z-20">
              {enemies.map((c) => (
                <CombatantPlate key={c.uid} combatant={c} align="right" isActingTurn={c.uid === actorUid && phase === "active"} />
              ))}
            </div>

            {/* Arena Slots / Sprites */}
            {ARENA_SLOTS.map((slot) => {
              const c = (slot.side === "player" ? players : enemies)[slot.index];
              if (!c) return null;
              const isActing = c.uid === actorUid && phase === "active";
              return (
                <div
                  key={c.uid}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: slot.left, top: slot.top }}
                >
                  {isActing && (
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-1/2 -top-7 -translate-x-1/2 text-gold-bright drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] lg:-top-8 2xl:-top-9"
                    >
                      <ChevronDown className="h-6 w-6 lg:h-7 lg:w-7 2xl:h-8 2xl:w-8" strokeWidth={3} />
                    </motion.div>
                  )}
                  <CombatantCard
                    combatant={c}
                    direction={slot.direction}
                    size="sm"
                    isActingTurn={isActing}
                    isTargetable={c.side === "enemy" && Boolean(pendingSkill) && c.isAlive}
                    onSelectTarget={
                      c.side === "enemy" && pendingSkill && actor
                        ? () => resolveTurn(actor.uid, pendingSkill, c.uid)
                        : undefined
                    }
                    attackerUid={attackEvent.uid}
                    attackNonce={attackEvent.nonce}
                    hitUids={hitEvent.uids}
                    hitNonce={hitEvent.nonce}
                    isCastingUltimate={activeUltimateUid.uid === c.uid}
                  />
                </div>
              );
            })}

            {/* Bottom UI Wrapper (Plates + Menu) */}
            <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col justify-end">
              {/* Player HP Plates — large-desktop only, same reasoning as the enemy plates above. */}
              <div className="hidden 2xl:flex flex-row flex-wrap gap-2 sm:gap-4 px-4 pb-3 sm:pb-4 pointer-events-none">
                {players.map((c) => (
                  <div key={c.uid} className="pointer-events-auto">
                    <CombatantPlate combatant={c} align="left" isActingTurn={c.uid === actorUid && phase === "active"} />
                  </div>
                ))}
              </div>

              {/* Overlaid Battle Menu */}
              <div className="flex flex-col bg-black/60 backdrop-blur-md border-t border-white/20 min-h-[140px] sm:min-h-[160px]">
                {/* Skills Menu */}
                <div className="p-3 sm:p-4 flex-1">
                  {isPlayerTurn && actor ? (
                    <>
                      <div className="mb-2 sm:mb-3 flex items-center justify-between">
                        <p className="font-arcade text-[10px] sm:text-xs text-white">What will <span className="text-gold">{actor.creature.name}</span> do?</p>
                        {pendingSkill && (
                          <button
                            onClick={() => setPendingSkill(null)}
                            className="text-[9px] sm:text-[10px] text-zinc-300 underline underline-offset-2 hover:text-white"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      {pendingSkill ? (
                        <p className="text-[10px] sm:text-xs text-zinc-300 mt-6 text-center">
                          Select an enemy target on the battlefield.
                        </p>
                      ) : (
                        // One 2x2 grid, not a 3-skill grid plus a separate full-width Ultimate
                        // row underneath — a creature's regular kit is always exactly 3 non-
                        // Passive skills, so the Ultimate (when it has one) naturally lands in the
                        // grid's 4th, otherwise-empty cell instead of adding a whole extra row.
                        // That extra row was tall enough on mobile to push the bottom menu overlay
                        // up over the player creatures' own sprites in the arena above it.
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            {actor.creature.skills
                              .filter((s) => s.type !== "Passive")
                              .map((skill) => {
                                const cooldownLeft = actor.cooldowns[skill.id] ?? 0;
                                const cost = resonanceCostForSkill(skill);
                                const isReady = cooldownLeft <= 0 && actor.resonance >= cost;
                                return (
                                  <button
                                    key={skill.id}
                                    disabled={!isReady}
                                    onClick={() => handleSkillClick(skill)}
                                    className={cn(
                                      "rounded-lg sm:rounded-xl border border-white/20 bg-white/10 p-2 sm:p-3 text-left transition-colors",
                                      isReady ? "hover:border-gold hover:bg-white/20" : "cursor-not-allowed opacity-50"
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <p className="text-[10px] sm:text-xs font-bold text-white truncate">{skill.name}</p>
                                      <span className="flex shrink-0 items-center gap-1">
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-arcade text-[7px] sm:text-[9px] font-semibold text-sky-300">
                                          <Zap className="h-2 w-2" />{cost}
                                        </span>
                                        <span
                                          className={cn(
                                            "rounded-full px-1.5 py-0.5 font-arcade text-[7px] sm:text-[9px] font-semibold uppercase text-white",
                                            SKILL_TYPE_STYLES[skill.type]
                                          )}
                                        >
                                          {skill.type}
                                        </span>
                                      </span>
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-[8px] sm:text-[10px] text-zinc-300 leading-tight">{skill.description}</p>
                                    {cooldownLeft > 0 && (
                                      <p className="mt-0.5 text-[8px] sm:text-[9px] font-semibold text-red-400">Cooldown {cooldownLeft}t</p>
                                    )}
                                    {cooldownLeft <= 0 && actor.resonance < cost && (
                                      <p className="mt-0.5 text-[8px] sm:text-[9px] font-semibold text-sky-400">Needs {cost} Resonance</p>
                                    )}
                                  </button>
                                );
                              })}
                          {(() => {
                            const ultimate = getUltimateSkill(actor.creature);
                            if (!ultimate || !actor.creature.ultimateSkill) return null;
                            const cost = actor.creature.ultimateSkill.resonanceCost;
                            const isReady = actor.resonance >= cost;
                            return (
                              <button
                                disabled={!isReady}
                                onClick={() => handleSkillClick(ultimate)}
                                className={cn(
                                  "relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-gold-bright bg-gradient-to-r from-amber-950/60 via-fuchsia-950/50 to-sky-950/60 p-2 sm:p-3 text-left transition-colors",
                                  isReady ? "hover:brightness-125" : "cursor-not-allowed opacity-50"
                                )}
                              >
                                <LegendaryCardAura />
                                <div className="relative flex items-center justify-between gap-1">
                                  <p className="text-[10px] sm:text-xs font-bold text-white truncate">{ultimate.name}</p>
                                  <span className="flex shrink-0 items-center gap-1">
                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-arcade text-[7px] sm:text-[9px] font-semibold text-sky-300">
                                      <Zap className="h-2 w-2" />{cost}
                                    </span>
                                    <span className="rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-sky-500 px-1.5 py-0.5 font-arcade text-[7px] sm:text-[9px] font-semibold uppercase text-white">
                                      Ultimate
                                    </span>
                                  </span>
                                </div>
                                <p className="relative mt-1 line-clamp-2 text-[8px] sm:text-[10px] text-zinc-300 leading-tight">{ultimate.description}</p>
                                {!isReady && (
                                  <p className="relative mt-0.5 text-[8px] sm:text-[9px] font-semibold text-sky-400">Needs {cost} Resonance</p>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      )}
                    </>
                  ) : phase === "active" ? (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-center font-arcade text-[10px] uppercase tracking-widest text-zinc-400 sm:text-xs">
                        {actor ? `${actor.creature.name} is thinking…` : "Waiting…"}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <GlowPanel accent="neon" className="flex items-center justify-between gap-3 p-4">
            <div className="flex flex-col gap-4 sm:gap-6">
              {players.map((c) => (
                <CombatantCard
                  key={c.uid}
                  combatant={c}
                  direction="south-east"
                  isActingTurn={c.uid === actorUid && phase === "active"}
                  isTargetable={false}
                  attackerUid={attackEvent.uid}
                  attackNonce={attackEvent.nonce}
                  hitUids={hitEvent.uids}
                  hitNonce={hitEvent.nonce}
                  isCastingUltimate={activeUltimateUid.uid === c.uid}
                />
              ))}
            </div>

            <div className="shrink-0 font-arcade text-[10px] uppercase tracking-widest text-zinc-500">VS</div>

            <div className="flex flex-col gap-4 sm:gap-6">
              {enemies.map((c) => (
                <CombatantCard
                  key={c.uid}
                  combatant={c}
                  direction="south-west"
                  isActingTurn={c.uid === actorUid && phase === "active"}
                  isTargetable={Boolean(pendingSkill) && c.isAlive}
                  onSelectTarget={
                    pendingSkill && actor ? () => resolveTurn(actor.uid, pendingSkill, c.uid) : undefined
                  }
                  attackerUid={attackEvent.uid}
                  attackNonce={attackEvent.nonce}
                  hitUids={hitEvent.uids}
                  hitNonce={hitEvent.nonce}
                  isCastingUltimate={activeUltimateUid.uid === c.uid}
                />
              ))}
            </div>
          </GlowPanel>
        )}
      </div>

      {/* Battle log — surfaces status-effect/Resonance flavor text (paralysis, confusion
          misfires, poison ticks, Ultimate procs) that the arena's compact skill-menu labels
          don't have room for. Mirrors RaidBattleScreen's own log panel. */}
      <GlowPanel accent="none" className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-4xl xl:max-w-6xl 2xl:max-w-[1600px] max-h-32 space-y-1 overflow-y-auto p-3">
        {log.map((entry) => (
          <p
            key={entry.id}
            className={cn(
              "text-[10px]",
              entry.kind === "defeat" && "font-semibold text-red-500",
              entry.kind === "heal" && "text-emerald-600",
              entry.kind === "info" && "font-semibold text-gold-bright"
            )}
          >
            {entry.message}
          </p>
        ))}
        <div ref={logEndRef} />
      </GlowPanel>

      {phase !== "active" && (
        <BattleResultScreen
          phase={phase}
          title={stage.name}
          goldEarned={stage.rewardGold * rewardMultiplier}
          creatureResults={creatureResults}
          itemsDropped={itemsDropped}
          sealCoinsDropped={sealCoinsDropped}
          elapsedSeconds={elapsedSeconds}
          stars={starsEarned ?? undefined}
          tamerResult={tamerResult ?? undefined}
          bonusLines={[
            rewardMultiplier > 1 && "First Clear Bonus ×2",
            isExpEventStage && (
              <span className="inline-flex items-center gap-1 text-sky-500">
                <Zap className="h-3 w-3 fill-current" /> 2x EXP Event!
              </span>
            ),
            firstClearGift &&
              (firstClearGift.isNew
                ? `${FIRST_CLEAR_GIFT_CREATURE_NAME} joined your roster!`
                : `+1 ${FIRST_CLEAR_GIFT_CREATURE_NAME} copy! (×${firstClearGift.copies} owned)`),
            tamerGearGranted && `${tamerGearGranted} unlocked for your Tamer!`,
          ].filter((line): line is NonNullable<typeof line> => Boolean(line))}
          defeatMessage="Your team was defeated. Give it another shot!"
          onRematch={onRematch}
          exitHref="/campaign"
          onExitClick={onExit}
          exitLabel="Return to Campaign"
        />
      )}
    </div>
  );
}
