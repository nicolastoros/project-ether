import type { Creature, TamerEquipment } from "@/types/game";
import { TAMER_CATALOG } from "@/lib/gameData";

/** Clones a creature's baseStats scaled up by the Tamer's gear + avatar buffs — same clone-and-
 * adjust shape as lib/campaignEnemies.ts's scaleForStage, just for the player side instead of
 * enemies. Called once right before a battle starts (BattleScreen.tsx, RaidBattleScreen.tsx),
 * never mutates the stored Creature itself. */
export function applyTamerBuffs(
  creature: Creature,
  tamerInventory: TamerEquipment[],
  tamerId: string
): Creature {
  let hpPercent = 0;
  let atkPercent = 0;
  let defPercent = 0;
  let spdPercent = 0;

  for (const gear of tamerInventory) {
    hpPercent += gear.statBonus?.hp ?? 0;
    atkPercent += gear.statBonus?.atk ?? 0;
    defPercent += gear.statBonus?.def ?? 0;
    spdPercent += gear.statBonus?.spd ?? 0;
  }

  const avatar = TAMER_CATALOG.find((t) => t.id === tamerId);
  if (avatar) {
    hpPercent += avatar.buffs.hpPercent ?? 0;
    atkPercent += avatar.buffs.atkPercent ?? 0;
    defPercent += avatar.buffs.defPercent ?? 0;
    spdPercent += avatar.buffs.spdPercent ?? 0;
    atkPercent += avatar.buffs.elementAtkBonus?.[creature.element] ?? 0;
  }

  if (hpPercent === 0 && atkPercent === 0 && defPercent === 0 && spdPercent === 0) return creature;

  return {
    ...creature,
    baseStats: {
      hp: Math.round(creature.baseStats.hp * (1 + hpPercent / 100)),
      atk: Math.round(creature.baseStats.atk * (1 + atkPercent / 100)),
      def: Math.round(creature.baseStats.def * (1 + defPercent / 100)),
      spd: Math.round(creature.baseStats.spd * (1 + spdPercent / 100)),
    },
  };
}
