import type { Creature, TamerEquipment, TamerSetEffect } from "@/types/game";
import { TAMER_CATALOG, TAMER_EQUIPMENT_CATALOG, TAMER_SET_EFFECTS } from "@/lib/gameData";
import { getDailyGuildBuff, getGuildBuffValue } from "@/lib/guildBuffs";

/** A set's TAMER_SET_EFFECTS entry activates only once every piece of that set is simultaneously
 * EQUIPPED — mixing in just some pieces (or owning the rest unequipped) never counts. `equippedGear`
 * must already be pre-filtered to equipped-only pieces, same as every call site already does
 * before calling applyTamerBuffs (see the equippedGearIds pattern in BattleScreen.tsx/
 * RaidBattleScreen.tsx/tamer/page.tsx). */
export function getActiveTamerSetEffects(equippedGear: TamerEquipment[]): TamerSetEffect[] {
  const equippedIdsBySet = new Map<string, Set<string>>();
  for (const gear of equippedGear) {
    if (!equippedIdsBySet.has(gear.setName)) equippedIdsBySet.set(gear.setName, new Set());
    equippedIdsBySet.get(gear.setName)!.add(gear.id);
  }

  const active: TamerSetEffect[] = [];
  for (const [setName, equippedIds] of equippedIdsBySet) {
    const effect = TAMER_SET_EFFECTS[setName];
    if (!effect) continue;
    const totalPieces = TAMER_EQUIPMENT_CATALOG.filter((g) => g.setName === setName).length;
    if (equippedIds.size >= totalPieces) active.push(effect);
  }
  return active;
}

/** Wind's "EXP +100%" Set Effect — a progression multiplier, not a combat stat, so it can't live
 * in applyTamerBuffs' percent pipeline below. Callers multiply their own EXP reward by
 * `1 + this` right alongside their existing first-clear/event multipliers (see BattleScreen.tsx/
 * RaidBattleScreen.tsx's victory-reward blocks). */
export function getTamerExpMultiplierBonus(equippedGear: TamerEquipment[]): number {
  return getActiveTamerSetEffects(equippedGear).reduce((sum, e) => sum + (e.expMultiplierBonus ?? 0), 0);
}

/** Clones a creature's baseStats scaled up by the Tamer's gear + avatar buffs — same clone-and-
 * adjust shape as lib/campaignEnemies.ts's scaleForStage, just for the player side instead of
 * enemies. Called once right before a battle starts (BattleScreen.tsx, RaidBattleScreen.tsx),
 * never mutates the stored Creature itself. */
export function applyTamerBuffs(
  creature: Creature,
  tamerInventory: TamerEquipment[],
  tamerId: string,
  tamerLevel: number,
  guildLevel?: number
): Creature {
  let hpPercent = 0;
  let atkPercent = 0;
  let defPercent = 0;
  let spdPercent = 0;
  let dpPercent = 0;
  let asPercent = 0;
  let htPercent = 0;
  let cdPercent = 0;
  let scdPercent = 0;
  let ctPercent = 0;

  for (const gear of tamerInventory) {
    hpPercent += gear.statBonus?.hp ?? 0;
    atkPercent += gear.statBonus?.atk ?? 0;
    defPercent += gear.statBonus?.def ?? 0;
    spdPercent += gear.statBonus?.spd ?? 0;
    dpPercent += gear.statBonus?.dp ?? 0;
    asPercent += gear.statBonus?.as ?? 0;
    htPercent += gear.statBonus?.ht ?? 0;
    cdPercent += gear.statBonus?.cd ?? 0;
    scdPercent += gear.statBonus?.scd ?? 0;
    ctPercent += gear.statBonus?.ct ?? 0;
  }

  // Full-set Set Effects (Aqua's Crit Rate, Thunder/Ice's ATK portion) fold into the same percent
  // pipeline as per-piece statBonus above — Wind's EXP bonus and Thunder/Ice's Skill Damage bonus
  // are handled separately (getTamerExpMultiplierBonus / skillDamageMult below), since neither
  // maps onto a percent stat here.
  const activeSetEffects = getActiveTamerSetEffects(tamerInventory);
  for (const effect of activeSetEffects) {
    hpPercent += effect.statBonus?.hp ?? 0;
    atkPercent += effect.statBonus?.atk ?? 0;
    defPercent += effect.statBonus?.def ?? 0;
    spdPercent += effect.statBonus?.spd ?? 0;
    dpPercent += effect.statBonus?.dp ?? 0;
    asPercent += effect.statBonus?.as ?? 0;
    htPercent += effect.statBonus?.ht ?? 0;
    cdPercent += effect.statBonus?.cd ?? 0;
    scdPercent += effect.statBonus?.scd ?? 0;
    ctPercent += effect.statBonus?.ct ?? 0;
  }
  const skillDamageMult = 1 + activeSetEffects.reduce((sum, e) => sum + (e.skillDamageBonus ?? 0), 0);

  const avatar = TAMER_CATALOG.find((t) => t.id === tamerId);
  if (avatar) {
    hpPercent += avatar.buffs.hpPercent ?? 0;
    atkPercent += avatar.buffs.atkPercent ?? 0;
    defPercent += avatar.buffs.defPercent ?? 0;
    spdPercent += avatar.buffs.spdPercent ?? 0;
    dpPercent += avatar.buffs.dpPercent ?? 0;
    asPercent += avatar.buffs.asPercent ?? 0;
    htPercent += avatar.buffs.htPercent ?? 0;
    cdPercent += avatar.buffs.cdPercent ?? 0;
    scdPercent += avatar.buffs.scdPercent ?? 0;
    ctPercent += avatar.buffs.ctPercent ?? 0;
    atkPercent += avatar.buffs.elementAtkBonus?.[creature.element] ?? 0;
  }

  if (
    hpPercent === 0 &&
    atkPercent === 0 &&
    defPercent === 0 &&
    spdPercent === 0 &&
    dpPercent === 0 &&
    asPercent === 0 &&
    htPercent === 0 &&
    cdPercent === 0 &&
    scdPercent === 0 &&
    ctPercent === 0 &&
    skillDamageMult === 1
  ) {
    return creature;
  }

  // Fetch the Tamer's base stats. If the avatar isn't found, default to 0 for all.
  const tamerBase = avatar?.baseStats ?? {
    hp: 0, atk: 0, def: 0, spd: 0, dp: 0, as: 0, ht: 0, cd: 0, scd: 0, ct: 0
  };

  // 1. Scale Tamer's base stats by level (e.g. +5% per level above 1).
  const levelMultiplier = 1 + (tamerLevel - 1) * 0.05;
  const scaledTamerHp = (tamerBase.hp * levelMultiplier);
  const scaledTamerAtk = (tamerBase.atk * levelMultiplier);
  const scaledTamerDef = (tamerBase.def * levelMultiplier);
  const scaledTamerSpd = (tamerBase.spd * levelMultiplier);
  const scaledTamerDp = ((tamerBase.dp ?? 0) * levelMultiplier);
  const scaledTamerAs = ((tamerBase.as ?? 0) * levelMultiplier);
  const scaledTamerHt = ((tamerBase.ht ?? 0) * levelMultiplier);
  const scaledTamerCd = ((tamerBase.cd ?? 0) * levelMultiplier);
  const scaledTamerScd = ((tamerBase.scd ?? 0) * levelMultiplier);
  const scaledTamerCt = ((tamerBase.ct ?? 0) * levelMultiplier);

  // 2. Apply percentage buffs from equipment/avatar onto the Tamer's scaled stats.
  // Then ADD these final flat values to the creature's own base stats.
  const finalTamerHp = Math.round(scaledTamerHp * (1 + hpPercent / 100));
  const finalTamerAtk = Math.round(scaledTamerAtk * (1 + atkPercent / 100));
  const finalTamerDef = Math.round(scaledTamerDef * (1 + defPercent / 100));
  const finalTamerSpd = Math.round(scaledTamerSpd * (1 + spdPercent / 100));
  const finalTamerDp = Math.round(scaledTamerDp * (1 + dpPercent / 100));
  const finalTamerAs = Math.round(scaledTamerAs * (1 + asPercent / 100));
  const finalTamerHt = Math.round(scaledTamerHt * (1 + htPercent / 100));
  const finalTamerCd = Math.round(scaledTamerCd * (1 + cdPercent / 100));
  const finalTamerScd = Math.round(scaledTamerScd * (1 + scdPercent / 100));
  const finalTamerCt = Math.round(scaledTamerCt * (1 + ctPercent / 100));

  let guildHpBonus = 0;
  let guildAtkBonus = 0;
  let guildDefBonus = 0;

  if (guildLevel && guildLevel > 0) {
    const buffType = getDailyGuildBuff();
    const guildBuffs = getGuildBuffValue(guildLevel, buffType);
    guildHpBonus = Math.round(creature.baseStats.hp * (guildBuffs.hpPercent / 100));
    guildAtkBonus = Math.round(creature.baseStats.atk * (guildBuffs.atkPercent / 100));
    guildDefBonus = Math.round(creature.baseStats.def * (guildBuffs.defPercent / 100));
  }

  return {
    ...creature,
    baseStats: {
      ...creature.baseStats,
      hp: creature.baseStats.hp + finalTamerHp + guildHpBonus,
      atk: creature.baseStats.atk + finalTamerAtk + guildAtkBonus,
      def: creature.baseStats.def + finalTamerDef + guildDefBonus,
      spd: creature.baseStats.spd + finalTamerSpd,
      dp: (creature.baseStats.dp ?? 0) + finalTamerDp,
      as: (creature.baseStats.as ?? 0) + finalTamerAs,
      ht: (creature.baseStats.ht ?? 0) + finalTamerHt,
      cd: (creature.baseStats.cd ?? 0) + finalTamerCd,
      scd: (creature.baseStats.scd ?? 0) + finalTamerScd,
      ct: (creature.baseStats.ct ?? 0) + finalTamerCt,
    },
    skillDamageMult,
  };
}
