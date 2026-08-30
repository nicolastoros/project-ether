import { Element } from "@/types/game";

export interface EventDifficulty {
  id: string;
  name: string; // "Hard", "Super", "Super2", "Super3"
  staminaCost: number;
  recommendedLevel: number;
  enemyRarity: string; // "Common to Rare", "SSR", "Mythic", "LR"
  rewardAmount: { small: number; medium: number; large: number };
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  element: Element;
  maxDailyAttempts: number;
  difficulties: EventDifficulty[];
}

export const ORB_EVENTS: GameEvent[] = [
  {
    id: "event-orb-fire",
    name: "Blazing Fire Orbs",
    description: "Defeat Fire enemies to earn Fire Orbs for Potential Training.",
    element: "Fire",
    maxDailyAttempts: 2,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 15, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 20, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 30, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 30, medium: 10, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 50, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 40, medium: 20, large: 5 } },
      { id: "super3", name: "Super3", staminaCost: 80, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 50, medium: 30, large: 10 } },
    ]
  },
  {
    id: "event-orb-water",
    name: "Crashing Water Orbs",
    description: "Defeat Water enemies to earn Water Orbs for Potential Training.",
    element: "Water",
    maxDailyAttempts: 2,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 15, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 20, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 30, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 30, medium: 10, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 50, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 40, medium: 20, large: 5 } },
      { id: "super3", name: "Super3", staminaCost: 80, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 50, medium: 30, large: 10 } },
    ]
  },
  {
    id: "event-orb-nature",
    name: "Blooming Nature Orbs",
    description: "Defeat Nature enemies to earn Nature Orbs for Potential Training.",
    element: "Nature",
    maxDailyAttempts: 2,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 15, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 20, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 30, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 30, medium: 10, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 50, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 40, medium: 20, large: 5 } },
      { id: "super3", name: "Super3", staminaCost: 80, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 50, medium: 30, large: 10 } },
    ]
  },
  {
    id: "event-orb-light",
    name: "Radiant Light Orbs",
    description: "Defeat Light enemies to earn Light Orbs for Potential Training.",
    element: "Light",
    maxDailyAttempts: 2,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 15, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 20, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 30, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 30, medium: 10, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 50, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 40, medium: 20, large: 5 } },
      { id: "super3", name: "Super3", staminaCost: 80, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 50, medium: 30, large: 10 } },
    ]
  },
  {
    id: "event-orb-dark",
    name: "Abyssal Dark Orbs",
    description: "Defeat Dark enemies to earn Dark Orbs for Potential Training.",
    element: "Dark",
    maxDailyAttempts: 2,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 15, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 20, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 30, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 30, medium: 10, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 50, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 40, medium: 20, large: 5 } },
      { id: "super3", name: "Super3", staminaCost: 80, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 50, medium: 30, large: 10 } },
    ]
  },
  {
    id: "event-orb-electric",
    name: "Sparking Electric Orbs",
    description: "Defeat Electric enemies to earn Electric Orbs for Potential Training.",
    element: "Electric",
    maxDailyAttempts: 2,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 15, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 20, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 30, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 30, medium: 10, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 50, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 40, medium: 20, large: 5 } },
      { id: "super3", name: "Super3", staminaCost: 80, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 50, medium: 30, large: 10 } },
    ]
  },
  {
    id: "event-orb-neutral",
    name: "Basic Neutral Orbs",
    description: "Defeat Neutral enemies to earn Neutral Orbs for Potential Training.",
    element: "Neutral",
    maxDailyAttempts: 2,
    difficulties: [
      { id: "hard", name: "Hard", staminaCost: 15, recommendedLevel: 20, enemyRarity: "Common/Rare", rewardAmount: { small: 20, medium: 0, large: 0 } },
      { id: "super", name: "Super", staminaCost: 30, recommendedLevel: 40, enemyRarity: "SSR", rewardAmount: { small: 30, medium: 10, large: 0 } },
      { id: "super2", name: "Super2", staminaCost: 50, recommendedLevel: 60, enemyRarity: "Mythic", rewardAmount: { small: 40, medium: 20, large: 5 } },
      { id: "super3", name: "Super3", staminaCost: 80, recommendedLevel: 80, enemyRarity: "LR", rewardAmount: { small: 50, medium: 30, large: 10 } },
    ]
  }
];
