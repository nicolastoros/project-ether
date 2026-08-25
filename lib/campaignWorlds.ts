// Groups DUNGEON_STAGES (lib/gameData.ts) by world for the Campaign map — mirrors
// lib/survivalStages.ts's SURVIVAL_WORLDS, but the stages themselves stay defined in
// gameData.ts since campaign progress/difficulty/rewards already live there.

export interface CampaignWorld {
  world: number;
  name: string;
  mapImage: string;
  isAvailable: boolean;
}

export const CAMPAIGN_WORLDS: CampaignWorld[] = [
  { world: 1, name: "Frontier Reaches", mapImage: "/assets/maps/battle_arena_world1.jpg", isAvailable: true },
  { world: 2, name: "???", mapImage: "/assets/maps/battle_arena_world2.jpg", isAvailable: false },
  { world: 3, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
];
