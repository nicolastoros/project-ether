import type { Language } from "./translations";

// Survival's Upgrade pool (lib/survival.ts, UPGRADE_POOL + WEAPON_META) — same separate-lookup
// pattern as skillDescriptions.ts: names stay in English (proper-noun rule, same as skill/weapon
// names elsewhere), only descriptions are localized.
export const UPGRADE_DESCRIPTION_ES: Record<string, string> = {
  vitality: "+25% de PS máx., totalmente restaurados.",
  "swift-fangs": "-15% de reutilización de ataque.",
  "power-strike": "+25% de daño de ataque.",
  "fleet-foot": "+15% de velocidad de movimiento.",
  "wide-net": "+30% de radio de recogida.",
  "twin-strike": "+1 objetivo por ataque.",
  dark: "Un orbe oscuro orbita a tu alrededor, disparando rayos de sombra al enemigo más cercano.",
  light: "Un orbe radiante orbita a tu alrededor, disparando rayos de luz al enemigo más cercano.",
  ice: "Dispara fragmentos de hielo con posibilidad de congelar al enemigo en el lugar.",
  thunder: "Rayos que se arquean y encadenan hacia enemigos cercanos.",
  "thunder-rain": "Invoca rayos aleatorios por todo el campo cada pocos segundos.",
  shield: "Te rodea con un campo dañino durante 4s. Se recarga en 6s.",
};

export function getUpgradeDescription(upgradeId: string, description: string, language: Language): string {
  if (language !== "es") return description;
  return UPGRADE_DESCRIPTION_ES[upgradeId] ?? description;
}
