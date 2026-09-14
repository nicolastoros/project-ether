import type { Achievement } from "@/types/game";
import type { Language } from "./translations";

// Same pattern as itemDescriptions.ts/shopDescriptions.ts: a separate ES-only lookup keyed by the
// stable Achievement.id, instead of touching ACHIEVEMENTS in lib/gameData.ts.
export const ACHIEVEMENT_NAME_ES: Record<string, string> = {
  "ach-crimson-conqueror": "Conquistador Carmesí",
  "ach-early-access-2026": "Acceso Anticipado 2026",
  "ach-explorer-digital-world": "Explorador del Mundo Digital",
  "ach-survivor-class": "Clase Superviviente",
};

export const ACHIEVEMENT_DESCRIPTION_ES: Record<string, string> = {
  "ach-crimson-conqueror": "Derrota al jefe de incursión Paladín Carmesí en dificultad Super3.",
  "ach-early-access-2026": "Se unió al Mundo Digital durante 2026, antes de que las puertas se abrieran para todos.",
  "ach-explorer-digital-world": "Completa todas las etapas hasta el Mundo 5 en la Campaña.",
  "ach-survivor-class": "Completa la primera etapa del modo Supervivencia.",
};

export function getAchievementName(achievement: Achievement, language: Language): string {
  if (language !== "es") return achievement.name;
  return ACHIEVEMENT_NAME_ES[achievement.id] ?? achievement.name;
}

export function getAchievementDescription(achievement: Achievement, language: Language): string {
  if (language !== "es") return achievement.description;
  return ACHIEVEMENT_DESCRIPTION_ES[achievement.id] ?? achievement.description;
}
