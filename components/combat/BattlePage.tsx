"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DungeonStage, Creature } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { pickRandomEnemies } from "@/lib/combat";
import { getStageEnemyTeam } from "@/lib/campaignEnemies";
import { bestParty, partyPower } from "@/lib/power";
import { syncProgressToServer } from "@/lib/syncProgress";
import { useSyncGate } from "@/lib/useSyncGate";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { TeamSelectScreen } from "./TeamSelectScreen";
import { BattleScreen } from "./BattleScreen";
import { SweepScreen } from "./SweepScreen";
import { useT } from "@/lib/i18n/useT";

interface BattlePageProps {
  stage: DungeonStage;
  /** Orb Event battles supply their own pre-built (real, on-theme) enemy pair here instead of
   * relying on getStageEnemyTeam's Campaign world/worldStageNumber lookup — see
   * app/(game)/combat/page.tsx and lib/eventData.ts's getEventEnemyTeam. */
  eventEnemies?: [Creature, Creature];
  /** Present only for Orb Event battles — this stage's weekly attempt pool, used to actually
   * charge the attempt (+ Energy) right here in onStart/onRematch below, at the moment a battle
   * really starts — not back on ExtraTab.tsx's difficulty card, which only navigates now. */
  eventMaxWeeklyAttempts?: number;
  /** Set only by StageDetailModal.tsx's "Skip" button (?sweep=1) — an explicit click, never a
   * default. Jumps straight into a Sweep using the current default party instead of landing on
   * team-select just to click Sweep there. Re-validated here (not just trusted from the modal)
   * since the party could have changed between opening the modal and this page mounting. */
  autoSweep?: boolean;
}

export function BattlePage({ stage, eventEnemies, eventMaxWeeklyAttempts, autoSweep }: BattlePageProps) {
  const t = useT();
  const creatures = useGameStore((s) => s.creatures);
  const spendEnergy = useGameStore((s) => s.spendEnergy);
  const consumeEventAttempt = useGameStore((s) => s.consumeEventAttempt);
  const partyCreatureIds = useGameStore((s) => s.partyCreatureIds);
  const stageStars = useGameStore((s) => s.dungeon.stageStars);
  const [playerIds, setPlayerIds] = useState<string[]>(
    partyCreatureIds.filter((id): id is string => Boolean(id))
  );
  const [started, setStarted] = useState(false);
  const [isSweep, setIsSweep] = useState(false);
  const [battleKey, setBattleKey] = useState(0);
  const { gating, runGated } = useSyncGate();

  // Attempts to charge the stage's cost (Energy, or an Orb Event's weekly attempt) and, only on
  // success, actually start the battle/sweep — the exact sequence TeamSelectScreen's own Sweep/
  // Battle buttons trigger via onStart below, reused here for the ?sweep=1 auto-start path too.
  const attemptStart = (sweep: boolean) =>
    runGated(() => {
      if (stage.eventId) {
        if (useGameStore.getState().currencies.energy < stage.staminaCost) {
          alert(t("combat.error_not_enough_energy"));
          return;
        }
        if (eventMaxWeeklyAttempts == null || !consumeEventAttempt(stage.eventId, eventMaxWeeklyAttempts)) {
          alert(t("combat.error_no_attempts_left"));
          return;
        }
        spendEnergy(stage.staminaCost);
        syncProgressToServer();
      } else if (!spendEnergy(stage.staminaCost)) {
        alert(t("combat.error_not_enough_stamina"));
        return;
      }
      setIsSweep(sweep);
      setStarted(true);
    });

  // Fires at most once per mount — guards against re-triggering if the player exits back out of
  // a sweep (onExit flips `started` back to false) while the ?sweep=1 param is still in the URL.
  const autoSweepAttempted = useRef(false);
  useEffect(() => {
    if (!autoSweep || autoSweepAttempted.current || started) return;
    autoSweepAttempted.current = true;
    // Re-derive eligibility here (not trusted from the modal) against the 2 strongest owned
    // creatures — same "best fieldable team" StageDetailModal.tsx displayed as "your power", not
    // whatever's currently sitting in playerIds (a possibly-stale saved formation). Also actually
    // fields that team for the sweep itself (setPlayerIds below), so the rewards granted match the
    // power that made the button eligible in the first place.
    const topParty = bestParty(creatures, 2);
    const stars = stageStars[stage.id] || { noDeaths: false, noItems: false, underFiveTurns: false };
    const hasAllStars = stars.noDeaths && stars.noItems && stars.underFiveTurns;
    const isOverpowered = partyPower(topParty) >= stage.recommendedPower * 2;
    if (topParty.length === 0 || !(hasAllStars || isOverpowered)) return;
    // Same accepted "setState directly in a one-shot mount effect" shape as SweepScreen.tsx's own
    // grantStageRewards call — this whole effect only ever runs once, guarded above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerIds(topParty.map((c) => c.id));
    attemptStart(true);
    // Intentionally runs only on mount — see autoSweepAttempted guard above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enemyCreatures = useMemo(() => {
    if (eventEnemies) return eventEnemies;
    // Stages with a defined line-up (see lib/campaignEnemies.ts) always use it — only stages
    // without one yet fall back to random picks from the player's own collection.
    return getStageEnemyTeam(stage) ?? pickRandomEnemies(creatures, playerIds, 2);
    // Re-rolled only when a battle actually (re)starts, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, battleKey, stage]);

  if (!started) {
    return (
      <>
        <TeamSelectScreen
          stage={stage}
          creatures={creatures}
          selectedIds={playerIds}
          onToggle={(id) =>
            setPlayerIds((prev) => {
              if (prev.includes(id)) return prev.filter((x) => x !== id);
              if (prev.length >= 2) return prev;
              return [...prev, id];
            })
          }
          onSetTeam={(ids) => setPlayerIds(ids)}
          onStart={(sweep) => attemptStart(sweep)}
        />
        <LoadingOverlay show={gating} />
      </>
    );
  }

  const playerCreatures = playerIds
    .map((id) => creatures.find((c) => c.id === id))
    .filter((c): c is Creature => Boolean(c));

  if (playerCreatures.length < 1 || playerCreatures.length > 2 || enemyCreatures.length !== 2) {
    return null;
  }

  if (isSweep) {
    return (
      <SweepScreen 
        key={battleKey}
        stage={stage} 
        playerCreatures={playerCreatures} 
        onExit={() => {
          setStarted(false);
          setIsSweep(false);
          setPlayerIds(partyCreatureIds.filter((id): id is string => Boolean(id)));
        }} 
        onResweep={() => {
          if (!spendEnergy(stage.staminaCost)) {
            alert(t("combat.error_not_enough_stamina_resweep"));
            return;
          }
          setBattleKey((k) => k + 1);
        }}
      />
    );
  }

  return (
    <BattleScreen
      key={battleKey}
      stage={stage}
      playerCreatures={playerCreatures}
      enemyCreatures={[enemyCreatures[0], enemyCreatures[1]]}
      onRematch={() => {
        if (eventMaxWeeklyAttempts != null && stage.eventId) {
          if (useGameStore.getState().currencies.energy < stage.staminaCost) {
            alert(t("combat.error_not_enough_energy"));
            return;
          }
          if (!consumeEventAttempt(stage.eventId, eventMaxWeeklyAttempts)) {
            alert(t("combat.error_no_attempts_left"));
            return;
          }
          spendEnergy(stage.staminaCost);
          syncProgressToServer();
        }
        setBattleKey((k) => k + 1);
      }}
      onExit={() => {
        setStarted(false);
        setPlayerIds(partyCreatureIds.filter((id): id is string => Boolean(id)));
      }}
    />
  );
}
