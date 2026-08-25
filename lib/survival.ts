import type { Direction } from "@/components/ui/CreatureSprite";

// A portrait-leaning ratio (0.8:1) rather than the original landscape 900x560 (1.61:1): on a
// phone the arena is always width-limited no matter how tall its container is, so the only real
// lever for making it look bigger there is making the world itself less wide relative to its
// height. Paired with the arena's container filling the page's available height (see
// SurvivalGame.tsx) rather than being sized off the sidebar/HUD's leftover space.
export const ARENA_WIDTH = 720;
export const ARENA_HEIGHT = 1080;

const PLAYER_RADIUS = 20;
const ENEMY_RADIUS_GRUNT = 14;
const ENEMY_RADIUS_ELITE = 20;
const GEM_RADIUS_SIMPLE = 6;
const GEM_RADIUS_MEDIUM = 10;
const PROJECTILE_RADIUS = 5;
const PROJECTILE_SPEED = 420;
// Kills should land close enough to the player to actually pick up the EXP gem they drop.
const ATTACK_RANGE = 260;
const CHAIN_RANGE = 140;
const FREEZE_DURATION_MS = 1400;
const SHIELD_BASE_RADIUS = 90;
const SHIELD_RADIUS_PER_LEVEL = 10;
const SHIELD_ACTIVE_MS = 4000;
const SHIELD_RECHARGE_MS = 6000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

const DIRECTION_SECTORS: Direction[] = [
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
  "north",
  "north-east",
];

/** Maps a movement vector to the nearest of the 8 idle-rotation directions. */
export function angleToDirection(dx: number, dy: number): Direction {
  if (dx === 0 && dy === 0) return "south";
  const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalized = (degrees + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return DIRECTION_SECTORS[index];
}

export type WeaponKind = "dark" | "light" | "ice" | "thunder" | "thunder-rain" | "shield";

export interface Weapon {
  kind: WeaponKind;
  level: number;
  timerMs: number;
  /** Only meaningful for "shield": whether it's currently fielded (vs. recharging). */
  shieldActive?: boolean;
}

/** Radius of the "shield" force field at a given weapon level — shared by the sim and the renderer. */
export function shieldRadius(level: number): number {
  return SHIELD_BASE_RADIUS + (level - 1) * SHIELD_RADIUS_PER_LEVEL;
}

interface WeaponMeta {
  name: string;
  description: string;
  icon: string;
  cooldownMs: number;
  damageMult: number;
}

export const WEAPON_META: Record<WeaponKind, WeaponMeta> = {
  dark: {
    name: "Dark Orb",
    description: "A dark orb orbits you, firing shadow bolts at the nearest foe.",
    icon: "/assets/ui/dark_orb_survivor.png",
    cooldownMs: 900,
    damageMult: 0.85,
  },
  light: {
    name: "Light Orb",
    description: "A radiant orb orbits you, firing beams of light at the nearest foe.",
    icon: "/assets/ui/light_orb_survivor.png",
    cooldownMs: 850,
    damageMult: 0.8,
  },
  ice: {
    name: "Ice Orb",
    description: "Fires ice shards with a chance to freeze the enemy in place.",
    icon: "/assets/ui/ice_orb_survivor.png",
    cooldownMs: 1100,
    damageMult: 0.7,
  },
  thunder: {
    name: "Thunder Orb",
    description: "Lightning bolts that arc and chain to nearby enemies.",
    icon: "/assets/ui/thunder_orb_survivor.png",
    cooldownMs: 1000,
    damageMult: 0.65,
  },
  "thunder-rain": {
    name: "Thunder Rain",
    description: "Calls down random lightning strikes across the field every few seconds.",
    icon: "/assets/ui/thunder_rain_survivor.png",
    cooldownMs: 5000,
    damageMult: 1.6,
  },
  shield: {
    name: "Force Shield",
    description: "Surrounds you with a damaging field for 4s. Recharges in 6s.",
    icon: "/assets/ui/shield_survivor.png",
    cooldownMs: SHIELD_RECHARGE_MS,
    damageMult: 0.55,
  },
};

export interface PlayerStats {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldownMs: number;
  attackTimerMs: number;
  projectileCount: number;
  pickupRadius: number;
  facing: Direction;
  weapons: Weapon[];
}

export type EnemyKind = "grunt" | "elite";

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  hitCooldownMs: number;
  frozenMs: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  lifeMs: number;
  kind?: WeaponKind;
  chainRemaining?: number;
  freezeChance?: number;
}

export type GemKind = "simple" | "medium";

export interface Gem {
  id: number;
  x: number;
  y: number;
  value: number;
  radius: number;
  kind: GemKind;
}

/** A brief expanding-ring marker where a Thunder Rain bolt struck the ground. */
export interface Strike {
  id: number;
  x: number;
  y: number;
  radius: number;
  ttlMs: number;
}

/** A brief line flash showing a chain-lightning jump between two enemies. */
export interface Bolt {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  ttlMs: number;
}

export type SurvivalPhase = "playing" | "paused" | "levelup" | "gameover" | "victory";

export interface SurvivalState {
  player: PlayerStats;
  enemies: Enemy[];
  projectiles: Projectile[];
  gems: Gem[];
  strikes: Strike[];
  bolts: Bolt[];
  level: number;
  xp: number;
  xpToNext: number;
  elapsedMs: number;
  kills: number;
  spawnTimerMs: number;
  phase: SurvivalPhase;
  pendingUpgradeIds: string[];
  idCounter: number;
  /** Reach this elapsed time to clear the stage (see lib/survivalStages.ts). */
  targetMs: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon?: string;
  apply: (player: PlayerStats) => void;
}

function addOrLevelWeapon(kind: WeaponKind) {
  return (p: PlayerStats) => {
    const existing = p.weapons.find((w) => w.kind === kind);
    if (existing) {
      existing.level += 1;
    } else {
      p.weapons.push({ kind, level: 1, timerMs: 0 });
    }
  };
}

const WEAPON_UPGRADES: Upgrade[] = (Object.keys(WEAPON_META) as WeaponKind[]).map((kind) => ({
  id: kind,
  name: WEAPON_META[kind].name,
  description: WEAPON_META[kind].description,
  icon: WEAPON_META[kind].icon,
  apply: addOrLevelWeapon(kind),
}));

export const UPGRADE_POOL: Upgrade[] = [
  {
    id: "vitality",
    name: "Vitality",
    description: "+25% max HP, fully restored.",
    apply: (p) => {
      p.maxHp = Math.round(p.maxHp * 1.25);
      p.hp = p.maxHp;
    },
  },
  {
    id: "swift-fangs",
    name: "Swift Fangs",
    description: "-15% attack cooldown.",
    apply: (p) => {
      p.attackCooldownMs = Math.max(150, Math.round(p.attackCooldownMs * 0.85));
    },
  },
  {
    id: "power-strike",
    name: "Power Strike",
    description: "+25% attack damage.",
    apply: (p) => {
      p.damage = Math.round(p.damage * 1.25);
    },
  },
  {
    id: "fleet-foot",
    name: "Fleet Foot",
    description: "+15% move speed.",
    apply: (p) => {
      p.speed = Math.round(p.speed * 1.15);
    },
  },
  {
    id: "wide-net",
    name: "Wide Net",
    description: "+30% pickup radius.",
    apply: (p) => {
      p.pickupRadius = Math.round(p.pickupRadius * 1.3);
    },
  },
  {
    id: "twin-strike",
    name: "Twin Strike",
    description: "+1 target per attack.",
    apply: (p) => {
      p.projectileCount += 1;
    },
  },
  ...WEAPON_UPGRADES,
];

export function rollUpgrades(count: number): string[] {
  const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((u) => u.id);
}

function createInitialPlayer(): PlayerStats {
  return {
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT / 2,
    hp: 100,
    maxHp: 100,
    speed: 160,
    damage: 18,
    attackCooldownMs: 650,
    attackTimerMs: 0,
    projectileCount: 1,
    pickupRadius: 95,
    facing: "south",
    weapons: [],
  };
}

export function createInitialState(targetSeconds: number = Infinity): SurvivalState {
  return {
    player: createInitialPlayer(),
    enemies: [],
    projectiles: [],
    gems: [],
    strikes: [],
    bolts: [],
    level: 1,
    xp: 0,
    xpToNext: 20,
    elapsedMs: 0,
    kills: 0,
    spawnTimerMs: 1000,
    phase: "playing",
    pendingUpgradeIds: [],
    idCounter: 1,
    targetMs: targetSeconds * 1000,
  };
}

function spawnEnemy(state: SurvivalState, elapsedSec: number): void {
  const edge = Math.floor(Math.random() * 4);
  let x: number;
  let y: number;
  if (edge === 0) {
    x = Math.random() * ARENA_WIDTH;
    y = -20;
  } else if (edge === 1) {
    x = ARENA_WIDTH + 20;
    y = Math.random() * ARENA_HEIGHT;
  } else if (edge === 2) {
    x = Math.random() * ARENA_WIDTH;
    y = ARENA_HEIGHT + 20;
  } else {
    x = -20;
    y = Math.random() * ARENA_HEIGHT;
  }

  const hpScale = 1 + elapsedSec * 0.045;
  const isElite = elapsedSec > 25 && Math.random() < 0.15;

  if (isElite) {
    const hp = Math.round(40 * hpScale);
    state.enemies.push({
      id: state.idCounter++,
      kind: "elite",
      x,
      y,
      hp,
      maxHp: hp,
      speed: 70,
      damage: 14,
      radius: ENEMY_RADIUS_ELITE,
      hitCooldownMs: 0,
      frozenMs: 0,
    });
  } else {
    const hp = Math.round(14 * hpScale);
    state.enemies.push({
      id: state.idCounter++,
      kind: "grunt",
      x,
      y,
      hp,
      maxHp: hp,
      speed: 95 + Math.random() * 30,
      damage: 8,
      radius: ENEMY_RADIUS_GRUNT,
      hitCooldownMs: 0,
      frozenMs: 0,
    });
  }
}

/**
 * Advances the simulation by dtMs, mutating state in place (this is a game-loop hot path, not React state).
 * `touchMove`, when given, is a joystick vector with each axis in [-1, 1] (magnitude below 1 means the
 * drag hasn't reached the joystick's max radius yet, so the player moves slower) and takes priority
 * over keyboard input — the two aren't meant to be mixed in the same session.
 */
export function updateSurvival(
  state: SurvivalState,
  dtMs: number,
  keys: Set<string>,
  touchMove?: { x: number; y: number } | null
): void {
  if (state.phase !== "playing") return;
  const dt = dtMs / 1000;
  const p = state.player;

  let mx = 0;
  let my = 0;
  if (touchMove && (touchMove.x !== 0 || touchMove.y !== 0)) {
    mx = touchMove.x;
    my = touchMove.y;
  } else {
    if (keys.has("w") || keys.has("arrowup")) my -= 1;
    if (keys.has("s") || keys.has("arrowdown")) my += 1;
    if (keys.has("a") || keys.has("arrowleft")) mx -= 1;
    if (keys.has("d") || keys.has("arrowright")) mx += 1;
  }
  if (mx !== 0 || my !== 0) {
    // Keyboard input (or a full-length drag) can have magnitude > 1 on diagonals — clamp it down to
    // 1 so those aren't faster than a cardinal direction. A partial drag (magnitude < 1) is left as-is
    // so easing the joystick toward center actually slows the player down, not just direction-snaps.
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    p.x = clamp(p.x + mx * p.speed * dt, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS);
    p.y = clamp(p.y + my * p.speed * dt, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS);
    p.facing = angleToDirection(mx, my);
  }

  state.elapsedMs += dtMs;
  if (state.elapsedMs >= state.targetMs) {
    state.phase = "victory";
    return;
  }
  const elapsedSec = state.elapsedMs / 1000;

  state.spawnTimerMs -= dtMs;
  if (state.spawnTimerMs <= 0) {
    spawnEnemy(state, elapsedSec);
    state.spawnTimerMs = Math.max(280, 1300 - elapsedSec * 9);
  }

  for (const e of state.enemies) {
    e.frozenMs = Math.max(0, e.frozenMs - dtMs);
    const isFrozen = e.frozenMs > 0;
    if (!isFrozen) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.speed * dt;
      e.y += (dy / d) * e.speed * dt;
    }
    e.hitCooldownMs = Math.max(0, e.hitCooldownMs - dtMs);
    if (!isFrozen && dist(p.x, p.y, e.x, e.y) < e.radius + PLAYER_RADIUS && e.hitCooldownMs <= 0) {
      p.hp = Math.max(0, p.hp - e.damage);
      e.hitCooldownMs = 500;
      if (p.hp <= 0) state.phase = "gameover";
    }
  }

  p.attackTimerMs -= dtMs;
  if (p.attackTimerMs <= 0) {
    const targets = state.enemies
      .filter((e) => dist(p.x, p.y, e.x, e.y) <= ATTACK_RANGE)
      .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))
      .slice(0, p.projectileCount);
    for (const target of targets) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      state.projectiles.push({
        id: state.idCounter++,
        x: p.x,
        y: p.y,
        vx: (dx / d) * PROJECTILE_SPEED,
        vy: (dy / d) * PROJECTILE_SPEED,
        damage: p.damage,
        radius: PROJECTILE_RADIUS,
        lifeMs: 1500,
      });
    }
    // Only pay the full cooldown when something was actually in range to shoot at.
    p.attackTimerMs = targets.length > 0 ? p.attackCooldownMs : 60;
  }

  for (const weapon of p.weapons) {
    const meta = WEAPON_META[weapon.kind];

    if (weapon.kind === "shield") {
      if (weapon.shieldActive) {
        const radius = shieldRadius(weapon.level);
        const dps = p.damage * meta.damageMult * (1 + (weapon.level - 1) * 0.2);
        const tickDamage = dps * dt;
        for (const e of state.enemies) {
          if (dist(p.x, p.y, e.x, e.y) < radius) e.hp -= tickDamage;
        }
        weapon.timerMs -= dtMs;
        if (weapon.timerMs <= 0) {
          weapon.shieldActive = false;
          weapon.timerMs = Math.max(2000, SHIELD_RECHARGE_MS - (weapon.level - 1) * 500);
        }
      } else {
        weapon.timerMs -= dtMs;
        if (weapon.timerMs <= 0) {
          weapon.shieldActive = true;
          weapon.timerMs = SHIELD_ACTIVE_MS + (weapon.level - 1) * 400;
        }
      }
      continue;
    }

    weapon.timerMs -= dtMs;
    if (weapon.timerMs > 0) continue;
    const cooldown = Math.max(220, Math.round(meta.cooldownMs * Math.pow(0.9, weapon.level - 1)));

    if (weapon.kind === "thunder-rain") {
      const strikeCount = 1 + weapon.level;
      const dmg = Math.round(p.damage * meta.damageMult * Math.pow(1.2, weapon.level - 1));
      for (let i = 0; i < strikeCount; i++) {
        const sx = 30 + Math.random() * (ARENA_WIDTH - 60);
        const sy = 30 + Math.random() * (ARENA_HEIGHT - 60);
        state.strikes.push({ id: state.idCounter++, x: sx, y: sy, radius: 50, ttlMs: 280 });
        for (const e of state.enemies) {
          if (dist(sx, sy, e.x, e.y) < 50) e.hp -= dmg;
        }
      }
      weapon.timerMs = cooldown;
      continue;
    }

    const target = state.enemies
      .filter((e) => dist(p.x, p.y, e.x, e.y) <= ATTACK_RANGE)
      .sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y))[0];
    if (!target) {
      weapon.timerMs = 80;
      continue;
    }
    const dmg = Math.round(p.damage * meta.damageMult * Math.pow(1.18, weapon.level - 1));
    const dx = target.x - p.x;
    const dy = target.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    state.projectiles.push({
      id: state.idCounter++,
      x: p.x,
      y: p.y,
      vx: (dx / d) * PROJECTILE_SPEED,
      vy: (dy / d) * PROJECTILE_SPEED,
      damage: dmg,
      radius: PROJECTILE_RADIUS + 2,
      lifeMs: 1500,
      kind: weapon.kind,
      chainRemaining: weapon.kind === "thunder" ? 1 + Math.floor(weapon.level / 2) : undefined,
      freezeChance: weapon.kind === "ice" ? Math.min(0.75, 0.3 + weapon.level * 0.08) : undefined,
    });
    weapon.timerMs = cooldown;
  }

  const remainingProjectiles: Projectile[] = [];
  for (const proj of state.projectiles) {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.lifeMs -= dtMs;
    const inBounds = proj.x > -20 && proj.x < ARENA_WIDTH + 20 && proj.y > -20 && proj.y < ARENA_HEIGHT + 20;
    let consumed = false;
    if (proj.lifeMs > 0 && inBounds) {
      for (const e of state.enemies) {
        if (dist(proj.x, proj.y, e.x, e.y) < proj.radius + e.radius) {
          e.hp -= proj.damage;
          consumed = true;

          if (proj.kind === "ice" && proj.freezeChance && Math.random() < proj.freezeChance) {
            e.frozenMs = FREEZE_DURATION_MS;
          }

          if (proj.kind === "thunder" && proj.chainRemaining) {
            let chainsLeft = proj.chainRemaining;
            let fromX = e.x;
            let fromY = e.y;
            const visited = new Set<number>([e.id]);
            while (chainsLeft > 0) {
              const next = state.enemies
                .filter((c) => !visited.has(c.id) && c.hp > 0 && dist(fromX, fromY, c.x, c.y) < CHAIN_RANGE)
                .sort((a, b) => dist(fromX, fromY, a.x, a.y) - dist(fromX, fromY, b.x, b.y))[0];
              if (!next) break;
              const chainDmg = Math.round(proj.damage * 0.6);
              next.hp -= chainDmg;
              state.bolts.push({
                id: state.idCounter++,
                x1: fromX,
                y1: fromY,
                x2: next.x,
                y2: next.y,
                ttlMs: 180,
              });
              visited.add(next.id);
              fromX = next.x;
              fromY = next.y;
              chainsLeft -= 1;
            }
          }
          break;
        }
      }
      if (!consumed) remainingProjectiles.push(proj);
    }
  }
  state.projectiles = remainingProjectiles;

  for (const s of state.strikes) s.ttlMs -= dtMs;
  state.strikes = state.strikes.filter((s) => s.ttlMs > 0);
  for (const b of state.bolts) b.ttlMs -= dtMs;
  state.bolts = state.bolts.filter((b) => b.ttlMs > 0);

  const survivors: Enemy[] = [];
  for (const e of state.enemies) {
    if (e.hp <= 0) {
      state.kills += 1;
      state.gems.push({
        id: state.idCounter++,
        x: e.x,
        y: e.y,
        value: e.kind === "elite" ? 12 : 4,
        radius: e.kind === "elite" ? GEM_RADIUS_MEDIUM : GEM_RADIUS_SIMPLE,
        kind: e.kind === "elite" ? "medium" : "simple",
      });
    } else {
      survivors.push(e);
    }
  }
  state.enemies = survivors;

  const remainingGems: Gem[] = [];
  for (const g of state.gems) {
    const d = dist(p.x, p.y, g.x, g.y);
    if (d < PLAYER_RADIUS + g.radius) {
      state.xp += g.value;
      continue;
    }
    if (d < p.pickupRadius) {
      // Snap-fast pull once in range — this is meant to feel like an instant magnet, not a slow chase.
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const nd = d || 1;
      const pullSpeed = 900;
      const step = Math.min(nd, pullSpeed * dt);
      g.x += (dx / nd) * step;
      g.y += (dy / nd) * step;
    }
    remainingGems.push(g);
  }
  state.gems = remainingGems;

  while (state.xp >= state.xpToNext && state.phase === "playing") {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = Math.round(state.xpToNext * 1.22 + 8);
    state.pendingUpgradeIds = rollUpgrades(3);
    state.phase = "levelup";
  }
}
