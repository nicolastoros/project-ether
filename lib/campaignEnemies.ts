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

// Stages 1-2 are most players' very first fights — often fought with only 1-2 starter
// creatures against a full 2-enemy team, with no reinforcements possible yet. Damping enemy HP
// well below the normal growth curve there keeps fights from dragging on, and a lighter ATK
// damping keeps 2 enemies' combined damage per round from just outracing a solo creature's own
// HP pool before it can even land the hits HP alone would need — DEF is left untouched. Stage 1
// gets the bigger cut since it's commonly fought solo, before the stage-1-clear Dragoon gift
// arrives; stage 2 eases back toward the normal curve.
const EARLY_STAGE_HP_DAMPING: Record<number, number> = { 1: 0.4, 2: 0.65 };
const EARLY_STAGE_ATK_DAMPING: Record<number, number> = { 1: 0.65, 2: 0.85 };

/** Scales a catalog creature up for a given world-1 stage — a boss gets an extra bump on top
 * of the normal per-stage growth, so it clearly outclasses the regular stages leading into it. */
function scaleForStage(base: Creature, worldStageNumber: number, isBoss: boolean): Creature {
  const growth = 1 + (worldStageNumber - 1) * 0.15;
  const mult = isBoss ? growth * 1.5 : growth;
  const hpMult = mult * (EARLY_STAGE_HP_DAMPING[worldStageNumber] ?? 1);
  const atkMult = mult * (EARLY_STAGE_ATK_DAMPING[worldStageNumber] ?? 1);
  return {
    ...base,
    level: Math.round(base.level + worldStageNumber * (isBoss ? 3 : 1.5)),
    baseStats: {
      hp: Math.round(base.baseStats.hp * hpMult),
      atk: Math.round(base.baseStats.atk * atkMult),
      def: Math.round(base.baseStats.def * mult),
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
