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
  // Worlds 4-12 have no stage content yet — listed so the world strip shows the full scope of the
  // campaign, each clearly marked locked. Reuses World 3's map image since it's never actually
  // rendered while isAvailable is false (CampaignHome shows a generic "Coming soon" panel instead).
  { world: 4, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 5, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 6, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 7, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 8, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 9, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 10, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 11, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
  { world: 12, name: "???", mapImage: "/assets/maps/battle_arena_world3.jpg", isAvailable: false },
];
