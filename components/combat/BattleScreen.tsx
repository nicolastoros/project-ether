"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, RotateCcw, Sparkles, Zap } from "lucide-react";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import type { Creature, DungeonStage, Skill } from "@/types/game";
import { CreatureSprite, type Direction } from "@/components/ui/CreatureSprite";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useGameStore } from "@/lib/store";
import { DUNGEON_STAGES, ITEM_CATALOG, pickWeightedTrainingItemId, TAMER_EQUIPMENT_CATALOG } from "@/lib/gameData";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { applyTamerBuffs } from "@/lib/tamerBuffs";
import {
  grantCreatureOnServer,
  grantItemOnServer,
  grantTamerEquipmentOnServer,
  syncProgressToServer,
} from "@/lib/syncProgress";
import {
  applyAction,
  createCombatant,
  getSkillTargetMode,
  nextLogId,
  pickEnemyAction,
  type BattleCombatant,
  type BattleLogEntry,
} from "@/lib/combat";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { SKILL_TYPE_STYLES } from "@/components/monsters/CreatureDetailModal";
import { CombatantCard } from "./CombatantCard";
import { cn, formatNumber } from "@/lib/utils";

// One arena background per world with real battle content — each is the same portrait dimensions
// with 4 stone-circle markers in identical spots (see ARENA_SLOTS below), so a new world's
// background is a drop-in as long as it follows that same layout.
const ARENA_BACKGROUNDS: Record<number, string> = {
  1: "/assets/maps/battle_field_test1.png",
  2: "/assets/campaign/world2.jpg",
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/50">
        <CreatureSprite
          creature={creature}
          direction={align === "left" ? "south-east" : "south-west"}
          className="h-8 w-8"
        />
      </div>
      <div className={cn("min-w-0 flex-1", align === "right" && "text-right")}>
        <p className="truncate text-[10px] sm:text-xs font-bold text-white">{creature.name}</p>
        <p className="text-[9px] sm:text-[10px] text-zinc-300">Lv.{creature.level}</p>
        <ProgressBar percent={hpPercent} color="hp" label={`${combatant.currentHp}/${combatant.maxHp}`} className="mt-1" />
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
  const grantCreature = useGameStore((s) => s.grantCreature);
  const addSealCoins = useGameStore((s) => s.addSealCoins);
  const grantTamerEquipment = useGameStore((s) => s.grantTamerEquipment);
  const grantItem = useGameStore((s) => s.grantItem);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);

  // Buffed once at battle start (not reactively — mid-fight gear changes shouldn't retroactively
  // rescale an in-progress combatant's stats). gainCreatureExp/etc. below still use the original
  // unbuffed playerCreatures since only their ids matter there, not baseStats.
  const buffedPlayerCreatures = useMemo(
    () => playerCreatures.map((c) => applyTamerBuffs(c, tamerInventory, equippedTamerId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
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
  const [phase, setPhase] = useState<BattlePhase>("active");
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([
    { id: nextLogId(), kind: "info", message: `${stage.name} — battle start!` },
  ]);
  const [rewardGranted, setRewardGranted] = useState(false);
  const [firstClearGift, setFirstClearGift] = useState<{ isNew: boolean; copies: number } | null>(null);
  const [rewardMultiplier, setRewardMultiplier] = useState(1);
  const [expRewardMultiplier, setExpRewardMultiplier] = useState(1);
  const [isExpEventStage, setIsExpEventStage] = useState(false);
  const [sealCoinsDropped, setSealCoinsDropped] = useState(0);
  const [tamerGearGranted, setTamerGearGranted] = useState<string | null>(null);
  const [itemsDropped, setItemsDropped] = useState<{ itemId: string; quantity: number }[]>([]);
  const [attackEvent, setAttackEvent] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });
  const [hitEvent, setHitEvent] = useState<{ uids: string[]; nonce: number }>({ uids: [], nonce: 0 });
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  const actorUid = turnOrder[turnPointer];
  const actor = combatants.find((c) => c.uid === actorUid) ?? null;
  const isPlayerTurn = phase === "active" && actor?.side === "player";

  function resolveTurn(byUid: string, skill: Skill, explicitTargetUid: string | null) {
    const { combatants: next, logs, hitUids } = applyAction(combatants, byUid, skill, explicitTargetUid);
    if (skill.type === "Attack") {
      setAttackEvent((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
    }
    if (hitUids.length > 0) {
      setHitEvent((prev) => ({ uids: hitUids, nonce: prev.nonce + 1 }));
    }
    setCombatants(next);
    setLog((prev) => [...prev, ...logs]);
    setPendingSkill(null);

    const enemiesAlive = next.some((c) => c.side === "enemy" && c.isAlive);
    const playersAlive = next.some((c) => c.side === "player" && c.isAlive);

    if (!enemiesAlive) {
      setPhase("victory");
      setLog((prev) => [...prev, { id: nextLogId(), kind: "info", message: "Victory! All enemies defeated." }]);
      if (!rewardGranted) {
        setRewardGranted(true);
        // Read highestStageCleared *before* clearDungeonStage updates it — that's the only way to
        // tell a genuine first clear (of this stage, or specifically of stage 1 for the Dragoon
        // gift below) apart from a replay after it's already been cleared.
        const highestBefore = useGameStore.getState().dungeon.highestStageCleared;
        const isFirstClearOfThisStage = stage.stageNumber > highestBefore;
        const multiplier = isFirstClearOfThisStage ? 2 : 1;
        setRewardMultiplier(multiplier);

        // Blue-aura event stage: doubles EXP only (gold and the first-clear bonus above are
        // unaffected) — rotates daily, same stage id for every player (lib/expEvent.ts).
        const expEventActive = stage.id === getDailyExpEventStageId(stage.world, DUNGEON_STAGES);
        setIsExpEventStage(expEventActive);
        const expMultiplier = multiplier * (expEventActive ? 2 : 1);
        setExpRewardMultiplier(expMultiplier);

        addGold(stage.rewardGold * multiplier);
        playerCreatures.forEach((c) => gainCreatureExp(c.id, stage.rewardExp * expMultiplier));
        gainProfileExp(stage.rewardExp * expMultiplier);
        const isFirstStage1Clear = stage.stageNumber === 1 && highestBefore === 0;
        clearDungeonStage(stage.stageNumber);
        if (isFirstStage1Clear) {
          const gift = grantCreature(FIRST_CLEAR_GIFT_CREATURE_ID);
          if (gift) {
            setFirstClearGift(gift);
            // The generic periodic sync below only UPDATEs creatures already owned, so a brand
            // new grant (or dupe) needs its own call or it won't survive the next hydrate.
            grantCreatureOnServer(FIRST_CLEAR_GIFT_CREATURE_ID);
          }
        }

        // Seal Coins: every Campaign stage has a chance to drop one, using the same
        // DungeonStage.equipmentDropChance field the stage-detail screen already shows —
        // harder stages already roll a higher % there, so no separate curve to design.
        if (Math.random() * 100 < stage.equipmentDropChance) {
          setSealCoinsDropped(1);
          addSealCoins(1);
        }

        // Tamer gear: World 1's free Crimson pieces come from specific stage clears (only on a
        // genuine first clear of that stage, same as the Dragoon gift, so replays don't re-grant).
        if (isFirstClearOfThisStage) {
          const tamerPiece = TAMER_EQUIPMENT_CATALOG.find(
            (t) => t.source.kind === "campaign-clear" && t.source.stageId === stage.id
          );
          if (tamerPiece && grantTamerEquipment(tamerPiece.id)) {
            setTamerGearGranted(tamerPiece.name);
            grantTamerEquipmentOnServer(tamerPiece.id);
          }
        }

        // Item drops: rotten_egg and chicken roll independently at their own flat rates; the
        // training-item tier is gated on equipmentDropChance (the field already scaling 10-45%
        // by stage, already reused for Seal Coins) since a harder stage should have better odds
        // at the better tiers, not just any drop at all — first-pass balanced numbers.
        const drop = (itemId: string, chance: number) => {
          if (Math.random() * 100 < chance) {
            grantItem(itemId, 1);
            grantItemOnServer(itemId, 1);
            setItemsDropped((prev) => [...prev, { itemId, quantity: 1 }]);
          }
        };
        drop("it-rotten-egg", 35);
        drop("it-chicken", 20);
        if (Math.random() * 100 < stage.equipmentDropChance) {
          drop(pickWeightedTrainingItemId(), 100);
        }

        // World 1's boss clear guarantees a Quest item, once — same isFirstClearOfThisStage
        // guard as the Dragoon/Tamer-gear grants above, so replays don't re-grant it.
        if (isFirstClearOfThisStage && stage.world === 1 && stage.worldStageNumber === 8) {
          grantItem("it-frontier-emblem", 1);
          grantItemOnServer("it-frontier-emblem", 1);
          setItemsDropped((prev) => [...prev, { itemId: "it-frontier-emblem", quantity: 1 }]);
        }

        // Push the stage-clear (and this fight's EXP/currency gains) right away rather than
        // waiting up to 60s for GameGate's periodic sync — losing just-earned progress to a
        // closed tab would be a much worse experience than the sync itself failing silently.
        syncProgressToServer();
      }
      return;
    }
    if (!playersAlive) {
      setPhase("defeat");
      setLog((prev) => [...prev, { id: nextLogId(), kind: "info", message: "Defeat... your team was wiped out." }]);
      return;
    }

    setTurnPointer((prevPointer) => {
      for (let i = 1; i <= turnOrder.length; i++) {
        const idx = (prevPointer + i) % turnOrder.length;
        const c = next.find((cc) => cc.uid === turnOrder[idx]);
        if (c?.isAlive) return idx;
      }
      return prevPointer;
    });
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

            {/* Enemy HP Plates (Top Right) */}
            <div className="absolute top-4 right-4 flex flex-row flex-wrap justify-end gap-2 sm:gap-4 z-20">
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
                  />
                </div>
              );
            })}

            {/* Bottom UI Wrapper (Plates + Menu) */}
            <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col justify-end">
              {/* Player HP Plates (stacked dynamically above the menu) */}
              <div className="flex flex-row flex-wrap gap-2 sm:gap-4 px-4 pb-3 sm:pb-4 pointer-events-none">
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
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          {actor.creature.skills
                            .filter((s) => s.type !== "Passive")
                            .map((skill) => {
                              const cooldownLeft = actor.cooldowns[skill.id] ?? 0;
                              const isReady = cooldownLeft <= 0;
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
                                    <span
                                      className={cn(
                                        "shrink-0 rounded-full px-1.5 py-0.5 font-arcade text-[7px] sm:text-[9px] font-semibold uppercase text-white",
                                        SKILL_TYPE_STYLES[skill.type]
                                      )}
                                    >
                                      {skill.type}
                                    </span>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-[8px] sm:text-[10px] text-zinc-300 leading-tight">{skill.description}</p>
                                  {!isReady && (
                                    <p className="mt-0.5 text-[8px] sm:text-[9px] font-semibold text-red-400">Cooldown {cooldownLeft}t</p>
                                  )}
                                </button>
                              );
                            })}
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
                />
              ))}
            </div>
          </GlowPanel>
        )}
      </div>
      {phase !== "active" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <GlowPanel accent={phase === "victory" ? "gold" : "none"} className="w-full max-w-sm space-y-4 p-5 text-center">
            <h2 className={cn("font-arcade text-sm", phase === "victory" ? "glow-text-gold" : "text-zinc-500")}>
              {phase === "victory" ? "Victory!" : "Defeat"}
            </h2>
            {phase === "victory" ? (
              <div className="space-y-2">
                {rewardMultiplier > 1 && (
                  <p className="font-arcade text-[9px] uppercase tracking-wide text-gold-bright">
                    First Clear Bonus ×2
                  </p>
                )}
                {isExpEventStage && (
                  <p className="inline-flex items-center gap-1 font-arcade text-[9px] uppercase tracking-wide text-sky-500">
                    <Zap className="h-3 w-3 fill-current" /> 2x EXP Event!
                  </p>
                )}
                <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
                  <span className="inline-flex items-center gap-1">
                    <GoldCoinIcon className="h-3.5 w-3.5" /> +{formatNumber(stage.rewardGold * rewardMultiplier)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" /> +{stage.rewardExp * expRewardMultiplier} EXP each
                  </span>
                  {sealCoinsDropped > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <SealCoinIcon className="h-3.5 w-3.5" /> +{sealCoinsDropped}
                    </span>
                  )}
                </div>
                {itemsDropped.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {itemsDropped.map((drop, i) => {
                      const item = ITEM_CATALOG.find((it) => it.id === drop.itemId);
                      if (!item) return null;
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full border border-arcade-border bg-arcade-panel-light px-2 py-1 text-[10px] text-foreground"
                        >
                          <ItemIcon item={item} className="h-3 w-3" /> +{drop.quantity} {item.name}
                        </span>
                      );
                    })}
                  </div>
                )}
                {firstClearGift && (
                  <p className="font-arcade text-[10px] uppercase glow-text-gold">
                    {firstClearGift.isNew
                      ? `${FIRST_CLEAR_GIFT_CREATURE_NAME} joined your roster!`
                      : `+1 ${FIRST_CLEAR_GIFT_CREATURE_NAME} copy! (×${firstClearGift.copies} owned)`}
                  </p>
                )}
                {tamerGearGranted && (
                  <p className="font-arcade text-[10px] uppercase glow-text-gold">
                    {tamerGearGranted} unlocked for your Tamer!
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Your team was defeated. Give it another shot!</p>
            )}
            <div className="flex gap-2">
              <PixelButton variant="ghost" className="flex-1" onClick={onRematch}>
                <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                Rematch
              </PixelButton>
              <Link href="/campaign" className="flex-1" onClick={onExit}>
                <PixelButton variant="gold" className="w-full">
                  Return to Campaign
                </PixelButton>
              </Link>
            </div>
          </GlowPanel>
        </motion.div>
      )}
    </div>
  );
}
