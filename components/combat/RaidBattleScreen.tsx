"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { ItemIcon } from "@/components/ui/ItemIcon";
import type { Creature, Skill } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { ITEM_CATALOG } from "@/lib/gameData";
import type { RaidBoss } from "@/lib/raidBosses";
import { grantItemOnServer, syncProgressToServer } from "@/lib/syncProgress";
import { applyTamerBuffs } from "@/lib/tamerBuffs";
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
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);

  const buffedPlayerCreatures = useMemo(
    () => playerCreatures.map((c) => applyTamerBuffs(c, tamerInventory, equippedTamerId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
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
  const [attackEvent, setAttackEvent] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });
  const [hitEvent, setHitEvent] = useState<{ uids: string[]; nonce: number }>({ uids: [], nonce: 0 });

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
      setLog((prev) => [...prev, { id: nextLogId(), kind: "info", message: `Victory! ${boss.name} has fallen.` }]);
      if (!rewardGranted) {
        setRewardGranted(true);
        addGold(boss.rewardGold);
        playerCreatures.forEach((c) => gainCreatureExp(c.id, boss.rewardExp));
        gainProfileExp(boss.rewardExp);

        const materialPool = ITEM_CATALOG.filter((i) => i.category === "Evolution" || i.category === "Crafting");
        if (materialPool.length > 0 && Math.random() * 100 < boss.itemDropChance) {
          const picked = materialPool[Math.floor(Math.random() * materialPool.length)];
          grantItem(picked.id, 1);
          grantItemOnServer(picked.id, 1);
          setItemDropped({ itemId: picked.id, quantity: 1 });
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
              onSelectTarget={pendingSkill && actor ? () => resolveTurn(actor.uid, pendingSkill, c.uid) : undefined}
              attackerUid={attackEvent.uid}
              attackNonce={attackEvent.nonce}
              hitUids={hitEvent.uids}
              hitNonce={hitEvent.nonce}
            />
          ))}
        </div>
      </GlowPanel>

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
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
                  <span className="inline-flex items-center gap-1">
                    <GoldCoinIcon className="h-3.5 w-3.5" /> +{formatNumber(boss.rewardGold)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" /> +{boss.rewardExp} EXP each
                  </span>
                </div>
                {itemDropped &&
                  (() => {
                    const item = ITEM_CATALOG.find((it) => it.id === itemDropped.itemId);
                    if (!item) return null;
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full border border-arcade-border bg-arcade-panel-light px-2 py-1 text-[10px] text-foreground">
                        <ItemIcon item={item} className="h-3 w-3" /> +{itemDropped.quantity} {item.name}
                      </span>
                    );
                  })()}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Your party was defeated. Bring more/stronger creatures next time!</p>
            )}
            <div className="flex gap-2">
              <PixelButton variant="ghost" className="flex-1" onClick={onRematch}>
                <RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Rematch
              </PixelButton>
              <PixelButton variant="gold" className="flex-1" onClick={onExit}>
                Return to Raids
              </PixelButton>
            </div>
          </GlowPanel>
        </motion.div>
      )}
    </div>
  );
}
