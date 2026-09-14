/** Spanish translations for RaidBoss/RaidEvent DESCRIPTIONS (lib/raidBosses.ts) — boss/event NAMES
 * stay untranslated (same "names are content, not chrome" rule as skill names — see
 * lib/i18n/skillDescriptions.ts's own comment). Kept as a separate lookup for the same reason: the
 * ~500-line RAID_BOSSES/RAID_EVENTS/CHALLENGE_EVENTS arrays never had to be touched. RAID_EVENTS
 * and CHALLENGE_EVENTS ids never collide (different prefixes), so one flat map covers both. */
import type { RaidBoss, RaidEvent } from "@/lib/raidBosses";
import type { Language } from "@/lib/i18n/translations";

export const RAID_BOSS_DESCRIPTIONS_ES: Record<string, string> = {
  "raid-crimson-paladin-hard": "El Caballero Sagrado despierta. Lleva un equipo completo para sobrevivir.",
  "raid-crimson-paladin-super": "El Caballero Sagrado desata su verdadero poder. HP insondable.",
  "raid-crimson-paladin-super2": "Un desafío catastrófico. Requiere creaturas perfeccionadas.",
  "raid-crimson-paladin-super3": "La prueba definitiva. Solo los más fuertes pueden prevalecer.",
  "raid-storm-eagle-hard": "El Águila de Tormenta despierta. Lleva un equipo completo para sobrevivir.",
  "raid-storm-eagle-super": "El Águila de Tormenta desata toda su furia. Tormentas eléctricas implacables.",
  "raid-storm-eagle-super2": "Un desafío catastrófico. Requiere creaturas perfeccionadas.",
  "raid-storm-eagle-super3": "La prueba definitiva. Solo los más fuertes pueden prevalecer.",
  "raid-xpaladin-hard": "Factor X despierta. Lleva un equipo completo para sobrevivir.",
  "raid-xpaladin-super": "Factor X desata su verdadero poder. Una amenaza inclasificable.",
  "raid-xpaladin-super2": "Un desafío catastrófico. Requiere creaturas perfeccionadas.",
  "raid-xpaladin-super3": "La prueba definitiva. Solo los más fuertes pueden prevalecer.",
  "raid-aqua-trial-hard": "3 habitantes de las profundidades se alzan juntos — notablemente más feroces que el nivel Hard de Scarlet Inferno. Gana Blue + Purple Chipsets.",
  "raid-aqua-trial-super": "El Soberano de las Profundidades se alza, flanqueado por sus más fuertes. Deliberadamente más duro que el Super de Scarlet Inferno.",
  "raid-wind-trial-hard": "3 espíritus del vendaval se alzan juntos — homólogo al nivel Hard de Aqua Trial en costo, recompensas y dificultad. Gana Blue + Purple Chipsets.",
  "raid-wind-trial-super": "Los mismos 3 espíritus, desatados a plena fuerza — homólogo al nivel Super de Aqua Trial.",
  "raid-crimson-trial-hard": "3 guardianes forjados en carmesí ponen a prueba tu determinación. Gana Blue Chipsets — 30 forjan una pieza Crimson.",
  "raid-crimson-trial-super": "3 creaturas Mythic de Fuego reales, a plena fuerza, todas a la vez. No apto para los desprevenidos.",
  "raid-thunder-trial-super": "3 creaturas Electric reales cobran vida a la vez — notablemente más feroces que el Super de Scarlet Inferno o el de Aqua Trial.",
  "raid-thunder-trial-super2": "La misma tormenta, desatada con más fuerza todavía. El Set Trial más difícil hasta ahora.",
  "raid-ice-trial-super": "3 creaturas plateadas y pálidas de escarcha descienden como una sola — homólogo al Super de Thunderclap Fury en todo menos el nombre.",
  "raid-ice-trial-super2": "El mismo hielo, desatado con más fuerza todavía — homólogo al Super2 de Thunderclap Fury.",
};

export const RAID_EVENT_DESCRIPTIONS_ES: Record<string, string> = {
  "event-crimson": "¡Desafía al Caballero Sagrado para demostrar tu valía y ganar recompensas masivas!",
  "event-storm-eagle": "Un majestuoso pájaro de trueno desciende sobre el Mundo Digital — sus alas por sí solas pueden arrasar montañas.",
  "event-factor-x": "Ha aparecido un caballero real no identificado, irradiando un poder que desafía toda clasificación.",
  "event-crimson-set": "3 intentos a la semana, compartidos entre Hard y Super. Gana Blue Chipsets para forjar la armadura Crimson en la Tienda.",
  "event-aqua-set": "3 intentos a la semana, compartidos entre Hard y Super — ambos más difíciles que los niveles de Scarlet Inferno. Gana Blue + Purple Chipsets para forjar la armadura Aqua en la Tienda.",
  "event-wind-set": "3 intentos a la semana, compartidos entre Hard y Super — homólogo a Aqua Trial en costo, recompensas y dificultad. Gana Blue + Purple Chipsets para forjar la armadura Wind en la Tienda.",
  "event-thunder-set": "3 intentos a la semana, compartidos entre Super y Super2 — sin nivel Hard, ambos más difíciles que los de cualquier otro set. Gana Blue + Purple + Green Chipsets para forjar la armadura Thunder en la Tienda.",
  "event-ice-set": "3 intentos a la semana, compartidos entre Super y Super2 — homólogo a Thunderclap Fury en costo, recompensas y dificultad. Gana Blue + Purple + Green Chipsets para forjar la armadura Ice en la Tienda.",
};

export function getRaidBossDescription(boss: RaidBoss, language: Language): string {
  if (language !== "es") return boss.description;
  return RAID_BOSS_DESCRIPTIONS_ES[boss.id] ?? boss.description;
}

export function getRaidEventDescription(event: RaidEvent, language: Language): string {
  if (language !== "es") return event.description;
  return RAID_EVENT_DESCRIPTIONS_ES[event.id] ?? event.description;
}
