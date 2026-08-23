import type { Direction } from "@/components/ui/CreatureSprite";

export const ARENA_WIDTH = 900;
export const ARENA_HEIGHT = 560;

const PLAYER_RADIUS = 20;
const ENEMY_RADIUS_GRUNT = 14;
const ENEMY_RADIUS_ELITE = 20;
const GEM_RADIUS = 6;
const PROJECTILE_RADIUS = 5;
const PROJECTILE_SPEED = 420;
// Kills should land close enough to the player to actually pick up the EXP gem they drop.
const ATTACK_RANGE = 260;

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
}

export interface Gem {
  id: number;
  x: number;
  y: number;
  value: number;
  radius: number;
}

export type SurvivalPhase = "playing" | "levelup" | "gameover";

export interface SurvivalState {
  player: PlayerStats;
  enemies: Enemy[];
  projectiles: Projectile[];
  gems: Gem[];
  level: number;
  xp: number;
  xpToNext: number;
  elapsedMs: number;
  kills: number;
  spawnTimerMs: number;
  phase: SurvivalPhase;
  pendingUpgradeIds: string[];
  idCounter: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  apply: (player: PlayerStats) => void;
}

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
  };
}

export function createInitialState(): SurvivalState {
  return {
    player: createInitialPlayer(),
    enemies: [],
    projectiles: [],
    gems: [],
    level: 1,
    xp: 0,
    xpToNext: 20,
    elapsedMs: 0,
    kills: 0,
    spawnTimerMs: 1000,
    phase: "playing",
    pendingUpgradeIds: [],
    idCounter: 1,
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
    });
  }
}

/** Advances the simulation by dtMs, mutating state in place (this is a game-loop hot path, not React state). */
export function updateSurvival(state: SurvivalState, dtMs: number, keys: Set<string>): void {
  if (state.phase !== "playing") return;
  const dt = dtMs / 1000;
  const p = state.player;

  let mx = 0;
  let my = 0;
  if (keys.has("w") || keys.has("arrowup")) my -= 1;
  if (keys.has("s") || keys.has("arrowdown")) my += 1;
  if (keys.has("a") || keys.has("arrowleft")) mx -= 1;
  if (keys.has("d") || keys.has("arrowright")) mx += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    p.x = clamp(p.x + mx * p.speed * dt, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS);
    p.y = clamp(p.y + my * p.speed * dt, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS);
    p.facing = angleToDirection(mx, my);
  }

  state.elapsedMs += dtMs;
  const elapsedSec = state.elapsedMs / 1000;

  state.spawnTimerMs -= dtMs;
  if (state.spawnTimerMs <= 0) {
    spawnEnemy(state, elapsedSec);
    state.spawnTimerMs = Math.max(280, 1300 - elapsedSec * 9);
  }

  for (const e of state.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.x += (dx / d) * e.speed * dt;
    e.y += (dy / d) * e.speed * dt;
    e.hitCooldownMs = Math.max(0, e.hitCooldownMs - dtMs);
    if (d < e.radius + PLAYER_RADIUS && e.hitCooldownMs <= 0) {
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
          break;
        }
      }
      if (!consumed) remainingProjectiles.push(proj);
    }
  }
  state.projectiles = remainingProjectiles;

  const survivors: Enemy[] = [];
  for (const e of state.enemies) {
    if (e.hp <= 0) {
      state.kills += 1;
      state.gems.push({
        id: state.idCounter++,
        x: e.x,
        y: e.y,
        value: e.kind === "elite" ? 12 : 4,
        radius: GEM_RADIUS,
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
