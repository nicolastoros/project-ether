"use client";

import { useMemo, useState } from "react";
import type { DungeonStage, Creature } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { pickRandomEnemies } from "@/lib/combat";
import { getStageEnemyTeam } from "@/lib/campaignEnemies";
import { TeamSelectScreen } from "./TeamSelectScreen";
import { BattleScreen } from "./BattleScreen";

interface BattlePageProps {
  stage: DungeonStage;
}

export function BattlePage({ stage }: BattlePageProps) {
  const creatures = useGameStore((s) => s.creatures);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [battleKey, setBattleKey] = useState(0);

  const enemyCreatures = useMemo(() => {
    // Stages with a defined line-up (see lib/campaignEnemies.ts) always use it — only stages
    // without one yet fall back to random picks from the player's own collection.
    return getStageEnemyTeam(stage) ?? pickRandomEnemies(creatures, playerIds, 2);
    // Re-rolled only when a battle actually (re)starts, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, battleKey, stage]);

  if (!started) {
    return (
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
        onStart={() => setStarted(true)}
      />
    );
  }

  const playerCreatures = playerIds
    .map((id) => creatures.find((c) => c.id === id))
    .filter((c): c is Creature => Boolean(c));

  if (playerCreatures.length < 1 || playerCreatures.length > 2 || enemyCreatures.length !== 2) {
    return null;
  }

  return (
    <BattleScreen
      key={battleKey}
      stage={stage}
      playerCreatures={playerCreatures}
      enemyCreatures={[enemyCreatures[0], enemyCreatures[1]]}
      onRematch={() => setBattleKey((k) => k + 1)}
      onExit={() => {
        setStarted(false);
        setPlayerIds([]);
      }}
    />
  );
}
