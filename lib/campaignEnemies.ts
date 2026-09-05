import type { Creature, DungeonStage } from "@/types/game";
import { STARTER_CREATURES } from "@/lib/gameData";
import { TIER_STAT_MULTIPLIERS } from "@/lib/difficultyTiers";
import { isFinalAreaOfChapter } from "@/lib/campaignChapters";

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
 * WORLD_2_ENEMY_TEMPLATES below). `tierMult` (from lib/difficultyTiers.ts's
 * TIER_STAT_MULTIPLIERS) layers a difficulty-tier scale-up on top — {1,1,1} for Easy reproduces
 * today's numbers exactly. */
function scaleForStage(
  base: Creature,
  worldStageNumber: number,
  isBoss: boolean,
  tierMult: { hp: number; atk: number; def: number }
): Creature {
  const growth = 1 + (worldStageNumber - 1) * 0.12;
  const mult = isBoss ? growth * 1.3 : growth;
  const hpMult = mult * (EARLY_STAGE_HP_DAMPING[worldStageNumber] ?? 1) * tierMult.hp;
  const atkMult = mult * (EARLY_STAGE_ATK_DAMPING[worldStageNumber] ?? 1) * tierMult.atk;
  const defMult = mult * (EARLY_STAGE_DEF_DAMPING[worldStageNumber] ?? 1) * tierMult.def;
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

/** Chapter 1's fixed enemy line-up, area by area (15 areas, up from the old 8-stage World 1):
 * Firebit/Dragoon carry the early areas, Voltling joins at area 6, Tidewarden takes over as the
 * mid-chapter threat, Venomshade escalates further, and GallantKnight — a literal Royal Knight —
 * joins for the finale, fitting "The Royal Knights" as the area-15 boss. */
const WORLD_1_ENEMY_TEMPLATES: Record<number, [Creature, Creature]> = {
  1: [FIREBIT, FIREBIT],
  2: [FIREBIT, DRAGOON],
  3: [DRAGOON, FIREBIT],
  4: [DRAGOON, DRAGOON],
  5: [FIREBIT, DRAGOON],
  6: [DRAGOON, VOLTLING],
  7: [VOLTLING, VOLTLING],
  8: [VOLTLING, TIDEWARDEN],
  9: [TIDEWARDEN, VOLTLING],
  10: [TIDEWARDEN, TIDEWARDEN],
  11: [TIDEWARDEN, VENOMSHADE],
  12: [VENOMSHADE, TIDEWARDEN],
  13: [VENOMSHADE, VENOMSHADE],
  14: [VENOMSHADE, GALLANTKNIGHT],
  15: [GALLANTKNIGHT, VENOMSHADE],
};

/** Chapter 2's fixed enemy line-up, area by area (15 areas, up from the old 8-stage World 2) — a
 * step up from Chapter 1's catalog tier: Starweaver/Emberfiend/Thundracoil are all SSR (versus
 * Chapter 1's Common/Rare opening roster), Crimson Guardian and Wargek join as Mythics mid-chapter,
 * and Silver Dragon — a fittingly luminous "protect the original world" Mythic — closes out area
 * 15 (global area 30) as the boss. None of these overlap Chapter 1's roster, keeping each
 * chapter's enemy cast visually distinct. */
const WORLD_2_ENEMY_TEMPLATES: Record<number, [Creature, Creature]> = {
  1: [STARWEAVER, STARWEAVER],
  2: [STARWEAVER, EMBERFIEND],
  3: [EMBERFIEND, STARWEAVER],
  4: [EMBERFIEND, EMBERFIEND],
  5: [STARWEAVER, EMBERFIEND],
  6: [EMBERFIEND, THUNDRACOIL],
  7: [THUNDRACOIL, THUNDRACOIL],
  8: [THUNDRACOIL, EMBERFIEND],
  9: [THUNDRACOIL, CRIMSON_GUARDIAN],
  10: [CRIMSON_GUARDIAN, THUNDRACOIL],
  11: [CRIMSON_GUARDIAN, CRIMSON_GUARDIAN],
  12: [CRIMSON_GUARDIAN, WARGEK],
  13: [WARGEK, CRIMSON_GUARDIAN],
  14: [WARGEK, SILVER_DRAGON],
  15: [SILVER_DRAGON, WARGEK],
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

/** Returns this stage's fixed 2-enemy team, or null for stages without defined content yet.
 * `stage.tier` (absent = Easy) applies the difficulty tier's extra stat multiplier on top of the
 * normal per-world-position scaling — see lib/difficultyTiers.ts. */
export function getStageEnemyTeam(
  stage: Pick<DungeonStage, "world" | "worldStageNumber" | "tier">
): [Creature, Creature] | null {
  const templates = ENEMY_TEMPLATES_BY_WORLD[stage.world]?.[stage.worldStageNumber];
  if (!templates) return null;
  // Chapters 1 and 2 (worlds 1-2) derive their boss position from real chapter content — see
  // lib/campaignChapters.ts. Worlds 3-5 are still dormant (no Chapter 3-4 content yet) and keep
  // their previous fixed boss positions directly since they aren't backed by a CampaignChapter
  // entry.
  const isBoss = (
    (stage.world === 1 && isFinalAreaOfChapter(1, stage.worldStageNumber)) ||
    (stage.world === 2 && isFinalAreaOfChapter(2, stage.worldStageNumber)) ||
    (stage.world === 3 && stage.worldStageNumber === 12) ||
    (stage.world === 4 && stage.worldStageNumber === 12) ||
    (stage.world === 5 && stage.worldStageNumber === 14)
  );
  const tierMult = TIER_STAT_MULTIPLIERS[stage.tier ?? "Easy"];
  return [
    scaleForStage(templates[0], stage.worldStageNumber, isBoss, tierMult),
    scaleForStage(templates[1], stage.worldStageNumber, false, tierMult),
  ];
}
