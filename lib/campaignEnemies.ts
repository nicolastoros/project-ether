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

/** Scales a catalog creature up for a given world-1 stage — a boss gets an extra bump on top
 * of the normal per-stage growth, so it clearly outclasses the regular stages leading into it. */
function scaleForStage(base: Creature, worldStageNumber: number, isBoss: boolean): Creature {
  const growth = 1 + (worldStageNumber - 1) * 0.15;
  const mult = isBoss ? growth * 1.5 : growth;
  return {
    ...base,
    level: Math.round(base.level + worldStageNumber * (isBoss ? 3 : 1.5)),
    baseStats: {
      hp: Math.round(base.baseStats.hp * mult),
      atk: Math.round(base.baseStats.atk * mult),
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
