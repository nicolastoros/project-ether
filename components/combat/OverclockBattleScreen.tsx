"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Zap, RotateCcw } from "lucide-react";
import type { Creature, Skill, UltimateSkill } from "@/types/game";
import { useGameStore } from "@/lib/store";
import type { OverclockBoss } from "@/lib/overclock";
import { OVERCLOCK_ESCALATION_PER_BOSS_TURN } from "@/lib/overclock";
import { submitOverclockScoreOnServer } from "@/lib/syncProgress";
import { applyTamerBuffs } from "@/lib/tamerBuffs";
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
import { PixelButton } from "@/components/ui/PixelButton";
import { SYNC_PAUSE_MS } from "@/lib/useSyncGate";
import { SKILL_TYPE_STYLES } from "@/components/monsters/CreatureDetailModal";
import { LegendaryCardAura } from "@/components/ui/MythicCardAura";
import { CombatantCard } from "./CombatantCard";
import { LrPassiveIntro } from "./LrPassiveIntro";
import { UltimateAttackIntro } from "./UltimateAttackIntro";
import { cn, formatNumber } from "@/lib/utils";

type BattlePhase = "active" | "victory" | "defeat";

function buildInitialCombatants(playerCreatures: Creature[], bossCreature: Creature): BattleCombatant[] {
  return [
    ...playerCreatures.map((creature, i) => createCombatant(creature, "player", i)),
    createCombatant(bossCreature, "enemy", 0),
  ];
}

interface OverclockBattleScreenProps {
  boss: OverclockBoss;
  bossCreature: Creature;
  /** Exactly 2 — enforced by the caller's picker (max 1 LR among them too), not here. */
  playerCreatures: Creature[];
  onRematch: () => void;
  onExit: () => void;
}

/** Overclock's own battle screen — forked from RaidBattleScreen.tsx's classic single-boss layout
 * (same arena chrome, LR passives, Ultimate Attack banners, boss attack-animation timing) with a
 * few real differences: the boss gets flatly stronger after each of its own turns (no lib/combat.ts
 * changes needed — see resolveTurn below, it just escalates the boss's own BattleCombatant.statBuffs,
 * the same field calcDamage already reads for every other buff/debuff in the game), the score is
 * total damage dealt across the whole fight rather than a traditional gold/exp/item reward (win or
 * lose — see checkEndConditions), and the boss's HP bar is the segmented "100 bars" style
 * (CombatantCard's segmentedHp prop). */
export function OverclockBattleScreen({ boss, bossCreature, playerCreatures, onRematch, onExit }: OverclockBattleScreenProps) {
  const submitOverclockScore = useGameStore((s) => s.submitOverclockScore);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);
  const guild = useGameStore((s) => s.guild);
  const equippedTamerGear = useGameStore((s) => s.equippedTamerGear);
  const overclockBestDamage = useGameStore((s) => s.profile.overclockBestDamage ?? 0);

  const activeTamerGear = useMemo(() => {
    const equippedGearIds = new Set(Object.values(equippedTamerGear).filter(Boolean));
    return tamerInventory.filter((gear) => equippedGearIds.has(gear.id));
  }, [tamerInventory, equippedTamerGear]);

  const buffedPlayerCreatures = useMemo(() => {
    return playerCreatures.map((c) =>
      applyTamerBuffs(c, activeTamerGear, equippedTamerId, useGameStore.getState().profile.level, guild?.level)
    );
  }, [playerCreatures, activeTamerGear, equippedTamerId, guild?.level]);

  const [combatants, setCombatants] = useState<BattleCombatant[]>(() =>
    applyLrPassives(buildInitialCombatants(buffedPlayerCreatures, bossCreature)).combatants
  );
  const [lrActivations] = useState<LrPassiveActivation[]>(
    () => applyLrPassives(buildInitialCombatants(buffedPlayerCreatures, bossCreature)).activations
  );
  const [introDismissed, setIntroDismissed] = useState(() => lrActivations.length === 0);
  // The player's team always acts before the boss, regardless of SPD — same fix as
  // RaidBattleScreen.tsx's own turnOrder, and for the same reason: a faster boss opening the fight
  // left the player staring at "X is acting…" with no skill menu at all, reading as broken rather
  // than "wait your turn."
  const turnOrder = useMemo(() => {
    const bySpdDesc = (a: BattleCombatant, b: BattleCombatant) => b.creature.baseStats.spd - a.creature.baseStats.spd;
    const players = combatants.filter((c) => c.side === "player").sort(bySpdDesc);
    const enemies = combatants.filter((c) => c.side === "enemy").sort(bySpdDesc);
    return [...players, ...enemies].map((c) => c.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [turnPointer, setTurnPointer] = useState(0);
  const [phase, setPhase] = useState<BattlePhase>("active");
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    if (phase === "active") return;
    const timeout = setTimeout(() => setShowResult(true), SYNC_PAUSE_MS);
    return () => clearTimeout(timeout);
  }, [phase]);
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
  const [pendingNotice, setPendingNotice] = useState<{ entries: BattleLogEntry[]; onDismiss: () => void } | null>(null);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [totalDamageDealt, setTotalDamageDealt] = useState(0);
  const [attackEvent, setAttackEvent] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });
  const [hitEvent, setHitEvent] = useState<{ hits: HitInfo[]; nonce: number }>({ hits: [], nonce: 0 });
  const [activeBossAnimation, setActiveBossAnimation] = useState<string | undefined>();
  const [activeUltimateUid, setActiveUltimateUid] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });
  const [ultimateAttack, setUltimateAttack] = useState<{ casterName: string; ultimate: UltimateSkill } | null>(null);
  const pendingUltimateResolveRef = useRef<(() => void) | null>(null);

  // How many of the boss's own turns have resolved so far this fight — drives the escalating
  // difficulty multiplier below. A ref (not state) since it's read/written inside resolveTurn
  // itself and never needs to trigger its own re-render.
  const bossTurnsTakenRef = useRef(0);

  const actorUid = turnOrder[turnPointer];
  const actor = combatants.find((c) => c.uid === actorUid) ?? null;
  const isPlayerTurn = phase === "active" && actor?.side === "player";
  const bossCombatant = combatants.find((c) => c.side === "enemy") ?? null;

  function checkEndConditions(next: BattleCombatant[], logs: BattleLogEntry[], currentTotalDamage: number) {
    const enemiesAlive = next.some((c) => c.side === "enemy" && c.isAlive);
    const playersAlive = next.some((c) => c.side === "player" && c.isAlive);

    if (!enemiesAlive || !playersAlive) {
      setPhase(!enemiesAlive ? "victory" : "defeat");
      // Win or lose, the running damage total is the whole score. No gold/exp/items either way, by
      // design (confirmed with the user) — the ranking itself is the only reward, so a normal fight
      // can never be farmed for loot.
      //
      // currentTotalDamage (not the totalDamageDealt state var) on purpose: the killing blow against
      // the boss is exactly the action that ends the fight, and setTotalDamageDealt's update from
      // that same resolveTurn call hasn't been applied to this render's closure yet when this runs
      // (React state updates aren't synchronous) — reading the state var here silently dropped every
      // victory's final hit from the submitted score.
      if (!scoreSubmitted) {
        setScoreSubmitted(true);
        submitOverclockScore(currentTotalDamage);
        submitOverclockScoreOnServer(currentTotalDamage);
      }
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

    const noticeEntries = logs.filter((l) => l.kind === "info" || l.kind === "defeat");
    if (noticeEntries.length > 0) {
      setPendingNotice({ entries: noticeEntries, onDismiss: advanceTurn });
    } else {
      advanceTurn();
    }
  }

  function resolveTurn(byUid: string, skill: Skill, explicitTargetUid: string | null) {
    const { combatants: rawNext, logs, hits } = applyAction(combatants, byUid, skill, explicitTargetUid);

    const isBossAction = byUid.startsWith("enemy-");
    const currentBossNext = isBossAction ? rawNext.find((c) => c.uid === byUid) : null;
    const isTelegraphing = isBossAction && currentBossNext?.telegraphedSkill?.id === skill.id;
    const isUltimate = combatants.find((c) => c.uid === byUid)?.creature.ultimateSkill?.id === skill.id;

    // Escalate the boss's own ATK/DEF a flat step further after each of its own turns — reuses
    // BattleCombatant.statBuffs (the same field every other buff/debuff already writes), so
    // calcDamage picks it up automatically on both sides (its own strikes hit harder, and it takes
    // less damage when struck) with zero lib/combat.ts changes. turnsLeft stays a fixed 999 — it
    // only ever ticks down on the boss's OWN turns (see applyAction's own end-of-turn tick-down),
    // far more than any realistic fight length, so it never accidentally expires mid-fight.
    // The displayed level climbing from its Lv.60 start toward 100 is purely cosmetic (getEffectiveStats
    // never reads creature.level, only baseStats) — a visible readout of the same real escalation
    // rather than a second thing to balance.
    let next = rawNext;
    if (isBossAction && !isTelegraphing) {
      bossTurnsTakenRef.current += 1;
      const multiplier = 1 + bossTurnsTakenRef.current * OVERCLOCK_ESCALATION_PER_BOSS_TURN;
      const displayLevel = Math.min(100, 60 + bossTurnsTakenRef.current * 2);
      next = rawNext.map((c) =>
        c.side === "enemy"
          ? { ...c, statBuffs: { multiplier, turnsLeft: 999 }, creature: { ...c.creature, level: displayLevel } }
          : c
      );
    }

    // Every hit landed on the boss this action counts toward the score, regardless of who ends up
    // winning or losing the fight — tracked live (not just at the end) so the HUD can show a
    // running total during the fight too.
    const bossUid = bossCombatant?.uid;
    let dealtThisAction = 0;
    if (bossUid) {
      dealtThisAction = hits.filter((h) => h.uid === bossUid && !h.isHeal && !h.isMiss).reduce((sum, h) => sum + h.amount, 0);
      if (dealtThisAction > 0) setTotalDamageDealt((prev) => prev + dealtThisAction);
    }
    // The accurate total as of THIS action, computed locally rather than read back from state —
    // see checkEndConditions' own comment on why.
    const runningTotalDamage = totalDamageDealt + dealtThisAction;

    const playAttackThenSettle = () => {
      if (skill.type === "Attack") {
        setAttackEvent((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
        setTimeout(() => {
          if (hits.length > 0) setHitEvent((prev) => ({ hits, nonce: prev.nonce + 1 }));
          setCombatants(next);
          setPendingSkill(null);
          checkEndConditions(next, logs, runningTotalDamage);
        }, 220);
      } else {
        if (hits.length > 0) setHitEvent((prev) => ({ hits, nonce: prev.nonce + 1 }));
        setCombatants(next);
        setPendingSkill(null);
        checkEndConditions(next, logs, runningTotalDamage);
      }
    };

    const casterCreature = combatants.find((c) => c.uid === byUid)?.creature;

    if (isBossAction && !isTelegraphing) {
      setActiveBossAnimation(skill.name);
      setTimeout(() => {
        setActiveBossAnimation(undefined);
        playAttackThenSettle();
      }, 1500);
    } else if (isUltimate && casterCreature?.ultimateSkill) {
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

  useEffect(() => {
    if (phase !== "active" || !introDismissed) return;
    const currentActor = combatants.find((c) => c.uid === turnOrder[turnPointer]);
    if (!currentActor || currentActor.side !== "enemy" || !currentActor.isAlive) return;

    const timeout = setTimeout(() => {
      const { skill, targetUid } = pickEnemyAction(currentActor, combatants);
      resolveTurn(currentActor.uid, skill, targetUid);
    }, 900);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnPointer, phase, introDismissed]);

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
    const onDismiss = pendingNotice?.onDismiss;
    setPendingNotice(null);
    onDismiss?.();
  }

  const players = combatants.filter((c) => c.side === "player");
  const enemies = combatants.filter((c) => c.side === "enemy");
  const isNewBest = phase !== "active" && totalDamageDealt > overclockBestDamage;

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Overclock</h1>
          <p className="text-xs text-zinc-500">{boss.name} · 2v1</p>
        </div>
        <div className="rounded-xl border border-arcade-border bg-arcade-panel-light px-3 py-1.5 text-right">
          <p className="font-arcade text-[9px] uppercase tracking-wide text-zinc-500">Damage Dealt</p>
          <p className="font-arcade text-sm text-gold-bright">{formatNumber(totalDamageDealt)}</p>
        </div>
      </div>

      <div
        className="relative w-full h-[420px] sm:h-[580px] overflow-hidden rounded-xl border-2 border-arcade-border shadow-[0_0_20px_rgba(255,215,0,0.15)]"
        style={{
          backgroundImage: "url('/assets/maps/overclock_scenario.png')",
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
        }}
      >
        <div className="absolute inset-0 bg-black/20" />

        {/* Boss Area (Top Center) — same classic single-boss layout as RaidBattleScreen's own, just
            with the segmented "100 bars" HP bar (segmentedHp) instead of the plain one. */}
        <div className="absolute top-[32%] sm:top-[25%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
          {enemies.map((c) => (
            <div key={c.uid} className="scale-125 sm:scale-150 origin-bottom transition-transform">
              <CombatantCard
                combatant={c}
                direction="south"
                segmentedHp
                activeAnimation={activeBossAnimation}
                isActingTurn={c.uid === actorUid && phase === "active"}
                isTargetable={Boolean(pendingSkill) && c.isAlive}
                onSelectTarget={pendingSkill && actor ? () => resolveTurn(actor.uid, pendingSkill, c.uid) : undefined}
                attackerUid={attackEvent.uid}
                attackNonce={attackEvent.nonce}
                hits={hitEvent.hits}
                hitNonce={hitEvent.nonce}
                isCastingUltimate={activeUltimateUid.uid === c.uid}
                lungeVector={{ x: 0, y: 1 }}
              />
            </div>
          ))}
        </div>

        {/* Players Area (Bottom Curve) */}
        <div className="absolute bottom-0 sm:bottom-2 left-0 right-0 flex justify-center items-end gap-2 sm:gap-6 px-4 z-20">
          {players.map((c, i) => {
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
                  lungeVector={{ x: 0, y: -1 }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {pendingNotice && (
        <GlowPanel className="cursor-pointer p-4 text-center transition-colors hover:border-gold" onClick={dismissNotice}>
          <div className="space-y-1">
            {pendingNotice.entries.map((entry, i) => (
              <p
                key={entry.id ?? i}
                className={cn("text-xs sm:text-sm font-semibold", entry.kind === "defeat" ? "text-red-500" : "text-gold-bright")}
              >
                {entry.message}
              </p>
            ))}
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500 animate-pulse">Tap to continue</p>
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

      {phase !== "active" && !showResult && (
        <LoadingOverlay show label={phase === "victory" ? "Boss down! Tallying damage..." : "Calculating results..."} />
      )}

      {phase !== "active" && showResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
        >
          <GlowPanel accent={phase === "victory" ? "gold" : "none"} className="my-auto w-full max-w-md space-y-5 p-6 text-center sm:max-w-lg sm:p-7">
            <div>
              <h2 className={cn("font-arcade text-lg sm:text-xl", phase === "victory" ? "glow-text-gold" : "text-zinc-500")}>
                {phase === "victory" ? "Boss Down!" : "Defeat"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{boss.name}</p>
            </div>

            <div className="rounded-2xl border border-arcade-border bg-arcade-panel-light p-5">
              <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Total Damage Dealt</p>
              <p className="mt-1 font-arcade text-3xl text-gold-bright sm:text-4xl">{formatNumber(totalDamageDealt)}</p>
              {isNewBest && (
                <p className="mt-2 font-arcade text-[10px] uppercase tracking-wide text-emerald-500 animate-pulse">
                  New Weekly Best!
                </p>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              This run&apos;s damage was submitted to this week&apos;s Overclock ranking — no gold, EXP, or items here, just the score.
            </p>

            <div className="flex gap-2 sm:gap-3">
              <PixelButton variant="ghost" className="flex-1 sm:py-3 sm:text-base" onClick={onRematch}>
                <RotateCcw className="mr-1 inline h-4 w-4 sm:h-5 sm:w-5" />
                Rematch
              </PixelButton>
              <PixelButton variant="gold" className="flex-1 sm:py-3 sm:text-base" onClick={onExit}>
                Return to Overclock
              </PixelButton>
            </div>
          </GlowPanel>
        </motion.div>
      )}
    </div>
  );
}
