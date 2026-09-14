import type { InventoryItem } from "@/types/game";
import type { Language } from "./translations";

// Same pattern as skillDescriptions.ts/raidDescriptions.ts: a separate ES-only lookup keyed by
// the stable InventoryItem.id, instead of touching ITEM_CATALOG in lib/gameData.ts directly.
// Graceful fallback to the English original for any id not yet translated.
export const ITEM_NAME_ES: Record<string, string> = {
  "it-rotten-egg": "Huevo Podrido",
  "it-chicken": "Pollo",
  "it-training-box": "Caja de Entrenamiento",
  "it-training-trx": "TRX de Entrenamiento",
  "it-training-dumbbell": "Mancuernas de Entrenamiento",
  "it-frontier-emblem": "Emblema de las Fronteras Lejanas",
  "it-sealed-key": "Llave de las Ruinas Selladas",
  "it-ember-shard": "Fragmento de Brasa",
  "it-aqua-core": "Núcleo Acuático",
  "it-verdant-seed": "Semilla Verdeante",
  "it-storm-crystal": "Cristal de Tormenta",
  "it-skin-crimson-emberling": "Piel Carmesí de Emberling",
  "it-legendary-ticket": "Boleto Legendario",
  "it-mythic-ticket": "Boleto Mítico",
  "it-awaken-coin": "Moneda de Despertar",
  "it-exchange-coin": "Moneda de Intercambio",
  "it-orb-small-fire": "Orbe Rojo Pequeño",
  "it-orb-medium-fire": "Orbe Rojo Mediano",
  "it-orb-large-fire": "Orbe Rojo Grande",
  "it-orb-small-water": "Orbe Azul Pequeño",
  "it-orb-medium-water": "Orbe Azul Mediano",
  "it-orb-large-water": "Orbe Azul Grande",
  "it-orb-small-nature": "Orbe Verde Pequeño",
  "it-orb-medium-nature": "Orbe Verde Mediano",
  "it-orb-large-nature": "Orbe Verde Grande",
  "it-orb-small-light": "Orbe Amarillo Pequeño",
  "it-orb-medium-light": "Orbe Amarillo Mediano",
  "it-orb-large-light": "Orbe Amarillo Grande",
  "it-orb-small-dark": "Orbe Morado Pequeño",
  "it-orb-medium-dark": "Orbe Morado Mediano",
  "it-orb-large-dark": "Orbe Morado Grande",
  "it-orb-small-electric": "Orbe Cian Pequeño",
  "it-orb-medium-electric": "Orbe Cian Mediano",
  "it-orb-large-electric": "Orbe Cian Grande",
  "it-orb-small-neutral": "Orbe Gris Pequeño",
  "it-orb-medium-neutral": "Orbe Gris Mediano",
  "it-orb-large-neutral": "Orbe Gris Grande",
  "it-chipset-blue": "Chip Azul",
  "it-chipset-golden": "Chip Dorado",
  "it-chipset-green": "Chip Verde",
  "it-chipset-purple": "Chip Morado",
};

export const ITEM_DESCRIPTION_ES: Record<string, string> = {
  "it-rotten-egg": "No es apto para comer, pero la Tienda igual paga oro por él.",
  "it-chicken": "Una comida abundante que restaura algo de la energía del Tamer.",
  "it-training-box": "Equipo básico de entrenamiento — una pequeña dosis de EXP para una Criatura.",
  "it-training-trx": "Bandas de resistencia para una buena sesión de entrenamiento — una dosis media de EXP.",
  "it-training-dumbbell": "Equipo de entrenamiento serio — la dosis individual de EXP más grande para una Criatura.",
  "it-frontier-emblem": "Prueba de haber derrotado al guardián más difícil del Mundo 1.",
  "it-sealed-key": "Una llave antigua que zumba levemente. Debe abrir algo.",
  "it-ember-shard": "Un fragmento cristalizado de energía pura de tipo Fuego.",
  "it-aqua-core": "Un fragmento cristalizado de energía pura de tipo Agua.",
  "it-verdant-seed": "Un fragmento cristalizado de energía pura de tipo Naturaleza.",
  "it-storm-crystal": "Un fragmento cristalizado de energía pura de tipo Eléctrico.",
  "it-skin-crimson-emberling": "Una apariencia alternativa para Emberling, envuelta en llamas carmesí más intensas.",
  "it-legendary-ticket": "Un boleto poco común usado para Invocaciones Legendarias. Puede invocar hasta rareza Mítica.",
  "it-mythic-ticket": "Un boleto ultra raro usado para Invocaciones LR. Puede invocar hasta rareza LR.",
  "it-awaken-coin": "Se usa para Despertar una criatura SSR en propiedad y convertirla en su forma Mítica.",
  "it-exchange-coin": "Canjéala por una criatura específica en el Intercambio de Criaturas de la Tienda.",
  "it-orb-small-fire": "Se usa para desbloquear potencial Rojo básico.",
  "it-orb-medium-fire": "Se usa para desbloquear potencial Rojo intermedio.",
  "it-orb-large-fire": "Se usa para desbloquear potencial Rojo avanzado.",
  "it-orb-small-water": "Se usa para desbloquear potencial Azul básico.",
  "it-orb-medium-water": "Se usa para desbloquear potencial Azul intermedio.",
  "it-orb-large-water": "Se usa para desbloquear potencial Azul avanzado.",
  "it-orb-small-nature": "Se usa para desbloquear potencial Verde básico.",
  "it-orb-medium-nature": "Se usa para desbloquear potencial Verde intermedio.",
  "it-orb-large-nature": "Se usa para desbloquear potencial Verde avanzado.",
  "it-orb-small-light": "Se usa para desbloquear potencial Amarillo básico.",
  "it-orb-medium-light": "Se usa para desbloquear potencial Amarillo intermedio.",
  "it-orb-large-light": "Se usa para desbloquear potencial Amarillo avanzado.",
  "it-orb-small-dark": "Se usa para desbloquear potencial Morado básico.",
  "it-orb-medium-dark": "Se usa para desbloquear potencial Morado intermedio.",
  "it-orb-large-dark": "Se usa para desbloquear potencial Morado avanzado.",
  "it-orb-small-electric": "Se usa para desbloquear potencial Cian básico.",
  "it-orb-medium-electric": "Se usa para desbloquear potencial Cian intermedio.",
  "it-orb-large-electric": "Se usa para desbloquear potencial Cian avanzado.",
  "it-orb-small-neutral": "Se usa para desbloquear potencial Gris básico.",
  "it-orb-medium-neutral": "Se usa para desbloquear potencial Gris intermedio.",
  "it-orb-large-neutral": "Se usa para desbloquear potencial Gris avanzado.",
  "it-chipset-blue": "Moneda de forja de Nivel 1 — forja piezas del set de armadura Carmesí.",
  "it-chipset-golden": "Moneda de forja de nivel para un futuro set de armadura.",
  "it-chipset-green": "Moneda de forja de nivel para un futuro set de armadura.",
  "it-chipset-purple": "Moneda de forja de nivel para un futuro set de armadura.",
};

export function getItemName(item: InventoryItem, language: Language): string {
  if (language !== "es") return item.name;
  return ITEM_NAME_ES[item.id] ?? item.name;
}

export function getItemDescription(item: InventoryItem, language: Language): string {
  if (language !== "es") return item.description;
  return ITEM_DESCRIPTION_ES[item.id] ?? item.description;
}

// TAMER_SET_EFFECTS (lib/gameData.ts) is keyed by setName ("Aqua", "Wind", "Thunder", "Ice") —
// same separate-lookup pattern as the rest of this file, just keyed by set name instead of id.
export const SET_EFFECT_DESCRIPTION_ES: Record<string, string> = {
  Aqua: "Prob. de Golpe Crítico +30%",
  Wind: "EXP +100%",
  Thunder: "ATQ +30% / Daño de Habilidad +20%",
  Ice: "ATQ +30% / Daño de Habilidad +20%",
};

export function getSetEffectDescription(setName: string, description: string, language: Language): string {
  if (language !== "es") return description;
  return SET_EFFECT_DESCRIPTION_ES[setName] ?? description;
}
