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
const VENOMSHADE = findBase("cr-venomshade");
const EMBERFIEND = findBase("cr-emberfiend");
const THUNDRACOIL = findBase("cr-thundracoil");
const SILVER_DRAGON = findBase("cr-silver-dragon");
const GALE_SPRITE = findBase("cr-gale-sprite");
const WARGEK = findBase("cr-wargek");
const FIREFEX = findBase("cr-firefex");
const STARWEAVER = findBase("cr-starweaver");
const BLITZFIRE = findBase("cr-blitzfire");
const CRIMSON_GUARDIAN = findBase("cr-crimson-guardian");
const GOLDAK = findBase("cr-goldak");
const POSEIDON = findBase("cr-poseidon");
const GALLANTKNIGHT = findBase("cr-gallantknight");
const EMPERORTOISE = findBase("cr-emperortoise");
const OMEGA = findBase("cr-omega");
const ABADDO = findBase("cr-abaddo");

// Damps enemy HP/ATK/DEF below the raw per-stage growth curve, tapering gradually across all 8
// stages instead of a cliff after stage 2 — smooths out what used to be a late-game difficulty
// spike (DEF in particular used to be completely undamped even at stage 1, and each DEF point
// cancels a meaningful chunk of raw damage per lib/combat.ts's calcDamage, so leaving it unscaled
// made mid/late fights drag on far more than HP/ATK alone suggested). The boss stage (8) is the
// only one that reaches the fully undamped curve.
const EARLY_STAGE_HP_DAMPING: Record<number, number> = { 1: 0.4, 2: 0.55, 3: 0.65, 4: 0.72, 5: 0.8, 6: 0.85, 7: 0.92, 8: 1.0 };
const EARLY_STAGE_ATK_DAMPING: Record<number, number> = { 1: 0.6, 2: 0.7, 3: 0.78, 4: 0.84, 5: 0.88, 6: 0.92, 7: 0.96, 8: 1.0 };
const EARLY_STAGE_DEF_DAMPING: Record<number, number> = { 1: 0.5, 2: 0.6, 3: 0.68, 4: 0.75, 5: 0.82, 6: 0.88, 7: 0.94, 8: 1.0 };

/** Scales a catalog creature up for a given world's stage (by its 1-8 position within that
 * world, not the global stage number) — a boss gets an extra bump on top of the normal per-stage
 * growth, so it clearly outclasses the regular stages leading into it. The curve itself is shared
 * across worlds; each world escalates by starting from a stronger catalog tier instead (see
 * WORLD_2_ENEMY_TEMPLATES below). */
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

/** World 2's fixed enemy line-up — a step up from World 1's catalog tier (Venomshade/Emberfiend
 * are Dark, Thundracoil is SSR), same stage-by-stage shape: two early creatures alternate,
 * a third joins at stage 6, and the Mythic Silver Dragon closes the world out as boss. */
const WORLD_2_ENEMY_TEMPLATES: Record<number, [Creature, Creature]> = {
  1: [VENOMSHADE, VENOMSHADE],
  2: [VENOMSHADE, EMBERFIEND],
  3: [EMBERFIEND, VENOMSHADE],
  4: [EMBERFIEND, EMBERFIEND],
  5: [VENOMSHADE, EMBERFIEND],
  6: [EMBERFIEND, THUNDRACOIL],
  7: [THUNDRACOIL, THUNDRACOIL],
  8: [SILVER_DRAGON, THUNDRACOIL],
};

const WORLD_3_ENEMY_TEMPLATES: Record<number, [Creature, Creature]> = {
  1: [GALE_SPRITE, GALE_SPRITE],
  2: [GALE_SPRITE, WARGEK],
  3: [WARGEK, GALE_SPRITE],
  4: [WARGEK, WARGEK],
  5: [GALE_SPRITE, WARGEK],
  6: [WARGEK, FIREFEX],
  7: [FIREFEX, FIREFEX],
  8: [WARGEK, FIREFEX],
  9: [FIREFEX, STARWEAVER],
  10: [STARWEAVER, FIREFEX],
  11: [STARWEAVER, STARWEAVER],
  12: [STARWEAVER, FIREFEX],
};

const WORLD_4_ENEMY_TEMPLATES: Record<number, [Creature, Creature]> = {
  1: [BLITZFIRE, BLITZFIRE],
  2: [BLITZFIRE, CRIMSON_GUARDIAN],
  3: [CRIMSON_GUARDIAN, BLITZFIRE],
  4: [CRIMSON_GUARDIAN, CRIMSON_GUARDIAN],
  5: [BLITZFIRE, CRIMSON_GUARDIAN],
  6: [CRIMSON_GUARDIAN, GOLDAK],
  7: [GOLDAK, GOLDAK],
  8: [CRIMSON_GUARDIAN, GOLDAK],
  9: [GOLDAK, POSEIDON],
  10: [POSEIDON, GOLDAK],
  11: [POSEIDON, POSEIDON],
  12: [POSEIDON, GOLDAK],
};

const WORLD_5_ENEMY_TEMPLATES: Record<number, [Creature, Creature]> = {
  1: [GALLANTKNIGHT, GALLANTKNIGHT],
  2: [GALLANTKNIGHT, EMPERORTOISE],
  3: [EMPERORTOISE, GALLANTKNIGHT],
  4: [EMPERORTOISE, EMPERORTOISE],
  5: [GALLANTKNIGHT, EMPERORTOISE],
  6: [EMPERORTOISE, OMEGA],
  7: [OMEGA, OMEGA],
  8: [EMPERORTOISE, OMEGA],
  9: [OMEGA, ABADDO],
  10: [ABADDO, OMEGA],
  11: [ABADDO, ABADDO],
  12: [OMEGA, ABADDO],
  13: [ABADDO, ABADDO],
  14: [ABADDO, OMEGA],
};

const ENEMY_TEMPLATES_BY_WORLD: Record<number, Record<number, [Creature, Creature]>> = {
  1: WORLD_1_ENEMY_TEMPLATES,
  2: WORLD_2_ENEMY_TEMPLATES,
  3: WORLD_3_ENEMY_TEMPLATES,
  4: WORLD_4_ENEMY_TEMPLATES,
  5: WORLD_5_ENEMY_TEMPLATES,
};

/** Returns this stage's fixed 2-enemy team, or null for stages without defined content yet. */
export function getStageEnemyTeam(stage: Pick<DungeonStage, "world" | "worldStageNumber">): [Creature, Creature] | null {
  const templates = ENEMY_TEMPLATES_BY_WORLD[stage.world]?.[stage.worldStageNumber];
  if (!templates) return null;
  const isBoss = (
    (stage.world === 1 && stage.worldStageNumber === 8) ||
    (stage.world === 2 && stage.worldStageNumber === 8) ||
    (stage.world === 3 && stage.worldStageNumber === 12) ||
    (stage.world === 4 && stage.worldStageNumber === 12) ||
    (stage.world === 5 && stage.worldStageNumber === 14)
  );
  return [
    scaleForStage(templates[0], stage.worldStageNumber, isBoss),
    scaleForStage(templates[1], stage.worldStageNumber, false),
  ];
}
