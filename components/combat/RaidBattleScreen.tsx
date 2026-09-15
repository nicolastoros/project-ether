"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import type { Creature, Skill, UltimateSkill } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { ACHIEVEMENTS, ITEM_CATALOG } from "@/lib/gameData";
import type { RaidBoss } from "@/lib/raidBosses";
import { grantItemOnServer, syncProgressToServer, unlockAchievementOnServer } from "@/lib/syncProgress";
import { notifyAchievementUnlocked } from "@/lib/achievementNotify";
import { addGuildExpAction } from "@/app/actions/guild";
import { applyTamerBuffs, getTamerExpMultiplierBonus } from "@/lib/tamerBuffs";
import {
  applyAction,
  applyLrPassives,
  createCombatant,
  getSkillTargetMode,
  getUltimateSkill,
  pickEnemyAction,
  resonanceCostForSkill,
  ULTIMATE_RESONANCE_COST,
  type BattleCombatant,
  type BattleLogEntry,
  type HitInfo,
  type LrPassiveActivation,
} from "@/lib/combat";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { SYNC_PAUSE_MS } from "@/lib/useSyncGate";
import { SKILL_TYPE_STYLES, SKILL_TYPE_LABEL_KEY } from "@/components/monsters/CreatureDetailModal";
import { LegendaryCardAura } from "@/components/ui/MythicCardAura";
import type { Direction } from "@/components/ui/CreatureSprite";
import { CombatantCard } from "./CombatantCard";
import { LrPassiveIntro } from "./LrPassiveIntro";
import { UltimateAttackIntro } from "./UltimateAttackIntro";
import { BattleControls } from "./BattleControls";
import { BattleResultScreen, type CreatureResultEntry, type TamerResultEntry } from "./BattleResultScreen";
import { useT } from "@/lib/i18n/useT";
import { getAchievementName } from "@/lib/i18n/achievementDescriptions";
import { getBattlePacing } from "@/lib/battlePacing";
import { cn } from "@/lib/utils";

type BattlePhase = "active" | "victory" | "defeat";

// Wedge formation for a real NvN team fight (every Events > Challenge trial's 3v3) — absolute,
// percent-positioned slots over the arena background, same idea as BattleScreen.tsx's own
// ARENA_SLOTS, instead of a flex column: creatures read as standing on the arena's own ground
// plane rather than floating in a stack. The middle slot steps forward (toward the enemy); the
// outer two sit level with each other, further back. size="sm" on CombatantCard (see below) keeps
// them small enough that 3 a side never crowd the frame.
const RAID_TEAM_SLOTS: {
  side: "player" | "enemy";
  index: 0 | 1 | 2;
  left: string;
  top: string;
  direction: Direction;
  lunge: { x: number; y: number };
}[] = [
  { side: "player", index: 0, left: "16%", top: "44%", direction: "south-east", lunge: { x: 1, y: 0 } },
  { side: "player", index: 1, left: "28%", top: "60%", direction: "south-east", lunge: { x: 1, y: 0 } },
  { side: "player", index: 2, left: "16%", top: "76%", direction: "south-east", lunge: { x: 1, y: 0 } },
  { side: "enemy", index: 0, left: "84%", top: "44%", direction: "south-west", lunge: { x: -1, y: 0 } },
  { side: "enemy", index: 1, left: "72%", top: "60%", direction: "south-west", lunge: { x: -1, y: 0 } },
  { side: "enemy", index: 2, left: "84%", top: "76%", direction: "south-west", lunge: { x: -1, y: 0 } },
];

function buildInitialCombatants(playerCreatures: Creature[], enemyCreatures: Creature[]): BattleCombatant[] {
  return [
    ...playerCreatures.map((creature, i) => createCombatant(creature, "player", i)),
    ...enemyCreatures.map((creature, i) => createCombatant(creature, "enemy", i)),
  ];
}

interface RaidBattleScreenProps {
  boss: RaidBoss;
  /** One creature for the classic single-scaled-boss fights, several for a fixed-team fight like
   * Scarlet Inferno Super's 3 Mythics — see lib/raidBosses.ts's getRaidEnemyCreatures, which always
   * returns an array so callers never need to branch here. */
  bossCreatures: Creature[];
  /** 1-4 creatures — Raid Battle allows a bigger party than Campaign's 1-2. */
  playerCreatures: Creature[];
  onRematch: () => void;
  onExit: () => void;
}

export function RaidBattleScreen({ boss, bossCreatures, playerCreatures, onRematch, onExit }: RaidBattleScreenProps) {
  const t = useT();
  const addGold = useGameStore((s) => s.addGold);
  const gainCreatureExp = useGameStore((s) => s.gainCreatureExp);
  const gainProfileExp = useGameStore((s) => s.gainProfileExp);
  const grantItem = useGameStore((s) => s.grantItem);
  const unlockAchievement = useGameStore((s) => s.unlockAchievement);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);
  const guild = useGameStore((s) => s.guild);
  const equippedTamerGear = useGameStore((s) => s.equippedTamerGear);
  const language = useGameStore((s) => s.language);
  const autoBattleEnabled = useGameStore((s) => s.autoBattleEnabled);
  const skipAnimationEnabled = useGameStore((s) => s.skipAnimationEnabled);
  const pacing = getBattlePacing(skipAnimationEnabled);

  // Which owned gear is actually equipped right now — shared by the buff computation below and
  // the victory-reward block's Wind Set Effect (EXP +100%) check further down.
  const activeTamerGear = useMemo(() => {
    const equippedGearIds = new Set(Object.values(equippedTamerGear).filter(Boolean));
    return tamerInventory.filter((gear) => equippedGearIds.has(gear.id));
  }, [tamerInventory, equippedTamerGear]);

  const buffedPlayerCreatures = useMemo(() => {
    return playerCreatures.map((c) =>
      applyTamerBuffs(
        c,
        activeTamerGear,
        equippedTamerId,
        useGameStore.getState().profile.level,
        guild?.level
      )
    );
  }, [playerCreatures, activeTamerGear, equippedTamerId, guild?.level]);
  const [combatants, setCombatants] = useState<BattleCombatant[]>(() =>
    applyLrPassives(buildInitialCombatants(buffedPlayerCreatures, bossCreatures)).combatants
  );
  // See BattleScreen.tsx's identical fields for the full reasoning — the Dokkan-style "Passive
  // Skill" banner activates for every LR creature on either side, in every real battle screen.
  const [lrActivations] = useState<LrPassiveActivation[]>(
    () => applyLrPassives(buildInitialCombatants(buffedPlayerCreatures, bossCreatures)).activations
  );
  const [introDismissed, setIntroDismissed] = useState(() => lrActivations.length === 0);
  const turnOrder = useMemo(() => {
    // The player's whole team always acts before the enemy's, regardless of SPD — SPD only
    // breaks ties within each side. Without this, a faster boss could open the fight before the
    // player ever sees a skill menu (just "X is acting…"), which reads as a bug/frozen screen the
    // first time it happens rather than "the boss went first, wait your turn."
    const bySpdDesc = (a: BattleCombatant, b: BattleCombatant) => b.creature.baseStats.spd - a.creature.baseStats.spd;
    const players = combatants.filter((c) => c.side === "player").sort(bySpdDesc);
    const enemies = combatants.filter((c) => c.side === "enemy").sort(bySpdDesc);
    return [...players, ...enemies].map((c) => c.uid);
    // Fixed once at battle start — stays stable for the whole fight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [turnPointer, setTurnPointer] = useState(0);
  const [phase, setPhase] = useState<BattlePhase>("active");
  // See BattleScreen.tsx's identical field for the full reasoning — holds the result screen back
  // a beat so the reward/achievement/guild-exp syncs fired the instant phase flips have real time
  // to land before the player can hit Exit/Rematch and navigate away.
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    // phase only ever moves one-way (active -> victory/defeat, never back) within a given battle
    // instance, so there's no reset branch to write here — just the timer for the forward case.
    if (phase === "active") return;
    const timeout = setTimeout(() => setShowResult(true), SYNC_PAUSE_MS);
    return () => clearTimeout(timeout);
  }, [phase]);
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
  // Drives the epic gold UltimateAttackIntro overlay — set alongside activeUltimateUid above, but
  // separate: this one actually gates damage (see resolveTurn's isUltimate branch), while
  // activeUltimateUid only drives the sprite-level aura in CombatantCard.
  const [ultimateAttack, setUltimateAttack] = useState<{ casterName: string; ultimate: UltimateSkill } | null>(null);
  // The "resolve after the intro" continuation, captured at the moment the Ultimate was cast (it
  // closes over that exact applyAction() result) and invoked later by handleUltimateIntroDismiss
  // once the player taps through (or the intro's own auto-timer fires) — a ref because it's a
  // plain callback, not something a render needs to react to.
  const pendingUltimateResolveRef = useRef<(() => void) | null>(null);

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
        // Wind's "EXP +100%" Set Effect (only when every Wind piece is equipped) stacks on top of
        // the boss's flat rewardExp.
        const expGain = Math.round(boss.rewardExp * (1 + getTamerExpMultiplierBonus(activeTamerGear)));
        const levelsBefore = new Map(playerCreatures.map((c) => [c.id, c.level]));
        const tamerBefore = useGameStore.getState().profile;
        playerCreatures.forEach((c) => gainCreatureExp(c.id, expGain));
        gainProfileExp(expGain);
        const updatedCreatures = useGameStore.getState().creatures;
        const tamerAfter = useGameStore.getState().profile;
        setTamerResult({
          expGained: expGain,
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
              expGained: expGain,
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

        // Flat, always-granted rewards (Scarlet Inferno's chipsets + Exchange Coins) — exact, not
        // a random pick like the material/gear drops above.
        for (const reward of boss.bonusItemRewards ?? []) {
          grantItem(reward.itemId, reward.amount);
          grantItemOnServer(reward.itemId, reward.amount);
          setItemsDropped((prev) => [...prev, { itemId: reward.itemId, quantity: reward.amount }]);
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
              setAchievementUnlockedName(getAchievementName(achievement, language));
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
    if (noticeEntries.length > 0 && !skipAnimationEnabled) {
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
        }, pacing.lungeDelayMs);
      } else {
        if (hits.length > 0) setHitEvent((prev) => ({ hits, nonce: prev.nonce + 1 }));
        setCombatants(next);
        setPendingSkill(null);
        checkEndConditions(next, logs);
      }
    };

    const casterCreature = combatants.find((c) => c.uid === byUid)?.creature;

    if (isBossAction && !isTelegraphing && !skipAnimationEnabled) {
      // Play the boss animation first, delay damage.
      setActiveBossAnimation(skill.name);
      setTimeout(() => {
        setActiveBossAnimation(undefined);
        playAttackThenSettle();
      }, pacing.bossAttackDelayMs);
    } else if (isUltimate && casterCreature?.ultimateSkill && !skipAnimationEnabled) {
      // Damage waits for the epic UltimateAttackIntro overlay to actually dismiss (tap, or its
      // own ~3.2s auto-timer) rather than a fixed setTimeout here — see
      // handleUltimateIntroDismiss below, which is what really calls playAttackThenSettle.
      setActiveUltimateUid((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
      setUltimateAttack({ casterName: casterCreature.name, ultimate: casterCreature.ultimateSkill });
      pendingUltimateResolveRef.current = () => {
        setActiveUltimateUid((prev) => ({ uid: "", nonce: prev.nonce }));
        playAttackThenSettle();
      };
    } else {
      playAttackThenSettle();
    }
  }

  function handleUltimateIntroDismiss() {
    setUltimateAttack(null);
    const resolve = pendingUltimateResolveRef.current;
    pendingUltimateResolveRef.current = null;
    resolve?.();
  }

  // See BattleScreen.tsx's identical effect for why !introDismissed is here — a side that wins
  // the SPD-sorted turn order can't act while the passive banner still covers the screen. Also
  // auto-acts the player's own turns, via the same side-agnostic pickEnemyAction, when
  // Auto-Battle is on.
  useEffect(() => {
    if (phase !== "active" || !introDismissed) return;
    const currentActor = combatants.find((c) => c.uid === turnOrder[turnPointer]);
    if (!currentActor || !currentActor.isAlive) return;
    const isAutoActingTurn = currentActor.side === "enemy" || (currentActor.side === "player" && autoBattleEnabled);
    if (!isAutoActingTurn) return;

    const timeout = setTimeout(() => {
      const { skill, targetUid } = pickEnemyAction(currentActor, combatants);
      resolveTurn(currentActor.uid, skill, targetUid);
    }, pacing.enemyThinkDelayMs);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnPointer, phase, introDismissed, autoBattleEnabled, skipAnimationEnabled]);

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
      <AnimatePresence>
        {!introDismissed && <LrPassiveIntro activations={lrActivations} onDismiss={() => setIntroDismissed(true)} />}
      </AnimatePresence>
      <AnimatePresence>
        {ultimateAttack && (
          <UltimateAttackIntro
            casterName={ultimateAttack.casterName}
            ultimate={ultimateAttack.ultimate}
            onDismiss={handleUltimateIntroDismiss}
          />
        )}
      </AnimatePresence>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">{t("battle.raid_battle_title")}</h1>
          <p className="text-xs text-zinc-500">{boss.name} · {playerCreatures.length}v{bossCreatures.length}</p>
        </div>
        <BattleControls />
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

        {enemies.length > 1 ? (
          // A real fixed-team fight (e.g. every Events > Challenge trial's 3v3) — absolute-
          // positioned wedge slots over the arena's own ground plane (RAID_TEAM_SLOTS above),
          // exactly like Campaign's ARENA_SLOTS, instead of a flex column stack. That flex version
          // read as floating icons in the corners rather than a team standing in the arena.
          <>
            <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 z-10 font-arcade text-[10px] uppercase tracking-widest text-white/60 sm:text-xs">
              VS
            </div>
            {RAID_TEAM_SLOTS.map((slot) => {
              const c = (slot.side === "player" ? players : enemies)[slot.index];
              if (!c) return null;
              const isActing = c.uid === actorUid && phase === "active";
              return (
                <div
                  key={c.uid}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                  style={{ left: slot.left, top: slot.top }}
                >
                  <CombatantCard
                    combatant={c}
                    direction={slot.direction}
                    size="sm"
                    activeAnimation={slot.side === "enemy" ? activeBossAnimation : undefined}
                    isActingTurn={isActing}
                    isTargetable={slot.side === "enemy" && Boolean(pendingSkill) && c.isAlive}
                    onSelectTarget={
                      slot.side === "enemy" && pendingSkill && actor
                        ? () => resolveTurn(actor.uid, pendingSkill, c.uid)
                        : undefined
                    }
                    attackerUid={attackEvent.uid}
                    attackNonce={attackEvent.nonce}
                    hits={hitEvent.hits}
                    hitNonce={hitEvent.nonce}
                    isCastingUltimate={activeUltimateUid.uid === c.uid}
                    lungeVector={slot.lunge}
                  />
                </div>
              );
            })}
          </>
        ) : (
          <>
            {/* Boss Area (Top Center) — the classic single-scaled-boss layout, unchanged for
                Extreme Battles' raid bosses. */}
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
          </>
        )}
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
                {t(entry.key, entry.params)}
              </p>
            ))}
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500 animate-pulse">
            {t("common.tap_to_continue")}
          </p>
        </GlowPanel>
      )}

      {!pendingNotice && isPlayerTurn && actor && !autoBattleEnabled && (
        <GlowPanel className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-arcade text-[10px] glow-text-gold">
              {t("battle.turn_prefix")}{actor.creature.name}{t("battle.turn_suffix")}
            </p>
            {pendingSkill && (
              <button
                onClick={() => setPendingSkill(null)}
                className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-foreground"
              >
                {t("battle.cancel_target")}
              </button>
            )}
          </div>
          {pendingSkill ? (
            <p className="text-xs text-zinc-500">
              {t("battle.choose_enemy_with")}<span className="font-semibold text-foreground">{pendingSkill.name}</span>.
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
                            {t(SKILL_TYPE_LABEL_KEY[skill.type])}
                          </span>
                        </div>
                        {cooldownLeft > 0 && (
                          <p className="mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-red-500">{t("battle.cooldown")} {cooldownLeft}t</p>
                        )}
                        {cooldownLeft <= 0 && actor.resonance < cost && (
                          <p className="mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-sky-600">{t("battle.needs")} {cost} {t("battle.resonance")}</p>
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
                        {t("battle.ultimate_badge")}
                      </span>
                    </div>
                    {!isReady && (
                      <p className="relative mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-sky-600">{t("battle.needs")} {cost} {t("battle.resonance")}</p>
                    )}
                  </button>
                );
              })()}
            </div>
          )}
        </GlowPanel>
      )}

      {!pendingNotice && (!isPlayerTurn || autoBattleEnabled) && phase === "active" && (
        <p className="text-center text-[10px] uppercase tracking-widest text-zinc-500">
          {actor ? `${actor.creature.name}${t("battle.is_acting_suffix")}` : "…"}
        </p>
      )}

      {phase !== "active" && !showResult && (
        <LoadingOverlay show label={phase === "victory" ? t("battle.calculating_rewards") : t("battle.calculating_results")} />
      )}

      {phase !== "active" && showResult && (
        <BattleResultScreen
          phase={phase}
          title={boss.name}
          goldEarned={boss.rewardGold}
          creatureResults={creatureResults}
          itemsDropped={itemsDropped}
          elapsedSeconds={elapsedSeconds}
          tamerResult={tamerResult ?? undefined}
          bonusLines={[
            achievementUnlockedName &&
              `${t("battle.achievement_unlocked_prefix")}${achievementUnlockedName}${t("battle.achievement_unlocked_suffix")}`,
          ].filter((line): line is string => Boolean(line))}
          defeatMessage={t("battle.defeat_message_party")}
          onRematch={onRematch}
          onExitClick={onExit}
          exitLabel={t("battle.return_to_raids")}
        />
      )}
    </div>
  );
}
