import type { Creature, Rarity } from "@/types/game";

// Survival's player stats are their own separate scale (hp:100, damage:18, ...) from Digimon
// baseStats (hp:500-1000+) — this maps a chosen creature's rarity+level onto a multiplier over
// that separate scale, rather than trying to import baseStats directly. HP/damage scale with the
// full multiplier (where rarity should visibly matter for run difficulty); speed/pickup radius
// are dampened via sqrt so movement feel doesn't swing wildly just from which creature was picked.
const RARITY_MULTIPLIER: Record<Rarity, number> = { Common: 1, Rare: 1.15, SSR: 1.35, Mythic: 1.6, LR: 1.9 };

export interface SurvivalLoadout {
  hpMult: number;
  dmgMult: number;
  speedMult: number;
}

export const DEFAULT_SURVIVAL_LOADOUT: SurvivalLoadout = { hpMult: 1, dmgMult: 1, speedMult: 1 };

export function survivalLoadoutForCreature(creature: Creature): SurvivalLoadout {
  const mult = RARITY_MULTIPLIER[creature.rarity] * (1 + Math.min(creature.level, 100) * 0.005);
  return { hpMult: mult, dmgMult: mult, speedMult: Math.sqrt(mult) };
}
