"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Zap } from "lucide-react";
import type { Creature, Skill } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { ACHIEVEMENTS, ITEM_CATALOG } from "@/lib/gameData";
import type { RaidBoss } from "@/lib/raidBosses";
import { grantItemOnServer, syncProgressToServer, unlockAchievementOnServer } from "@/lib/syncProgress";
import { notifyAchievementUnlocked } from "@/lib/achievementNotify";
import { addGuildExpAction } from "@/app/actions/guild";
import { applyTamerBuffs } from "@/lib/tamerBuffs";
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
import { LegendaryCardAura } from "@/components/ui/MythicCardAura";
import { CombatantCard } from "./CombatantCard";
import { BattleResultScreen, type CreatureResultEntry, type TamerResultEntry } from "./BattleResultScreen";
import { cn } from "@/lib/utils";

type BattlePhase = "active" | "victory" | "defeat";

function buildInitialCombatants(playerCreatures: Creature[], enemyCreatures: Creature[]): BattleCombatant[] {
  return [
    ...playerCreatures.map((creature, i) => createCombatant(creature, "player", i)),
    ...enemyCreatures.map((creature, i) => createCombatant(creature, "enemy", i)),
  ];
}

interface RaidBattleScreenProps {
  boss: RaidBoss;
  bossCreature: Creature;
  /** 1-4 creatures — Raid Battle allows a bigger party than Campaign's 1-2. */
  playerCreatures: Creature[];
  onRematch: () => void;
  onExit: () => void;
}

export function RaidBattleScreen({ boss, bossCreature, playerCreatures, onRematch, onExit }: RaidBattleScreenProps) {
  const addGold = useGameStore((s) => s.addGold);
  const gainCreatureExp = useGameStore((s) => s.gainCreatureExp);
  const gainProfileExp = useGameStore((s) => s.gainProfileExp);
  const grantItem = useGameStore((s) => s.grantItem);
  const unlockAchievement = useGameStore((s) => s.unlockAchievement);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);
  const guild = useGameStore((s) => s.guild);
  const equippedTamerGear = useGameStore((s) => s.equippedTamerGear);

  const buffedPlayerCreatures = useMemo(() => {
    // Only apply stats from gear that is actually equipped
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
  }, [playerCreatures, tamerInventory, equippedTamerId, equippedTamerGear, guild?.level]);
  const [combatants, setCombatants] = useState<BattleCombatant[]>(() =>
    buildInitialCombatants(buffedPlayerCreatures, [bossCreature])
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
    { id: nextLogId(), kind: "info", message: `${boss.name} — the raid begins!` },
  ]);
  const [rewardGranted, setRewardGranted] = useState(false);
  const [itemDropped, setItemDropped] = useState<{ itemId: string; quantity: number } | null>(null);
  const [creatureResults, setCreatureResults] = useState<CreatureResultEntry[]>([]);
  const [tamerResult, setTamerResult] = useState<TamerResultEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [achievementUnlockedName, setAchievementUnlockedName] = useState<string | null>(null);
  // Wall-clock battle start — captured once (in an effect, not during render, per the
  // react-hooks/purity rule against calling Date.now() directly in a render body), used to
  // compute elapsedSeconds on victory.
  const battleStartRef = useRef<number | null>(null);
  useEffect(() => {
    battleStartRef.current = Date.now();
  }, []);
  const [attackEvent, setAttackEvent] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });
  const [hitEvent, setHitEvent] = useState<{ uids: string[]; nonce: number }>({ uids: [], nonce: 0 });
  const [activeBossAnimation, setActiveBossAnimation] = useState<string | undefined>();
  // uid of the combatant currently charging/unleashing an Ultimate Attack — mirrors
  // activeBossAnimation's delayed-resolve pattern below, just for player-side ultimates.
  const [activeUltimateUid, setActiveUltimateUid] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });

  const actorUid = turnOrder[turnPointer];
  const actor = combatants.find((c) => c.uid === actorUid) ?? null;
  const isPlayerTurn = phase === "active" && actor?.side === "player";

  function checkEndConditions(next: BattleCombatant[]) {
    const enemiesAlive = next.some((c) => c.side === "enemy" && c.isAlive);
    const playersAlive = next.some((c) => c.side === "player" && c.isAlive);

    if (!enemiesAlive) {
      setPhase("victory");
      setLog((prev) => [...prev, { id: nextLogId(), kind: "info", message: `Victory! ${boss.name} has fallen.` }]);
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - (battleStartRef.current ?? Date.now())) / 1000)));
      if (!rewardGranted) {
        setRewardGranted(true);
        addGold(boss.rewardGold);
        const levelsBefore = new Map(playerCreatures.map((c) => [c.id, c.level]));
        const tamerBefore = useGameStore.getState().profile;
        playerCreatures.forEach((c) => gainCreatureExp(c.id, boss.rewardExp));
        gainProfileExp(boss.rewardExp);
        const updatedCreatures = useGameStore.getState().creatures;
        const tamerAfter = useGameStore.getState().profile;
        setTamerResult({
          expGained: boss.rewardExp,
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
              expGained: boss.rewardExp,
              levelBefore: levelsBefore.get(c.id) ?? c.level,
              levelAfter: updated?.level ?? c.level,
              exp: updated?.exp ?? c.exp,
              expToNextLevel: updated?.expToNextLevel ?? c.expToNextLevel,
            };
          })
        );

        const materialPool = ITEM_CATALOG.filter((i) => i.category === "Evolution" || i.category === "Crafting");
        if (materialPool.length > 0 && Math.random() * 100 < boss.itemDropChance) {
          const picked = materialPool[Math.floor(Math.random() * materialPool.length)];
          grantItem(picked.id, 1);
          grantItemOnServer(picked.id, 1);
          setItemDropped({ itemId: picked.id, quantity: 1 });
        }

        if (guild) {
          addGuildExpAction(guild.id, boss.rewardExp).catch(() => {});
        }

        if (boss.id === "raid-crimson-paladin-super3") {
          const achievementId = "ach-crimson-conqueror";
          if (unlockAchievement(achievementId)) {
            unlockAchievementOnServer(achievementId);
            const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
            if (achievement) {
              setAchievementUnlockedName(achievement.name);
              notifyAchievementUnlocked(achievement);
            }
          }
        }

        syncProgressToServer();
      }
      return;
    }
    if (!playersAlive) {
      setPhase("defeat");
      setLog((prev) => [...prev, { id: nextLogId(), kind: "info", message: `Defeat... ${boss.name} was too strong this time.` }]);
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

  function resolveTurn(byUid: string, skill: Skill, explicitTargetUid: string | null) {
    const { combatants: next, logs, hitUids } = applyAction(combatants, byUid, skill, explicitTargetUid);

    const isBossAction = byUid.startsWith("enemy-");
    const currentBossNext = isBossAction ? next.find((c) => c.uid === byUid) : null;
    const isTelegraphing = isBossAction && currentBossNext?.telegraphedSkill?.id === skill.id;
    const isUltimate = combatants.find((c) => c.uid === byUid)?.creature.ultimateSkill?.id === skill.id;

    if ((isBossAction && !isTelegraphing) || isUltimate) {
      // Play the boss animation / player Ultimate charge-up first, delay damage.
      if (isBossAction) setActiveBossAnimation(skill.name);
      if (isUltimate) setActiveUltimateUid((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));

      setTimeout(() => {
        setActiveBossAnimation(undefined);
        setActiveUltimateUid((prev) => ({ uid: "", nonce: prev.nonce }));
        if (skill.type === "Attack") setAttackEvent((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
        if (hitUids.length > 0) setHitEvent((prev) => ({ uids: hitUids, nonce: prev.nonce + 1 }));

        setCombatants(next);
        setLog((prev) => [...prev, ...logs]);
        setPendingSkill(null);
        checkEndConditions(next);
      }, 1500); // Wait 1.5s for the animation to play before dealing damage
    } else {
      // Normal immediate resolve
      if (skill.type === "Attack") setAttackEvent((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
      if (hitUids.length > 0) setHitEvent((prev) => ({ uids: hitUids, nonce: prev.nonce + 1 }));
      
      setCombatants(next);
      setLog((prev) => [...prev, ...logs]);
      setPendingSkill(null);
      checkEndConditions(next);
    }
  }

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

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Raid Battle</h1>
        <p className="text-xs text-zinc-500">{boss.name} · up to 4v1</p>
      </div>

      <div 
        className="relative w-full h-[420px] sm:h-[580px] overflow-hidden rounded-xl border-2 border-arcade-border shadow-[0_0_20px_rgba(255,215,0,0.15)]"
        style={{
          backgroundImage: "url('/assets/maps/raid_battle_1.png')",
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
        }}
      >
        <div className="absolute inset-0 bg-black/20" /> {/* Slight darken for UI contrast */}

        {/* Boss Area (Top Center) */}
        <div className="absolute top-[32%] sm:top-[25%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          {enemies.map((c) => (
            <div key={c.uid} className="scale-125 sm:scale-150 origin-bottom transition-transform">
              <CombatantCard
                combatant={c}
                direction="south"
                activeAnimation={activeBossAnimation}
                isActingTurn={c.uid === actorUid && phase === "active"}
                isTargetable={Boolean(pendingSkill) && c.isAlive}
                onSelectTarget={pendingSkill && actor ? () => resolveTurn(actor.uid, pendingSkill, c.uid) : undefined}
                attackerUid={attackEvent.uid}
                attackNonce={attackEvent.nonce}
                hitUids={hitEvent.uids}
                hitNonce={hitEvent.nonce}
                isCastingUltimate={activeUltimateUid.uid === c.uid}
              />
            </div>
          ))}
        </div>

        {/* Players Area (Bottom Curve) */}
        <div className="absolute bottom-0 sm:bottom-2 left-0 right-0 flex justify-center items-end gap-2 sm:gap-6 px-4 z-20">
          {players.map((c, i) => {
            // Stagger heights to create a faux-3D curve effect
            const isOuter = i === 0 || i === players.length - 1;
            const yOffset = isOuter ? "translate-y-4 sm:translate-y-8" : "translate-y-0";
            return (
              <div key={c.uid} className={cn("transition-transform scale-[0.80] sm:scale-100 origin-bottom", yOffset)}>
                <CombatantCard
                  combatant={c}
                  direction="north"
                  isActingTurn={c.uid === actorUid && phase === "active"}
                  isTargetable={false}
                  attackerUid={attackEvent.uid}
                  attackNonce={attackEvent.nonce}
                  hitUids={hitEvent.uids}
                  hitNonce={hitEvent.nonce}
                  isCastingUltimate={activeUltimateUid.uid === c.uid}
                />
              </div>
            );
          })}
        </div>
      </div>

      {isPlayerTurn && actor && (
        <GlowPanel className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-arcade text-[10px] glow-text-gold">{actor.creature.name}&apos;s turn</p>
            {pendingSkill && (
              <button
                onClick={() => setPendingSkill(null)}
                className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-foreground"
              >
                Cancel target
              </button>
            )}
          </div>
          {pendingSkill ? (
            <p className="text-xs text-zinc-500">
              Choose an enemy to hit with <span className="font-semibold text-foreground">{pendingSkill.name}</span>.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                          "rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5 text-left transition-colors",
                          isReady ? "hover:border-gold" : "cursor-not-allowed opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{skill.name}</p>
                          <span className="flex shrink-0 items-center gap-1">
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-arcade text-[7px] font-semibold text-sky-600">
                              <Zap className="h-2 w-2" />{cost}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-0.5 font-arcade text-[7px] font-semibold uppercase text-white",
                                SKILL_TYPE_STYLES[skill.type]
                              )}
                            >
                              {skill.type}
                            </span>
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-600">{skill.description}</p>
                        {cooldownLeft > 0 && (
                          <p className="mt-1 text-[9px] font-semibold text-red-500">Cooldown {cooldownLeft}t</p>
                        )}
                        {cooldownLeft <= 0 && actor.resonance < cost && (
                          <p className="mt-1 text-[9px] font-semibold text-sky-600">Needs {cost} Resonance</p>
                        )}
                      </button>
                    );
                  })}
              </div>
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
                      "relative w-full overflow-hidden rounded-xl border-2 border-gold-bright bg-gradient-to-r from-amber-950/10 via-fuchsia-950/10 to-sky-950/10 p-2.5 text-left transition-colors",
                      isReady ? "hover:brightness-110" : "cursor-not-allowed opacity-50"
                    )}
                  >
                    <LegendaryCardAura />
                    <div className="relative flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{ultimate.name}</p>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-arcade text-[7px] font-semibold text-sky-600">
                          <Zap className="h-2 w-2" />{cost}
                        </span>
                        <span className="rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-sky-500 px-1.5 py-0.5 font-arcade text-[7px] font-semibold uppercase text-white">
                          Ultimate
                        </span>
                      </span>
                    </div>
                    <p className="relative mt-1 text-[10px] text-zinc-600">{ultimate.description}</p>
                    {!isReady && (
                      <p className="relative mt-1 text-[9px] font-semibold text-sky-600">Needs {cost} Resonance</p>
                    )}
                  </button>
                );
              })()}
            </div>
          )}
        </GlowPanel>
      )}

      {!isPlayerTurn && phase === "active" && (
        <p className="text-center text-[10px] uppercase tracking-widest text-zinc-500">
          {actor ? `${actor.creature.name} is acting…` : "…"}
        </p>
      )}

      <GlowPanel accent="none" className="max-h-32 space-y-1 overflow-y-auto p-3">
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
      </GlowPanel>

      {phase !== "active" && (
        <BattleResultScreen
          phase={phase}
          title={boss.name}
          goldEarned={boss.rewardGold}
          creatureResults={creatureResults}
          itemsDropped={itemDropped ? [itemDropped] : []}
          elapsedSeconds={elapsedSeconds}
          tamerResult={tamerResult ?? undefined}
          bonusLines={[achievementUnlockedName && `Achievement Unlocked: ${achievementUnlockedName}!`].filter(
            (line): line is string => Boolean(line)
          )}
          defeatMessage="Your party was defeated. Bring more/stronger creatures next time!"
          onRematch={onRematch}
          onExitClick={onExit}
          exitLabel="Return to Raids"
        />
      )}
    </div>
  );
}
