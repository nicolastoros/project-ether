"use client";

import { useMemo, useState } from "react";
import type { DungeonStage, Creature } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { pickRandomEnemies } from "@/lib/combat";
import { getStageEnemyTeam } from "@/lib/campaignEnemies";
import { syncProgressToServer } from "@/lib/syncProgress";
import { useSyncGate } from "@/lib/useSyncGate";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { TeamSelectScreen } from "./TeamSelectScreen";
import { BattleScreen } from "./BattleScreen";
import { SweepScreen } from "./SweepScreen";

interface BattlePageProps {
  stage: DungeonStage;
  /** Orb Event battles supply their own pre-built (real, on-theme) enemy pair here instead of
   * relying on getStageEnemyTeam's Campaign world/worldStageNumber lookup — see
   * app/(game)/combat/page.tsx and lib/eventData.ts's getEventEnemyTeam. */
  eventEnemies?: [Creature, Creature];
  /** Present only for Orb Event battles — gates Rematch behind the same attempt+Energy check
   * handleStart already does in EventsClient.tsx, instead of letting it re-fight for free. */
  eventMaxDailyAttempts?: number;
}

export function BattlePage({ stage, eventEnemies, eventMaxDailyAttempts }: BattlePageProps) {
  const creatures = useGameStore((s) => s.creatures);
  const spendEnergy = useGameStore((s) => s.spendEnergy);
  const consumeEventAttempt = useGameStore((s) => s.consumeEventAttempt);
  const partyCreatureIds = useGameStore((s) => s.partyCreatureIds);
  const [playerIds, setPlayerIds] = useState<string[]>(
    partyCreatureIds.filter((id): id is string => Boolean(id))
  );
  const [started, setStarted] = useState(false);
  const [isSweep, setIsSweep] = useState(false);
  const [battleKey, setBattleKey] = useState(0);
  const { gating, runGated } = useSyncGate();

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
          onStart={(sweep) =>
            runGated(() => {
              // Orb Event stages already had their Energy spent by EventsClient.tsx before
              // navigating here (it also gates the attempt itself) — spending again here would
              // silently double-charge every event battle.
              if (!stage.eventId && !spendEnergy(stage.staminaCost)) {
                alert("Not enough stamina!");
                return;
              }
              setIsSweep(sweep);
              setStarted(true);
            })
          }
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
            alert("Not enough stamina to re-sweep!");
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
        if (eventMaxDailyAttempts != null && stage.eventId) {
          if (useGameStore.getState().currencies.energy < stage.staminaCost) {
            alert("Not enough Energy!");
            return;
          }
          if (!consumeEventAttempt(stage.eventId, eventMaxDailyAttempts)) {
            alert("No daily attempts left for this event!");
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
