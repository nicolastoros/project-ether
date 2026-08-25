// Content data for the Survival stage-select map — mirrors how lib/gameData.ts's
// DUNGEON_STAGES models Campaign, but kept separate since Survival's simulation
// (lib/survival.ts) already lives on its own too.

export interface SurvivalWorld {
  world: number;
  name: string;
  mapImage: string;
  isAvailable: boolean;
}

export interface SurvivalStage {
  id: string;
  /** Global index across all worlds (world 1 = 1-10, world 2 = 11-20, ...). */
  stageNumber: number;
  world: number;
  worldStageNumber: number;
  name: string;
  /** Survive this long to clear the stage — the run's own time-based difficulty
   * ramp (see updateSurvival) is what actually makes later stages harder. */
  targetSeconds: number;
  rewardGold: number;
  rewardGems: number;
}

export const STAGES_PER_WORLD = 10;

export const SURVIVAL_WORLDS: SurvivalWorld[] = [
  { world: 1, name: "Verdant Valley", mapImage: "/assets/maps/survivor_map1.png", isAvailable: true },
  { world: 2, name: "???", mapImage: "/assets/maps/survivor_map2.png", isAvailable: false },
  { world: 3, name: "???", mapImage: "/assets/maps/survivor_map3.png", isAvailable: false },
];

const WORLD_1_STAGE_NAMES = [
  "First Light",
  "Overgrowth",
  "Cracked Hollow",
  "Ashen Field",
  "Moonlit Trail",
  "Stormcall Ridge",
  "Deep Roots",
  "Frostbound Path",
  "Emberfall",
  "Valley's End",
];

function buildWorldStages(world: number, names: string[]): SurvivalStage[] {
  return names.map((name, i) => {
    const worldStageNumber = i + 1;
    const stageNumber = (world - 1) * STAGES_PER_WORLD + worldStageNumber;
    return {
      id: `sv-stage-${stageNumber}`,
      stageNumber,
      world,
      worldStageNumber,
      name,
      targetSeconds: 60 + i * 30, // 1:00 up to 5:30, one step harder per stage
      rewardGold: 100 + worldStageNumber * 40,
      rewardGems: 5 + worldStageNumber * 2,
    };
  });
}

export const SURVIVAL_STAGES: SurvivalStage[] = buildWorldStages(1, WORLD_1_STAGE_NAMES);
