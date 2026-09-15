"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Zap } from "lucide-react";
import type { Creature, DungeonStage, Skill, StatusEffectType, UltimateSkill } from "@/types/game";
import { CreatureSprite, type Direction } from "@/components/ui/CreatureSprite";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LegendaryCardAura } from "@/components/ui/MythicCardAura";
import { useGameStore } from "@/lib/store";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { parseTierStageId } from "@/lib/difficultyTiers";
import { applyTamerBuffs } from "@/lib/tamerBuffs";
import { grantStageRewards } from "@/lib/battleRewards";
import { getBattlePacing } from "@/lib/battlePacing";
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
import { CombatantCard, STATUS_BADGE, STATUS_LABEL_KEY } from "./CombatantCard";
import { LrPassiveIntro } from "./LrPassiveIntro";
import { UltimateAttackIntro } from "./UltimateAttackIntro";
import { BattleControls } from "./BattleControls";
import { BattleResultScreen, type CreatureResultEntry, type TamerResultEntry } from "./BattleResultScreen";
import { useT } from "@/lib/i18n/useT";
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
// Display name for the World 1-1 first-clear gift — see lib/battleRewards.ts's own
// FIRST_CLEAR_GIFT_CREATURE_ID for the id this must stay in sync with.
const FIRST_CLEAR_GIFT_CREATURE_NAME = "Dragoon";
// `lunge` is the direction the attack tackle travels — toward the opposing cluster. Campaign is
// side-by-side, so it's mostly horizontal, with a slight vertical lean matching each side's
// top offset (enemies sit a touch higher than the party).
const ARENA_SLOTS: {
  side: "player" | "enemy";
  index: 0 | 1;
  left: string;
  top: string;
  direction: Direction;
  lunge: { x: number; y: number };
}[] = [
  { side: "player", index: 0, left: "25%", top: "40%", direction: "south-east", lunge: { x: 1, y: -0.18 } },
  { side: "player", index: 1, left: "15%", top: "50%", direction: "south-east", lunge: { x: 1, y: -0.18 } },
  { side: "enemy", index: 0, left: "75%", top: "35%", direction: "south-west", lunge: { x: -1, y: 0.18 } },
  { side: "enemy", index: 1, left: "85%", top: "45%", direction: "south-west", lunge: { x: -1, y: 0.18 } },
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
  const t = useT();
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
                  title={t(STATUS_LABEL_KEY[type])}
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
  // Orb Events reuse this screen via a synthetic mockStage (see app/(game)/combat/page.tsx) that
  // isn't a real Campaign stage — eventRewards is only ever set there, so it doubles as the
  // "this isn't really Campaign" flag everywhere below (rewards, stage-progress writes, exit/next
  // navigation).
  const isEventBattle = Boolean(stage.eventRewards);
  const t = useT();
  const recordStageStars = useGameStore((s) => s.recordStageStars);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerId = useGameStore((s) => s.equippedTamerId);
  const equippedTamerGear = useGameStore((s) => s.equippedTamerGear);
  const guild = useGameStore((s) => s.guild);
  const autoBattleEnabled = useGameStore((s) => s.autoBattleEnabled);
  const skipAnimationEnabled = useGameStore((s) => s.skipAnimationEnabled);
  const pacing = getBattlePacing(skipAnimationEnabled);

  // The next area in the same chapter, Easy tier (if one exists) — powers the results screen's
  // "Next Area" shortcut. Same-world guard means this naturally stays undefined past a chapter's
  // last area (the next global stageNumber belongs to a different, not-yet-available chapter).
  const nextAreaStage = isEventBattle
    ? undefined
    : DUNGEON_STAGES.find((s) => s.stageNumber === stage.stageNumber + 1 && s.world === stage.world);

  // Which owned gear is actually equipped right now — shared by the buff computation below and
  // the victory-reward block's Wind Set Effect (EXP +100%) check further down.
  const activeTamerGear = useMemo(() => {
    const equippedGearIds = new Set(Object.values(equippedTamerGear).filter(Boolean));
    return tamerInventory.filter((gear) => equippedGearIds.has(gear.id));
  }, [tamerInventory, equippedTamerGear]);

  // Buffed once at battle start (not reactively — mid-fight gear changes shouldn't retroactively
  // rescale an in-progress combatant's stats). gainCreatureExp/etc. below still use the original
  // unbuffed playerCreatures since only their ids matter there, not baseStats.
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
    applyLrPassives(buildInitialCombatants(buffedPlayerCreatures, enemyCreatures)).combatants
  );
  // Dokkan-style "Passive Skill" activation banner — every LR creature on either side always
  // activates the instant battle starts, regardless of stage/battle type (see LrPassiveIntro.tsx).
  // Computed once from the same (pure, deterministic) inputs as `combatants` above, so calling it
  // again here instead of threading a shared value through is cheap and safe.
  const [lrActivations] = useState<LrPassiveActivation[]>(
    () => applyLrPassives(buildInitialCombatants(buffedPlayerCreatures, enemyCreatures)).activations
  );
  const [introDismissed, setIntroDismissed] = useState(() => lrActivations.length === 0);
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
  // Holds the result screen back for a beat once the battle actually ends — settle() below fires
  // syncProgressToServer (plus item/achievement/guild-exp grants) fire-and-forget right as phase
  // flips, and a player who immediately hits Exit/Rematch on the result screen could otherwise
  // navigate away before any of that lands. Dokkan-style "results are being calculated" loading
  // beat doubles as exactly the pause that protects it. See useSyncGate's SYNC_PAUSE_MS.
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    // phase only ever moves one-way (active -> victory/defeat, never back) within a given battle
    // instance, so there's no reset branch to write here — just the timer for the forward case.
    if (phase === "active") return;
    const timeout = setTimeout(() => setShowResult(true), SYNC_PAUSE_MS);
    return () => clearTimeout(timeout);
  }, [phase]);
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null);
  // Pokémon-style takeover: replaces the skill menu with a message box for anything the removed
  // scrolling log used to carry (status effects landing/ticking, evasion, a combatant fainting
  // mid-fight — never plain "used X for N damage", which the arena's own damage-number/lunge
  // already communicates) — see resolveTurn's noticeEntries below. Turn advancement (and so the
  // enemy AI's own next move) is held until the player taps past it.
  const [pendingNotice, setPendingNotice] = useState<{ entries: BattleLogEntry[]; onDismiss: () => void } | null>(null);
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
  const [hitEvent, setHitEvent] = useState<{ hits: HitInfo[]; nonce: number }>({ hits: [], nonce: 0 });
  // uid of the combatant currently charging/unleashing an Ultimate Attack — see resolveTurn's
  // isUltimate branch, which holds this set for the charge-up delay before damage lands.
  const [activeUltimateUid, setActiveUltimateUid] = useState<{ uid: string; nonce: number }>({ uid: "", nonce: 0 });
  // See RaidBattleScreen.tsx's identical pair for the full reasoning — drives the epic gold
  // UltimateAttackIntro overlay, with the "resolve after the intro" continuation stashed in a ref
  // (captured at cast time) rather than a fixed setTimeout.
  const [ultimateAttack, setUltimateAttack] = useState<{ casterName: string; ultimate: UltimateSkill } | null>(null);
  const pendingUltimateResolveRef = useRef<(() => void) | null>(null);
  // Wall-clock battle start — captured once (in an effect, not during render, per the
  // react-hooks/purity rule against calling Date.now() directly in a render body), used to
  // compute elapsedSeconds on victory.
  const battleStartRef = useRef<number | null>(null);
  useEffect(() => {
    battleStartRef.current = Date.now();
  }, []);

  const actorUid = turnOrder[turnPointer];
  const actor = combatants.find((c) => c.uid === actorUid) ?? null;
  const isPlayerTurn = phase === "active" && actor?.side === "player";

  function resolveTurn(byUid: string, skill: Skill, explicitTargetUid: string | null) {
    const { combatants: next, logs, hits } = applyAction(combatants, byUid, skill, explicitTargetUid);
    const actingCombatant = combatants.find((c) => c.uid === byUid);
    const isUltimate = actingCombatant?.creature.ultimateSkill?.id === skill.id;

    const settle = () => {
      // Check for deaths
      const anyDeaths = next.some(c => c.side === "player" && !c.isAlive);
      if (anyDeaths) setHasDeaths(true);

      setCombatants(next);
      setPendingSkill(null);

      const enemiesAlive = next.some((c) => c.side === "enemy" && c.isAlive);
      const playersAlive = next.some((c) => c.side === "player" && c.isAlive);

      if (!enemiesAlive) {
      setPhase("victory");

      const isPerfectClear = playersAlive && next.filter(c => c.side === "player").every(c => c.isAlive);
      if (isPerfectClear && !isEventBattle) {
        useGameStore.getState().markStagePerfect(stage.id);
      }

      const stars = {
        noDeaths: !(hasDeaths || anyDeaths),
        noItems: true,
        underFiveTurns: turnCount < 5,
      };
      setStarsEarned(stars);
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - (battleStartRef.current ?? Date.now())) / 1000)));

      if (!rewardGranted) {
        setRewardGranted(true);
        // Called before recordStageStars below — grantStageRewards reads
        // dungeon.stageStars[stage.id] itself (to tell a first clear from a repeat), and that
        // write would make this exact id "already present" if it ran first.
        const result = grantStageRewards({ stage, playerCreatures, isEventBattle, activeTamerGear, guild });
        setRewardMultiplier(result.rewardMultiplier);
        setIsExpEventStage(result.isExpEventStage);
        setTamerResult(result.tamerResult);
        setCreatureResults(result.creatureResults);
        setSealCoinsDropped(result.sealCoinsDropped);
        setItemsDropped(result.itemsDropped);
        setFirstClearGift(result.firstClearGift);
        setTamerGearGranted(result.tamerGearGranted);
      }

      if (!isEventBattle) {
        recordStageStars(stage.id, stars);
      }
      return;
    }
    if (!playersAlive) {
      setPhase("defeat");
      // Tier-agnostic — losing on any difficulty still means "we went in and saw this area", so
      // the Chapter/Area list's NEW badge shouldn't keep claiming it's unseen (see
      // ChapterAreaList.tsx: NEW -> attempted-but-not-won (no badge) -> COMPLETED). Campaign-only —
      // an Orb Event's synthetic id ("event-orb-training-hard") isn't a real stage and would otherwise
      // get misparsed by parseTierStageId (which only knows Campaign's tier suffixes).
      if (!stage.eventRewards) {
        useGameStore.getState().markStageAttempted(parseTierStageId(stage.id).baseId);
      }
      return;
    }

    // Increment turn count when cycling back to start
    const advanceTurn = () => {
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

    // "attack"/"heal"/"guard" lines are already communicated by the floating damage/heal number
    // and the skill-menu action itself — only status-effect-class beats (poison ticking,
    // paralysis/sleep skipping a turn, a status landing, evasion, a mid-fight faint) get the
    // Pokémon-style takeover, and it holds the next turn (this battle's own enemy-AI effect
    // included) until the player taps past it.
    const noticeEntries = logs.filter((l) => l.kind === "info" || l.kind === "defeat");
    if (noticeEntries.length > 0 && !skipAnimationEnabled) {
      setPendingNotice({ entries: noticeEntries, onDismiss: advanceTurn });
    } else {
      advanceTurn();
    }
    };

    const playAttackThenSettle = () => {
      if (skill.type === "Attack") {
        setAttackEvent((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
        // Let the lunge travel most of the way before the hit actually "lands" (damage number,
        // shake, HP change) — used to be fully simultaneous with the sprite starting to move,
        // which made it look like the damage was already decided before the attack happened.
        setTimeout(() => {
          if (hits.length > 0) setHitEvent((prev) => ({ hits, nonce: prev.nonce + 1 }));
          settle();
        }, pacing.lungeDelayMs);
      } else {
        if (hits.length > 0) setHitEvent((prev) => ({ hits, nonce: prev.nonce + 1 }));
        settle();
      }
    };

    if (isUltimate && actingCombatant?.creature.ultimateSkill && !skipAnimationEnabled) {
      // Play the charge-up aura on the caster immediately, but damage waits for the epic
      // UltimateAttackIntro overlay to actually dismiss (tap, or its own ~3.2s auto-timer)
      // instead of a fixed setTimeout — see handleUltimateIntroDismiss below.
      setActiveUltimateUid((prev) => ({ uid: byUid, nonce: prev.nonce + 1 }));
      setUltimateAttack({ casterName: actingCombatant.creature.name, ultimate: actingCombatant.creature.ultimateSkill });
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

  // Enemy turns resolve themselves after a short "thinking" delay — and, under Auto-Battle, so
  // do the player's own turns, via the exact same side-agnostic pickEnemyAction. Held back by
  // !introDismissed so a side that happens to win the SPD-sorted turn order can't act (and land
  // damage) while the passive activation banner is still covering the screen — re-fires once
  // introDismissed flips true, same as any other dependency change.
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
    const onDismiss = pendingNotice?.onDismiss;
    setPendingNotice(null);
    onDismiss?.();
  }

  const players = combatants.filter((c) => c.side === "player");
  const enemies = combatants.filter((c) => c.side === "enemy");
  const arenaBg = ARENA_BACKGROUNDS[stage.world];

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
          <h1 className="font-arcade text-lg glow-text-gold">
            {t("battle.world_label")} {stage.world}-{stage.worldStageNumber}
          </h1>
          <p className="text-xs text-zinc-500">{stage.name} · {t("battle.turn_battle_2v2")}</p>
        </div>
        <BattleControls />
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
                  // pointer-events-none: adjacent slots are close enough (see ARENA_SLOTS above)
                  // that a later slot's transparent wrapper sits visually on top of an earlier
                  // slot's clickable sprite and swallows its clicks — see CombatantCard.tsx's
                  // identical fix; its sprite button opts back in via pointer-events-auto.
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
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
                    hits={hitEvent.hits}
                    hitNonce={hitEvent.nonce}
                    isCastingUltimate={activeUltimateUid.uid === c.uid}
                    lungeVector={slot.lunge}
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
                  {pendingNotice ? (
                    // Pokémon-style takeover — replaces the skill menu (not a separate popup) for
                    // status-effect-class beats (poison ticking, paralysis/sleep, a status
                    // landing, evasion, a mid-fight faint). Tap anywhere to continue; the turn
                    // (and this battle's own enemy-AI effect) doesn't advance until dismissed.
                    <button
                      onClick={dismissNotice}
                      className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-center"
                    >
                      {pendingNotice.entries.map((entry) => (
                        <p
                          key={entry.id}
                          className={cn(
                            "font-arcade text-xs sm:text-sm",
                            entry.kind === "defeat" ? "text-red-400" : "text-gold-bright"
                          )}
                        >
                          {t(entry.key, entry.params)}
                        </p>
                      ))}
                      <p className="mt-1 animate-pulse text-[9px] uppercase tracking-widest text-zinc-400 sm:text-[10px]">
                        {t("common.tap_to_continue")}
                      </p>
                    </button>
                  ) : isPlayerTurn && actor && !autoBattleEnabled ? (
                    <>
                      <div className="mb-2 sm:mb-3 flex items-center justify-between">
                        <p className="font-arcade text-[10px] sm:text-xs text-white">
                          {t("battle.what_will_do_prefix")}<span className="text-gold">{actor.creature.name}</span>{t("battle.what_will_do_suffix")}
                        </p>
                        {pendingSkill && (
                          <button
                            onClick={() => setPendingSkill(null)}
                            className="text-[9px] sm:text-[10px] text-zinc-300 underline underline-offset-2 hover:text-white"
                          >
                            {t("battle.cancel")}
                          </button>
                        )}
                      </div>
                      {pendingSkill ? (
                        <p className="text-[10px] sm:text-xs text-zinc-300 mt-6 text-center">
                          {t("battle.select_enemy_target")}
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
                                    {/* Name on its own row (not sharing space with the cost/type
                                        badges) — sharing a row squeezed the name down to roughly
                                        half the button's width, truncating longer names (e.g.
                                        "Garuru Cannon Lockdown") on a narrow phone-width 2-column
                                        grid even at the smallest text size. */}
                                    <p className="text-xs sm:text-sm lg:text-base font-bold text-white truncate">{skill.name}</p>
                                    <div className="mt-1 flex items-center gap-1">
                                      <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-arcade text-[8px] sm:text-[10px] lg:text-xs font-semibold text-sky-300">
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
                                      <p className="mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-red-400">{t("battle.cooldown")} {cooldownLeft}t</p>
                                    )}
                                    {cooldownLeft <= 0 && actor.resonance < cost && (
                                      <p className="mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-sky-400">{t("battle.needs")} {cost} {t("battle.resonance")}</p>
                                    )}
                                  </button>
                                );
                              })}
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
                                  "relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-gold-bright bg-gradient-to-r from-amber-950/60 via-fuchsia-950/50 to-sky-950/60 p-2 sm:p-3 text-left transition-colors",
                                  isReady ? "hover:brightness-125" : "cursor-not-allowed opacity-50"
                                )}
                              >
                                <LegendaryCardAura />
                                <p className="relative text-xs sm:text-sm lg:text-base font-bold text-white truncate">{ultimate.name}</p>
                                <div className="relative mt-1 flex items-center gap-1">
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/20 px-1.5 py-0.5 font-arcade text-[8px] sm:text-[10px] lg:text-xs font-semibold text-sky-300">
                                    <Zap className="h-2 w-2 sm:h-2.5 sm:w-2.5" />{cost}
                                  </span>
                                  <span className="rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-sky-500 px-1.5 py-0.5 font-arcade text-[8px] sm:text-[10px] lg:text-xs font-semibold uppercase text-white">
                                    {t("battle.ultimate_badge")}
                                  </span>
                                </div>
                                {!isReady && (
                                  <p className="relative mt-1 text-[9px] sm:text-[11px] lg:text-xs font-semibold text-sky-400">{t("battle.needs")} {cost} {t("battle.resonance")}</p>
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
                        {actor ? `${actor.creature.name}${t("battle.is_thinking_suffix")}` : t("battle.waiting")}
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
                  hits={hitEvent.hits}
                  hitNonce={hitEvent.nonce}
                  isCastingUltimate={activeUltimateUid.uid === c.uid}
                  lungeVector={{ x: 1, y: 0 }}
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
                  hits={hitEvent.hits}
                  hitNonce={hitEvent.nonce}
                  isCastingUltimate={activeUltimateUid.uid === c.uid}
                  lungeVector={{ x: -1, y: 0 }}
                />
              ))}
            </div>
          </GlowPanel>
        )}
      </div>

      {phase !== "active" && !showResult && (
        <LoadingOverlay show label={phase === "victory" ? t("battle.calculating_rewards") : t("battle.calculating_results")} />
      )}

      {phase !== "active" && showResult && (
        <BattleResultScreen
          nextHref={
            phase === "victory" && nextAreaStage ? `/combat?stage=${nextAreaStage.id}` : undefined
          }
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
            rewardMultiplier > 1 && t("battle.first_clear_bonus"),
            isExpEventStage && (
              <span className="inline-flex items-center gap-1 text-sky-500">
                <Zap className="h-3 w-3 fill-current" /> {t("battle.exp_event")}
              </span>
            ),
            firstClearGift &&
              (firstClearGift.isNew
                ? `${FIRST_CLEAR_GIFT_CREATURE_NAME}${t("battle.joined_roster_suffix")}`
                : `${t("battle.copy_owned_prefix")}${FIRST_CLEAR_GIFT_CREATURE_NAME}${t("battle.copy_owned_mid")}${firstClearGift.copies}${t("battle.copy_owned_suffix")}`),
            tamerGearGranted && `${tamerGearGranted}${t("battle.tamer_gear_unlocked_suffix")}`,
          ].filter((line): line is NonNullable<typeof line> => Boolean(line))}
          defeatMessage={t("battle.defeat_message_team")}
          onRematch={onRematch}
          exitHref={isEventBattle ? "/events" : `/campaign?chapter=${stage.world}`}
          onExitClick={onExit}
          exitLabel={t("battle.exit")}
        />
      )}
    </div>
  );
}
