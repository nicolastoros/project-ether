"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Coins, Gem, Pause, Play, Sparkles, Swords, Timer } from "lucide-react";
import type { Direction } from "@/components/ui/CreatureSprite";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PixelButton } from "@/components/ui/PixelButton";
import { useGameStore } from "@/lib/store";
import { SURVIVAL_WORLDS, type SurvivalStage } from "@/lib/survivalStages";
import {
  UPGRADE_POOL,
  WEAPON_META,
  createInitialState,
  getArenaDimensions,
  shieldRadius,
  updateSurvival,
  type SurvivalState,
  type WeaponKind,
} from "@/lib/survival";

const WEAPON_KINDS = Object.keys(WEAPON_META) as WeaponKind[];
const STRIKE_MAX_TTL_MS = 280;
const BOLT_MAX_TTL_MS = 180;
// Radius, in on-screen pixels, the thumb can drag from the joystick's origin before it stops
// getting any faster — independent of the canvas's internal resolution.
const JOYSTICK_MAX_RADIUS = 46;

interface JoystickVisual {
  originX: number;
  originY: number;
  knobX: number;
  knobY: number;
}

const ROTATION_ORDER: Direction[] = [
  "south",
  "south-east",
  "east",
  "north-east",
  "north",
  "north-west",
  "west",
  "south-west",
];

interface ImageBundle {
  background: HTMLImageElement | null;
  player: Partial<Record<Direction, HTMLImageElement>>;
  grunt: HTMLImageElement | null;
  elite: HTMLImageElement | null;
  weapons: Partial<Record<WeaponKind, HTMLImageElement>>;
  gemSimple: HTMLImageElement | null;
  gemMedium: HTMLImageElement | null;
}

interface Hud {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  elapsedMs: number;
  kills: number;
  phase: SurvivalState["phase"];
  pendingUpgradeIds: string[];
}

function deriveHud(state: SurvivalState): Hud {
  return {
    hp: state.player.hp,
    maxHp: state.player.maxHp,
    level: state.level,
    xp: state.xp,
    xpToNext: state.xpToNext,
    elapsedMs: state.elapsedMs,
    kills: state.kills,
    phase: state.phase,
    pendingUpgradeIds: state.pendingUpgradeIds,
  };
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function drawSurvival(ctx: CanvasRenderingContext2D, state: SurvivalState, images: ImageBundle): void {
  const { arenaWidth, arenaHeight } = state;
  ctx.clearRect(0, 0, arenaWidth, arenaHeight);

  const bg = images.background;
  if (bg && bg.complete && bg.naturalWidth > 0) {
    // "Cover" fit: the map art is square, the arena isn't (portrait on mobile, wider on
    // desktop — see getArenaDimensions), so scale up to the larger ratio and center-crop
    // rather than letterboxing or stretching.
    const scale = Math.max(arenaWidth / bg.naturalWidth, arenaHeight / bg.naturalHeight);
    const drawW = bg.naturalWidth * scale;
    const drawH = bg.naturalHeight * scale;
    ctx.drawImage(bg, (arenaWidth - drawW) / 2, (arenaHeight - drawH) / 2, drawW, drawH);
    // A light wash over the scenery keeps enemies/projectiles/gems readable against it —
    // the art is busier than the flat backdrop this replaced.
    ctx.fillStyle = "rgba(244, 241, 232, 0.4)";
    ctx.fillRect(0, 0, arenaWidth, arenaHeight);
  } else {
    ctx.fillStyle = "#f4f1e8";
    ctx.fillRect(0, 0, arenaWidth, arenaHeight);
  }

  for (const s of state.strikes) {
    const t = 1 - s.ttlMs / STRIKE_MAX_TTL_MS;
    const r = s.radius * (0.4 + t * 0.6);
    ctx.strokeStyle = `rgba(250, 204, 21, ${1 - t})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(250, 204, 21, ${0.25 * (1 - t)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const g of state.gems) {
    const img = g.kind === "medium" ? images.gemMedium : images.gemSimple;
    if (img && img.complete && img.naturalWidth > 0) {
      const size = g.radius * 3.6;
      ctx.drawImage(img, g.x - size / 2, g.y - size / 2, size, size);
    } else {
      ctx.fillStyle = "#8b5cf6";
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const proj of state.projectiles) {
    const img = proj.kind ? images.weapons[proj.kind] : null;
    if (img && img.complete && img.naturalWidth > 0) {
      const size = proj.radius * 3.4;
      ctx.drawImage(img, proj.x - size / 2, proj.y - size / 2, size, size);
    } else {
      ctx.fillStyle = "#ffb84d";
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const b of state.bolts) {
    const alpha = Math.max(0, b.ttlMs / BOLT_MAX_TTL_MS);
    ctx.strokeStyle = `rgba(250, 204, 21, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
  }

  for (const e of state.enemies) {
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.radius * 0.8, e.radius * 0.8, e.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fill();

    const img = e.kind === "elite" ? images.elite : images.grunt;
    if (img && img.complete && img.naturalWidth > 0) {
      const size = e.radius * 2.4;
      ctx.drawImage(img, e.x - size / 2, e.y - size / 2, size, size);
    } else {
      ctx.fillStyle = e.kind === "elite" ? "#eab308" : "#f87171";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (e.kind === "elite") {
      const w = e.radius * 2;
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * (e.hp / e.maxHp), 4);
    }

    if (e.frozenMs > 0) {
      ctx.strokeStyle = "rgba(96,165,250,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const p = state.player;

  const activeShield = p.weapons.find((w) => w.kind === "shield" && w.shieldActive);
  if (activeShield) {
    const radius = shieldRadius(activeShield.level);
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsedMs / 120);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(96,165,250,${0.12 + pulse * 0.08})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(59,130,246,${0.5 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 16, 16, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();

  const playerImg = images.player[p.facing];
  if (playerImg && playerImg.complete && playerImg.naturalWidth > 0) {
    const size = 56;
    ctx.drawImage(playerImg, p.x - size / 2, p.y - size / 2, size, size);
  } else {
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  const orbitingWeapons = p.weapons.filter((w) => w.kind !== "thunder-rain");
  orbitingWeapons.forEach((weapon, i) => {
    const img = images.weapons[weapon.kind];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const angle = (state.elapsedMs / 1000) * (1.4 + i * 0.15) + i * ((Math.PI * 2) / 4);
    const orbitRadius = 36 + i * 10;
    const ox = p.x + Math.cos(angle) * orbitRadius;
    const oy = p.y + Math.sin(angle) * orbitRadius * 0.6;
    const size = 20;
    ctx.drawImage(img, ox - size / 2, oy - size / 2, size, size);
  });
}

interface SurvivalGameProps {
  stage: SurvivalStage;
  /** Called from Pause/Game Over/Stage Cleared to return to the stage map. */
  onExit: () => void;
}

export function SurvivalGame({ stage, onExit }: SurvivalGameProps) {
  const addGold = useGameStore((s) => s.addGold);
  const addGems = useGameStore((s) => s.addGems);
  const clearSurvivalStage = useGameStore((s) => s.clearSurvivalStage);

  // useMemo (not a ref) so it's safe to read during render below, but still only decided once
  // per mount — not reactively on resize, since rescaling mid-run would strand existing
  // enemies/gems outside the new bounds.
  const arenaDims = useMemo(() => getArenaDimensions(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SurvivalState>(
    createInitialState(stage.targetSeconds, arenaDims.width, arenaDims.height)
  );
  const keysRef = useRef<Set<string>>(new Set());
  const touchMoveRef = useRef<{ x: number; y: number } | null>(null);
  const [joystick, setJoystick] = useState<JoystickVisual | null>(null);
  const imagesRef = useRef<ImageBundle>({
    background: null,
    player: {},
    grunt: null,
    elite: null,
    weapons: {},
    gemSimple: null,
    gemMedium: null,
  });
  const [hud, setHud] = useState<Hud>(() =>
    deriveHud(createInitialState(stage.targetSeconds, arenaDims.width, arenaDims.height))
  );

  const mapImage = SURVIVAL_WORLDS.find((w) => w.world === stage.world)?.mapImage ?? SURVIVAL_WORLDS[0].mapImage;

  useEffect(() => {
    const background = new window.Image();
    background.src = mapImage;

    const player: Partial<Record<Direction, HTMLImageElement>> = {};
    ROTATION_ORDER.forEach((dir) => {
      const img = new window.Image();
      img.src = `/assets/creatures/dragoon/idle/${dir}.png`;
      player[dir] = img;
    });
    const grunt = new window.Image();
    grunt.src = "/assets/creatures/firebit/idle/south.png";
    const elite = new window.Image();
    elite.src = "/assets/creatures/voltling/idle/south.png";

    const weapons: Partial<Record<WeaponKind, HTMLImageElement>> = {};
    WEAPON_KINDS.forEach((kind) => {
      const img = new window.Image();
      img.src = WEAPON_META[kind].icon;
      weapons[kind] = img;
    });

    const gemSimple = new window.Image();
    gemSimple.src = "/assets/ui/crystal_exp_simple.png";
    const gemMedium = new window.Image();
    gemMedium.src = "/assets/ui/crystal_exp_medium.png";

    imagesRef.current = { background, player, grunt, elite, weapons, gemSimple, gemMedium };
  }, [mapImage]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      updateSurvival(stateRef.current, dt, keysRef.current, touchMoveRef.current);
      drawSurvival(ctx, stateRef.current, imagesRef.current);
      setHud(deriveHud(stateRef.current));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Grant rewards and unlock the next stage exactly once, right when the run crosses the
  // target time. hud.phase only actually changes value on that transition (rAF re-renders
  // every frame regardless, but the dependency array only cares about the string flipping).
  useEffect(() => {
    if (hud.phase !== "victory") return;
    addGold(stage.rewardGold);
    addGems(stage.rewardGems);
    clearSurvivalStage(stage.stageNumber);
  }, [hud.phase, stage.rewardGold, stage.rewardGems, stage.stageNumber, addGold, addGems, clearSurvivalStage]);

  function handleRestart() {
    stateRef.current = createInitialState(stage.targetSeconds, arenaDims.width, arenaDims.height);
    setHud(deriveHud(stateRef.current));
  }

  function handleUpgrade(id: string) {
    const upgrade = UPGRADE_POOL.find((u) => u.id === id);
    if (!upgrade) return;
    upgrade.apply(stateRef.current.player);
    stateRef.current.phase = "playing";
    stateRef.current.pendingUpgradeIds = [];
    setHud(deriveHud(stateRef.current));
  }

  function handlePause() {
    if (stateRef.current.phase !== "playing") return;
    stateRef.current.phase = "paused";
    setHud(deriveHud(stateRef.current));
  }

  function handleResume() {
    if (stateRef.current.phase !== "paused") return;
    stateRef.current.phase = "playing";
    setHud(deriveHud(stateRef.current));
  }

  // Floating joystick: appears wherever the player first touches (or clicks) the arena, and the
  // player moves toward wherever the thumb drags from there — same control scheme as most mobile
  // survivor-likes. Pointer events cover touch and mouse alike, so this also works with click-drag
  // on desktop for free.
  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (hud.phase !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const originX = e.clientX - rect.left;
    const originY = e.clientY - rect.top;
    e.currentTarget.setPointerCapture(e.pointerId);
    setJoystick({ originX, originY, knobX: originX, knobY: originY });
    touchMoveRef.current = { x: 0, y: 0 };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!joystick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - rect.left - joystick.originX;
    const dy = e.clientY - rect.top - joystick.originY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS);
    const ratio = dist > 0 ? clampedDist / dist : 0;
    setJoystick((prev) =>
      prev ? { ...prev, knobX: prev.originX + dx * ratio, knobY: prev.originY + dy * ratio } : prev
    );
    const magnitude = clampedDist / JOYSTICK_MAX_RADIUS;
    touchMoveRef.current = dist > 0 ? { x: (dx / dist) * magnitude, y: (dy / dist) * magnitude } : { x: 0, y: 0 };
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setJoystick(null);
    touchMoveRef.current = null;
  }

  return (
    <div className="flex h-full flex-col gap-1.5 sm:gap-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-arcade text-xs glow-text-neon sm:text-lg">{stage.name}</h1>
          <p className="truncate text-[10px] text-zinc-500 sm:text-xs">
            World {stage.world}-{stage.worldStageNumber}
            <span className="hidden sm:inline"> · drag the arena to steer (or WASD)</span>
          </p>
        </div>
        {hud.phase === "playing" && (
          <button
            type="button"
            onClick={handlePause}
            aria-label="Pause"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-600 shadow-sm transition-colors hover:border-gold hover:text-gold-bright sm:h-8 sm:w-8"
          >
            <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-1.5 sm:gap-2">
        <div className="col-span-2">
          <ProgressBar percent={(hud.hp / hud.maxHp) * 100} color="hp" label={`HP ${hud.hp}/${hud.maxHp}`} />
        </div>
        <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-foreground sm:text-xs">
          <Timer className="h-3 w-3 text-zinc-500 sm:h-3.5 sm:w-3.5" />
          {formatTime(hud.elapsedMs)}/{formatTime(stage.targetSeconds * 1000)}
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-1.5 sm:gap-2">
        <div className="col-span-2">
          <ProgressBar
            percent={(hud.xp / hud.xpToNext) * 100}
            color="exp"
            label={`Lv.${hud.level} · EXP ${hud.xp}/${hud.xpToNext}`}
          />
        </div>
        <div className="flex items-center justify-end gap-1 text-[10px] font-semibold text-foreground sm:text-xs">
          <Swords className="h-3 w-3 text-zinc-500 sm:h-3.5 sm:w-3.5" />
          {hud.kills}
        </div>
      </div>

      {/* max-w-[720px] here is ARENA_WIDTH (lib/survival.ts) as a literal — Tailwind can't read
          the constant, so keep them in sync by hand. It's mobile's cap only: on lg+ the arena
          switches to ARENA_WIDTH_DESKTOP's wider, closer-to-square shape (getArenaDimensions),
          and since desktop windows are landscape, height is the scarce dimension there, not
          width — max-w-none lets the box grow as wide as that shape wants, while lg:max-h caps
          it to whatever room is actually available. The explicit aspectRatio derives the actual
          width from that height (rather than leaving the canvas's own object-fit to reconcile a
          mismatched box — `object-fit` doesn't actually get applied to <canvas> in every engine
          the way it does for <img>, so a box whose own ratio didn't already match the canvas's
          internal resolution rendered as a non-uniformly stretched image instead of a
          letterboxed one). self-center (instead of w-full) is required for aspectRatio to have
          any effect here — a flex item stretches to its container's full cross-axis width by
          default, which pins width just as firmly as an explicit w-full would, leaving
          aspectRatio nothing to derive. */}
      <div
        className="relative mx-auto min-h-0 max-w-[720px] flex-1 touch-none select-none self-center overflow-hidden rounded-2xl border border-arcade-border shadow-sm lg:max-w-none lg:max-h-[70dvh]"
        style={{ aspectRatio: `${arenaDims.width} / ${arenaDims.height}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          width={arenaDims.width}
          height={arenaDims.height}
          className="block h-full w-full"
        />

        {joystick && (
          <div
            className="pointer-events-none absolute z-10 h-16 w-16 rounded-full border-2 border-white/60 bg-white/10 backdrop-blur-sm"
            style={{ left: joystick.originX - 32, top: joystick.originY - 32 }}
          >
            <div
              className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-md"
              style={{ left: 32 + (joystick.knobX - joystick.originX), top: 32 + (joystick.knobY - joystick.originY) }}
            />
          </div>
        )}
      </div>

      {hud.phase === "levelup" && (
        // Fixed to the viewport, not the (short, letterboxed) arena box — anchoring this to the
        // arena instead clipped the cards off-screen on tall phones where the canvas is barely a
        // quarter of the screen height.
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <GlowPanel accent="gold" className="w-full max-w-2xl space-y-4 p-6 text-center">
            <h2 className="font-arcade text-lg glow-text-gold">Level {hud.level}!</h2>
            <p className="text-sm text-zinc-500">Choose an upgrade</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {hud.pendingUpgradeIds.map((id) => {
                const upgrade = UPGRADE_POOL.find((u) => u.id === id);
                if (!upgrade) return null;
                return (
                  <button
                    key={id}
                    onClick={() => handleUpgrade(id)}
                    className="rounded-2xl border border-arcade-border bg-arcade-panel-light p-4 text-left transition-colors hover:border-gold"
                  >
                    <div className="flex items-center gap-2.5">
                      {upgrade.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element -- tiny local UI icon
                        <img src={upgrade.icon} alt="" className="h-10 w-10 shrink-0 object-contain" />
                      ) : (
                        <Sparkles className="h-6 w-6 shrink-0 text-gold-bright" />
                      )}
                      <p className="text-base font-semibold text-foreground">{upgrade.name}</p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">{upgrade.description}</p>
                  </button>
                );
              })}
            </div>
          </GlowPanel>
        </div>
      )}

      {hud.phase === "paused" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlowPanel accent="neon" className="w-full max-w-sm space-y-4 p-6 text-center">
            <h2 className="font-arcade text-sm glow-text-neon">Paused</h2>
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
              <span>{formatTime(hud.elapsedMs)}</span>
              <span>Lv.{hud.level}</span>
              <span>{hud.kills} kills</span>
            </div>
            <div className="flex flex-col gap-2">
              <PixelButton variant="neon" onClick={handleResume} className="flex items-center justify-center gap-2">
                <Play className="h-4 w-4" /> Resume
              </PixelButton>
              <PixelButton variant="ghost" className="w-full" onClick={onExit}>
                Back to Map
              </PixelButton>
            </div>
          </GlowPanel>
        </div>
      )}

      {hud.phase === "gameover" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlowPanel accent="none" className="w-full max-w-sm space-y-4 p-5 text-center">
            <h2 className="font-arcade text-sm text-zinc-500">You Fell</h2>
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
              <span>Survived {formatTime(hud.elapsedMs)}</span>
              <span>Lv.{hud.level}</span>
              <span>{hud.kills} kills</span>
            </div>
            <div className="flex gap-2">
              <PixelButton variant="ghost" className="flex-1" onClick={handleRestart}>
                Try Again
              </PixelButton>
              <PixelButton variant="gold" className="flex-1" onClick={onExit}>
                Back to Map
              </PixelButton>
            </div>
          </GlowPanel>
        </div>
      )}

      {hud.phase === "victory" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <GlowPanel accent="neon" className="w-full max-w-sm space-y-4 p-6 text-center">
            <h2 className="font-arcade text-sm glow-text-neon">Stage Cleared!</h2>
            <p className="text-xs text-zinc-500">
              {stage.name} · World {stage.world}-{stage.worldStageNumber}
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
              <span>{formatTime(hud.elapsedMs)}</span>
              <span>Lv.{hud.level}</span>
              <span>{hud.kills} kills</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm font-semibold text-foreground">
              <span className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-gold-bright" /> +{stage.rewardGold}
              </span>
              <span className="flex items-center gap-1">
                <Gem className="h-4 w-4 text-violet-500" /> +{stage.rewardGems}
              </span>
            </div>
            <PixelButton variant="neon" className="w-full" onClick={onExit}>
              Back to Map
            </PixelButton>
          </GlowPanel>
        </div>
      )}
    </div>
  );
}
