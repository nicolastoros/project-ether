import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

/** Mock enhancement success rate: starts high, drops as +level climbs toward +10. */
export function enhancementSuccessRate(currentLevel: number): number {
  const rates = [95, 90, 85, 75, 65, 50, 40, 30, 20, 12];
  return rates[Math.min(currentLevel, rates.length - 1)];
}

/** Mock gold cost to enhance gear from currentLevel -> currentLevel + 1. */
export function enhancementGoldCost(currentLevel: number): number {
  return Math.round(500 * Math.pow(1.6, currentLevel));
}

export function xpPercent(exp: number, expToNextLevel: number): number {
  if (expToNextLevel <= 0) return 0;
  return Math.min(100, Math.round((exp / expToNextLevel) * 100));
}
