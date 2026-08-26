import type { Creature, DungeonStage } from "@/types/game";
import { STARTER_CREATURES } from "@/lib/gameData";

function findBase(id: string): Creature {
  const found = STARTER_CREATURES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown creature id: ${id}`);
  return found;
}

const FIREBIT = findBase("cr-firebit");
const DRAGOON = findBase("cr-dragoon");
const VOLTLING = findBase("cr-voltling");
const TIDEWARDEN = findBase("cr-tidewarden");

// Damps enemy HP/ATK/DEF below the raw per-stage growth curve, tapering gradually across all 8
// stages instead of a cliff after stage 2 — smooths out what used to be a late-game difficulty
// spike (DEF in particular used to be completely undamped even at stage 1, and each DEF point
// cancels a meaningful chunk of raw damage per lib/combat.ts's calcDamage, so leaving it unscaled
// made mid/late fights drag on far more than HP/ATK alone suggested). The boss stage (8) is the
// only one that reaches the fully undamped curve.
const EARLY_STAGE_HP_DAMPING: Record<number, number> = { 1: 0.4, 2: 0.55, 3: 0.65, 4: 0.72, 5: 0.8, 6: 0.85, 7: 0.92, 8: 1.0 };
const EARLY_STAGE_ATK_DAMPING: Record<number, number> = { 1: 0.6, 2: 0.7, 3: 0.78, 4: 0.84, 5: 0.88, 6: 0.92, 7: 0.96, 8: 1.0 };
const EARLY_STAGE_DEF_DAMPING: Record<number, number> = { 1: 0.5, 2: 0.6, 3: 0.68, 4: 0.75, 5: 0.82, 6: 0.88, 7: 0.94, 8: 1.0 };

/** Scales a catalog creature up for a given world-1 stage — a boss gets an extra bump on top
 * of the normal per-stage growth, so it clearly outclasses the regular stages leading into it. */
function scaleForStage(base: Creature, worldStageNumber: number, isBoss: boolean): Creature {
  const growth = 1 + (worldStageNumber - 1) * 0.12;
  const mult = isBoss ? growth * 1.3 : growth;
  const hpMult = mult * (EARLY_STAGE_HP_DAMPING[worldStageNumber] ?? 1);
  const atkMult = mult * (EARLY_STAGE_ATK_DAMPING[worldStageNumber] ?? 1);
  const defMult = mult * (EARLY_STAGE_DEF_DAMPING[worldStageNumber] ?? 1);
  return {
    ...base,
    level: Math.round(base.level + worldStageNumber * (isBoss ? 2 : 1)),
    baseStats: {
      hp: Math.round(base.baseStats.hp * hpMult),
      atk: Math.round(base.baseStats.atk * atkMult),
      def: Math.round(base.baseStats.def * defMult),
      spd: Math.round(base.baseStats.spd * (1 + (worldStageNumber - 1) * 0.03)),
    },
  };
}

/** World 1's fixed enemy line-up, stage by stage: Firebit/Dragoon carry the early stages,
 * Voltling joins at stage 6, and Tidewarden closes the world out as a boss with one minion. */
const WORLD_1_ENEMY_TEMPLATES: Record<number, [Creature, Creature]> = {
  1: [FIREBIT, FIREBIT],
  2: [FIREBIT, DRAGOON],
  3: [DRAGOON, FIREBIT],
  4: [DRAGOON, DRAGOON],
  5: [FIREBIT, DRAGOON],
  6: [DRAGOON, VOLTLING],
  7: [VOLTLING, VOLTLING],
  8: [TIDEWARDEN, VOLTLING],
};

/** Returns this stage's fixed 2-enemy team, or null for stages without defined content yet. */
export function getStageEnemyTeam(stage: Pick<DungeonStage, "world" | "worldStageNumber">): [Creature, Creature] | null {
  if (stage.world !== 1) return null;
  const templates = WORLD_1_ENEMY_TEMPLATES[stage.worldStageNumber];
  if (!templates) return null;
  const isBoss = stage.worldStageNumber === 8;
  return [
    scaleForStage(templates[0], stage.worldStageNumber, isBoss),
    scaleForStage(templates[1], stage.worldStageNumber, false),
  ];
}
