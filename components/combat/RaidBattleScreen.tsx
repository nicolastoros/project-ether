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
  pickEnemyAction,
  resonanceCostForSkill,
  ULTIMATE_RESONANCE_COST,
  type BattleCombatant,
  type BattleLogEntry,
  type HitInfo,
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
  // Pokémon-style takeover — see BattleScreen.tsx's identical field for the full reasoning.
  // Replaces the skill panel (not the removed scrolling log) for status-effect-class beats only.
  const [pendingNotice, setPendingNotice] = useState<{ entries: BattleLogEntry[]; onDismiss: () => void } | null>(null);
  const [rewardGranted, setRewardGranted] = useState(false);
  const [itemsDropped, setItemsDropped] = useState<{ itemId: string; quantity: number }[]>([]);
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
  const [hitEvent, setHitEvent] = useState<{ hits: HitInfo[]; nonce: number }>({ hits: [], nonce: 0 });
  const [activeBossAnimation, setActiveBossAnimation] = useState<string | undefined>();
  // uid of the combatant currently charging/unleashing an Ultimate Attack — mirrors
  // activeBossAnimation's delayed-resolve pattern below, just for player-side ultimates.
  const [activeUltimateUid, setActiveUltimateUid] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });

  const actorUid = turnOrder[turnPointer];
  const actor = combatants.find((c) => c.uid === actorUid) ?? null;
  const isPlayerTurn = phase === "active" && actor?.side === "player";

  function checkEndConditions(next: BattleCombatant[], logs: BattleLogEntry[]) {
    const enemiesAlive = next.some((c) => c.side === "enemy" && c.isAlive);
    const playersAlive = next.some((c) => c.side === "player" && c.isAlive);

    if (!enemiesAlive) {
      setPhase("victory");
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
          setItemsDropped((prev) => [...prev, { itemId: picked.id, quantity: 1 }]);
        }

        // Awaken Coins: 1-5 random on every Raid win, same as a Campaign chapter boss.
        const awakenCoins = 1 + Math.floor(Math.random() * 5);
        grantItem("it-awaken-coin", awakenCoins);
        grantItemOnServer("it-awaken-coin", awakenCoins);
        setItemsDropped((prev) => [...prev, { itemId: "it-awaken-coin", quantity: awakenCoins }]);

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
      return;
    }

    const advanceTurn = () => {
      setTurnPointer((prevPointer) => {
        for (let i = 1; i <= turnOrder.length; i++) {
          const idx = (prevPointer + i) % turnOrder.length;
          const c = next.find((cc) => cc.uid === turnOrder[idx]);
          if (c?.isAlive) return idx;
        }
        return prevPointer;
      });
    };

    // Same reasoning as BattleScreen.tsx's identical filter — only status-effect-class beats get
    // the takeover; plain damage/heal/guard already read fine from the arena's own animations.
    const noticeEntries = logs.filter((l) => l.kind === "info" || l.kind === "defeat");
    if (noticeEntries.length > 0) {
      setPendingNotice({ entries: noticeEntries, onDismiss: advanceTurn });
    } else {
      advanceTurn();
    }
  }

  function resolveTurn(byUid: string, skill: Skill, explicitTargetUid: string | null) {
    const { combatants: next, logs, hits } = applyAction(combatants, byUid, skill, explicitTargetUid);

    const isBossAction = byUid.startsWith("enemy-");
    const currentBossNext = isBossAction ? next.find((c) => c.uid === byUid) : null;
    const isTelegraphing = isBossAction && currentBossNext?.telegraphedSkill?.id === skill.id;
    const isUltimate = combatants.find((c) => c.uid === byUid)?.creature.ultimateSkill?.id === skill.id;

    const playAttackThenSettle = () => {
      if (skill.type === "Attack") {
        setAttackEvent((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
        // Let the lunge travel most of the way before the hit actually "lands" — see
        // BattleScreen.tsx's identical fix for why.
        setTimeout(() => {
          if (hits.length > 0) setHitEvent((prev) => ({ hits, nonce: prev.nonce + 1 }));
          setCombatants(next);
          setPendingSkill(null);
          checkEndConditions(next, logs);
        }, 220);
      } else {
        if (hits.length > 0) setHitEvent((prev) => ({ hits, nonce: prev.nonce + 1 }));
        setCombatants(next);
        setPendingSkill(null);
        checkEndConditions(next, logs);
      }
    };

    if ((isBossAction && !isTelegraphing) || isUltimate) {
      // Play the boss animation / player Ultimate charge-up first, delay damage.
      if (isBossAction) setActiveBossAnimation(skill.name);
      if (isUltimate) setActiveUltimateUid((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));

      setTimeout(() => {
        setActiveBossAnimation(undefined);
        setActiveUltimateUid((prev) => ({ uid: "", nonce: prev.nonce }));
        playAttackThenSettle();
      }, 1500); // Wait 1.5s for the animation to play before dealing damage
    } else {
      playAttackThenSettle();
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

  function dismissNotice() {
    // The dismiss callback (advanceTurn) is a real side effect (it calls setTurnPointer) — it
    // must NOT run inside the setPendingNotice functional updater. React 18 StrictMode
    // double-invokes updater functions in dev to surface exactly this kind of impurity, so a
    // side effect placed there fires twice per single dismiss; in a 1v1 Raid fight that doubled
    // advanceTurn() nets back to the same turnPointer value (no observable state change), so the
    // enemy-AI effect's dependency never changes and never re-fires — the boss's actual attack
    // (after its telegraph) never resolves and combat hangs. See BattleScreen.tsx's identical
    // (correct) pattern this mirrors.
    const onDismiss = pendingNotice?.onDismiss;
    setPendingNotice(null);
    onDismiss?.();
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
                hits={hitEvent.hits}
                hitNonce={hitEvent.nonce}
                isCastingUltimate={activeUltimateUid.uid === c.uid}
                // Boss sits at the top of the arena — it lunges DOWN toward the party.
                lungeVector={{ x: 0, y: 1 }}
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
                  hits={hitEvent.hits}
                  hitNonce={hitEvent.nonce}
                  isCastingUltimate={activeUltimateUid.uid === c.uid}
                  // Party sits at the bottom of the arena — they lunge UP toward the boss.
                  lungeVector={{ x: 0, y: -1 }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {pendingNotice && (
        <GlowPanel
          className="cursor-pointer p-4 text-center transition-colors hover:border-gold"
          onClick={dismissNotice}
        >
          <div className="space-y-1">
            {pendingNotice.entries.map((entry, i) => (
              <p
                key={entry.id ?? i}
                className={cn(
                  "text-xs sm:text-sm font-semibold",
                  entry.kind === "defeat" ? "text-red-500" : "text-gold-bright"
                )}
              >
                {entry.message}
              </p>
            ))}
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500 animate-pulse">
            Tap to continue
          </p>
        </GlowPanel>
      )}

      {!pendingNotice && isPlayerTurn && actor && (
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
                        {/* Name on its own row — see BattleScreen.tsx's identical fix for why
                            (sharing a row with the badges squeezed longer names down to truncating,
                            even at the smallest text size, once the grid goes multi-column). */}
                        <p className="text-xs sm:text-sm lg:text-base font-semibold text-foreground truncate">{skill.name}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-arcade text-[8px] sm:text-[10px] lg:text-xs font-semibold text-sky-600">
                            <Zap className="h-2 w-2 sm:h-2.5 sm:w-2.5" />{cost}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 font-arcade text-[8px] sm:text-[10px] lg:text-xs font-semibold uppercase text-white",
                              SKILL_TYPE_STYLES[skill.type]
                            )}
                          >
                            {skill.type}
                          </span>
                        </div>
                        {cooldownLeft > 0 && (
                          <p className="mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-red-500">Cooldown {cooldownLeft}t</p>
                        )}
                        {cooldownLeft <= 0 && actor.resonance < cost && (
                          <p className="mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-sky-600">Needs {cost} Resonance</p>
                        )}
                      </button>
                    );
                  })}
              </div>
              {(() => {
                const ultimate = getUltimateSkill(actor.creature);
                if (!ultimate || !actor.creature.ultimateSkill) return null;
                const cost = ULTIMATE_RESONANCE_COST;
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
                    <p className="relative text-xs sm:text-sm lg:text-base font-semibold text-foreground truncate">{ultimate.name}</p>
                    <div className="relative mt-1 flex items-center gap-1">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-arcade text-[8px] sm:text-[10px] lg:text-xs font-semibold text-sky-600">
                        <Zap className="h-2 w-2 sm:h-2.5 sm:w-2.5" />{cost}
                      </span>
                      <span className="rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-sky-500 px-1.5 py-0.5 font-arcade text-[8px] sm:text-[10px] lg:text-xs font-semibold uppercase text-white">
                        Ultimate
                      </span>
                    </div>
                    {!isReady && (
                      <p className="relative mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-sky-600">Needs {cost} Resonance</p>
                    )}
                  </button>
                );
              })()}
            </div>
          )}
        </GlowPanel>
      )}

      {!pendingNotice && !isPlayerTurn && phase === "active" && (
        <p className="text-center text-[10px] uppercase tracking-widest text-zinc-500">
          {actor ? `${actor.creature.name} is acting…` : "…"}
        </p>
      )}

      {phase !== "active" && (
        <BattleResultScreen
          phase={phase}
          title={boss.name}
          goldEarned={boss.rewardGold}
          creatureResults={creatureResults}
          itemsDropped={itemsDropped}
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
