"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Coins, RotateCcw, Sparkles } from "lucide-react";
import type { Creature, DungeonStage, Skill } from "@/types/game";
import type { Direction } from "@/components/ui/CreatureSprite";
import { useGameStore } from "@/lib/store";
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

// Stone-circle marker positions in /assets/campaign/world1_1.jpeg, as % of the image box.
const STAGE1_ARENA_BG = "/assets/campaign/world1_1.jpeg";
const STAGE1_SLOTS: { side: "player" | "enemy"; index: 0 | 1; left: string; top: string; direction: Direction }[] = [
  { side: "player", index: 0, left: "20.5%", top: "48%", direction: "south-east" },
  { side: "player", index: 1, left: "20.5%", top: "78%", direction: "south-east" },
  { side: "enemy", index: 0, left: "79%", top: "48%", direction: "south-west" },
  { side: "enemy", index: 1, left: "79%", top: "78%", direction: "south-west" },
];

interface BattleScreenProps {
  stage: DungeonStage;
  playerCreatures: [Creature, Creature];
  enemyCreatures: [Creature, Creature];
  onRematch: () => void;
  onExit: () => void;
}

type BattlePhase = "active" | "victory" | "defeat";

function buildInitialCombatants(
  playerCreatures: [Creature, Creature],
  enemyCreatures: [Creature, Creature]
): BattleCombatant[] {
  return [
    createCombatant(playerCreatures[0], "player", 0),
    createCombatant(playerCreatures[1], "player", 1),
    createCombatant(enemyCreatures[0], "enemy", 0),
    createCombatant(enemyCreatures[1], "enemy", 1),
  ];
}

export function BattleScreen({ stage, playerCreatures, enemyCreatures, onRematch, onExit }: BattleScreenProps) {
  const addGold = useGameStore((s) => s.addGold);
  const gainCreatureExp = useGameStore((s) => s.gainCreatureExp);

  const [combatants, setCombatants] = useState<BattleCombatant[]>(() =>
    buildInitialCombatants(playerCreatures, enemyCreatures)
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
        addGold(stage.rewardGold);
        playerCreatures.forEach((c) => gainCreatureExp(c.id, stage.rewardExp));
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
  const hasStage1Arena = stage.id === "dg-stage-1";

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">
          World {stage.world}-{stage.worldStageNumber}
        </h1>
        <p className="text-xs text-zinc-500">{stage.name} · 2v2 Turn Battle</p>
      </div>

      {hasStage1Arena ? (
        <div
          className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-arcade-border shadow-sm"
          style={{ aspectRatio: "704 / 1189" }}
        >
          <Image
            src={STAGE1_ARENA_BG}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 384px"
            className="object-cover"
          />
          {STAGE1_SLOTS.map((slot) => {
            const c = (slot.side === "player" ? players : enemies)[slot.index];
            if (!c) return null;
            return (
              <div
                key={c.uid}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: slot.left, top: slot.top }}
              >
                <CombatantCard
                  combatant={c}
                  direction={slot.direction}
                  size="sm"
                  isActingTurn={c.uid === actorUid && phase === "active"}
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                        "rounded-xl border border-arcade-border bg-arcade-panel-light p-2.5 text-left transition-colors",
                        isReady ? "hover:border-gold" : "cursor-not-allowed opacity-50"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">{skill.name}</p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 font-arcade text-[7px] font-semibold uppercase text-white",
                            SKILL_TYPE_STYLES[skill.type]
                          )}
                        >
                          {skill.type}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-600">{skill.description}</p>
                      {!isReady && (
                        <p className="mt-1 text-[9px] font-semibold text-red-500">Cooldown {cooldownLeft}t</p>
                      )}
                    </button>
                  );
                })}
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
        <div ref={logEndRef} />
      </GlowPanel>

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
              <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
                <span className="inline-flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-gold-bright" /> +{formatNumber(stage.rewardGold)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" /> +{stage.rewardExp} EXP each
                </span>
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
