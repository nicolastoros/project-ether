import type { Creature } from "@/types/game";

// No player-power number existed anywhere in the codebase before this — invented here for
// Expeditions' success-chance formula, calibrated so a fresh level-1 starter (~1080) lands close
// to World 1 stage 1's recommendedPower (1220, lib/gameData.ts), keeping the two numbers on a
// comparable felt scale even though nothing enforces recommendedPower today.
// Takes just the two fields it actually needs (a Pick, not the full Creature) so server code that
// only has raw DB rows — no name/skills/sprite/etc — can compute power too, without faking up a
// whole Creature object. See lib/db/bigquery.ts's getGlobalRanking for that use.
export function creaturePower(creature: Pick<Creature, "baseStats" | "level">): number {
  const { hp, atk, def, spd } = creature.baseStats;
  return Math.round(hp * 0.5 + atk * 3 + def * 2 + spd * 1.5 + creature.level * 20);
}

export function partyPower(creatures: Creature[]): number {
  return creatures.reduce((sum, c) => sum + creaturePower(c), 0);
}

/** The `size` strongest owned creatures, strongest first — "the best team you could actually
 * field," not whatever's sitting in a possibly-stale saved formation. Used to show/gate the
 * Campaign power-skip before the player has picked a team yet (StageDetailModal.tsx,
 * BattlePage.tsx's auto-sweep) — partyCreatureIds only reflects whatever formation was saved,
 * which for most players is still the starter pair from account creation and badly understates
 * how strong their actual roster has become. */
export function bestParty(creatures: Creature[], size: number): Creature[] {
  return [...creatures].sort((a, b) => creaturePower(b) - creaturePower(a)).slice(0, size);
}
