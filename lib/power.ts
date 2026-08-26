import type { Creature } from "@/types/game";

// No player-power number existed anywhere in the codebase before this — invented here for
// Expeditions' success-chance formula, calibrated so a fresh level-1 starter (~1080) lands close
// to World 1 stage 1's recommendedPower (1220, lib/gameData.ts), keeping the two numbers on a
// comparable felt scale even though nothing enforces recommendedPower today.
export function creaturePower(creature: Creature): number {
  const { hp, atk, def, spd } = creature.baseStats;
  return Math.round(hp * 0.5 + atk * 3 + def * 2 + spd * 1.5 + creature.level * 20);
}

export function partyPower(creatures: Creature[]): number {
  return creatures.reduce((sum, c) => sum + creaturePower(c), 0);
}
