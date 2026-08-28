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
  { world: 2, name: "Verdant Highlands", mapImage: "/assets/maps/battle_arena_world2_final.png", isAvailable: true },
  { world: 3, name: "Celestial Ascent", mapImage: "/assets/maps/w3_stage_select.png", isAvailable: true },
  { world: 4, name: "Neon Mirage", mapImage: "/assets/maps/w4_stage_select.png", isAvailable: true },
  { world: 5, name: "Cosmic Infinity", mapImage: "/assets/maps/w5_stage_select.png", isAvailable: true },
  { world: 6, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 7, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 8, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 9, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 10, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 11, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 12, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
];
