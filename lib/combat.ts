import type { Creature, Skill } from "@/types/game";

export type BattleSide = "player" | "enemy";

export interface BattleCombatant {
  uid: string;
  creature: Creature;
  side: BattleSide;
  currentHp: number;
  maxHp: number;
  cooldowns: Record<string, number>;
  guarding: boolean;
  isAlive: boolean;
}

export type BattleLogKind = "attack" | "heal" | "guard" | "defeat" | "info";

export interface BattleLogEntry {
  id: string;
  message: string;
  kind: BattleLogKind;
}

let uidCounter = 0;
export function nextLogId(): string {
  uidCounter += 1;
  return `log-${Date.now()}-${uidCounter}`;
}

export function createCombatant(creature: Creature, side: BattleSide, index: number): BattleCombatant {
  return {
    uid: `${side}-${index}-${creature.id}`,
    creature,
    side,
    currentHp: creature.baseStats.hp,
    maxHp: creature.baseStats.hp,
    cooldowns: {},
    guarding: false,
    isAlive: true,
  };
}

/** Picks `count` distinct random creatures from the pool, excluding the given ids. */
export function pickRandomEnemies(pool: Creature[], excludeIds: string[], count: number): Creature[] {
  const candidates = pool.filter((c) => !excludeIds.includes(c.id));
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export type SkillTargetMode = "choose-enemy" | "all-enemies" | "self" | "lowest-ally";

/** Infers who a skill can hit from its type + description, without new content-schema fields. */
export function getSkillTargetMode(skill: Skill): SkillTargetMode {
  if (skill.type === "Attack") {
    return skill.description.toLowerCase().includes("all enemies") ? "all-enemies" : "choose-enemy";
  }
  if (skill.type === "Support") return "lowest-ally";
  return "self"; // Defense skills all buff/guard the caster
}

export function calcDamage(attacker: Creature, defender: Creature, power: number, guarding: boolean): number {
  const atkScale = attacker.baseStats.atk / 100;
  const raw = power * atkScale;
  const mitigated = raw - defender.baseStats.def * 0.35;
  let dmg = Math.max(8, Math.round(mitigated));
  const variance = 0.9 + Math.random() * 0.2;
  dmg = Math.round(dmg * variance);
  if (guarding) dmg = Math.round(dmg * 0.5);
  return dmg;
}

export function calcHeal(caster: Creature, power: number): number {
  return Math.max(15, Math.round((power || 80) * (caster.baseStats.atk / 140)));
}

interface ApplyActionResult {
  combatants: BattleCombatant[];
  logs: BattleLogEntry[];
  hitUids: string[];
}

/** Resolves one actor using one skill against the current battle state, returning the next state. */
export function applyAction(
  prevCombatants: BattleCombatant[],
  actorUid: string,
  skill: Skill,
  explicitTargetUid: string | null
): ApplyActionResult {
  const list = prevCombatants.map((c) => ({ ...c, cooldowns: { ...c.cooldowns } }));
  const actor = list.find((c) => c.uid === actorUid);
  const logs: BattleLogEntry[] = [];
  const hitUids: string[] = [];
  if (!actor) return { combatants: list, logs, hitUids };

  const mode = getSkillTargetMode(skill);
  const opponents = list.filter((c) => c.side !== actor.side && c.isAlive);
  const allies = list.filter((c) => c.side === actor.side && c.isAlive);

  const strike = (target: BattleCombatant) => {
    const dmg = calcDamage(actor.creature, target.creature, skill.power, target.guarding);
    target.currentHp = Math.max(0, target.currentHp - dmg);
    target.guarding = false;
    hitUids.push(target.uid);
    logs.push({
      id: nextLogId(),
      kind: "attack",
      message: `${actor.creature.name} uses ${skill.name} on ${target.creature.name} for ${dmg} damage.`,
    });
    if (target.currentHp === 0 && target.isAlive) {
      target.isAlive = false;
      logs.push({ id: nextLogId(), kind: "defeat", message: `${target.creature.name} was defeated!` });
    }
  };

  if (mode === "choose-enemy") {
    const target = list.find((c) => c.uid === explicitTargetUid && c.isAlive) ?? opponents[0];
    if (target) strike(target);
  } else if (mode === "all-enemies") {
    opponents.forEach(strike);
  } else if (mode === "lowest-ally") {
    const target = allies.reduce<BattleCombatant | null>((lowest, c) => {
      if (!lowest) return c;
      return c.currentHp / c.maxHp < lowest.currentHp / lowest.maxHp ? c : lowest;
    }, null);
    if (target) {
      const heal = calcHeal(actor.creature, skill.power);
      target.currentHp = Math.min(target.maxHp, target.currentHp + heal);
      logs.push({
        id: nextLogId(),
        kind: "heal",
        message: `${actor.creature.name} uses ${skill.name}, healing ${target.creature.name} for ${heal} HP.`,
      });
    }
  } else {
    actor.guarding = true;
    logs.push({
      id: nextLogId(),
      kind: "guard",
      message: `${actor.creature.name} uses ${skill.name} and braces for the next hit.`,
    });
  }

  Object.keys(actor.cooldowns).forEach((skillId) => {
    actor.cooldowns[skillId] = Math.max(0, actor.cooldowns[skillId] - 1);
  });
  if (skill.cooldown > 0) actor.cooldowns[skill.id] = skill.cooldown;

  return { combatants: list, logs, hitUids };
}

/** Simple priority AI: heal a wounded ally, guard when low, otherwise attack the weakest foe. */
export function pickEnemyAction(
  actor: BattleCombatant,
  allCombatants: BattleCombatant[]
): { skill: Skill; targetUid: string | null } {
  const usableSkills = actor.creature.skills.filter(
    (s) => s.type !== "Passive" && (actor.cooldowns[s.id] ?? 0) <= 0
  );
  const allies = allCombatants.filter((c) => c.side === actor.side && c.isAlive);
  const opponents = allCombatants.filter((c) => c.side !== actor.side && c.isAlive);

  const supportSkill = usableSkills.find((s) => getSkillTargetMode(s) === "lowest-ally");
  const woundedAlly = allies.some((c) => c.currentHp / c.maxHp < 0.45);
  if (supportSkill && woundedAlly) {
    return { skill: supportSkill, targetUid: null };
  }

  const defenseSkill = usableSkills.find((s) => getSkillTargetMode(s) === "self");
  if (defenseSkill && actor.currentHp / actor.maxHp < 0.35 && Math.random() < 0.6) {
    return { skill: defenseSkill, targetUid: null };
  }

  const attackSkills = usableSkills.filter((s) => s.type === "Attack");
  const skill = attackSkills[Math.floor(Math.random() * attackSkills.length)] ?? usableSkills[0] ?? actor.creature.skills[0];
  const mode = getSkillTargetMode(skill);
  if (mode === "choose-enemy") {
    const target = opponents.reduce<BattleCombatant | null>((lowest, c) => {
      if (!lowest) return c;
      return c.currentHp < lowest.currentHp ? c : lowest;
    }, null);
    return { skill, targetUid: target?.uid ?? null };
  }
  return { skill, targetUid: null };
}
