"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Skull, Sparkles, Swords, Timer } from "lucide-react";
import type { Direction } from "@/components/ui/CreatureSprite";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PixelButton } from "@/components/ui/PixelButton";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  UPGRADE_POOL,
  createInitialState,
  updateSurvival,
  type SurvivalState,
} from "@/lib/survival";

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
  player: Partial<Record<Direction, HTMLImageElement>>;
  grunt: HTMLImageElement | null;
  elite: HTMLImageElement | null;
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
  ctx.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  ctx.fillStyle = "#f4f1e8";
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

  ctx.strokeStyle = "rgba(0,0,0,0.05)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= ARENA_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= ARENA_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_WIDTH, y);
    ctx.stroke();
  }

  for (const g of state.gems) {
    ctx.fillStyle = "#8b5cf6";
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const proj of state.projectiles) {
    ctx.fillStyle = "#ffb84d";
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fill();
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
  }

  const p = state.player;
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
}

export function SurvivalGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<SurvivalState>(createInitialState());
  const keysRef = useRef<Set<string>>(new Set());
  const imagesRef = useRef<ImageBundle>({ player: {}, grunt: null, elite: null });
  const [started, setStarted] = useState(false);
  const [hud, setHud] = useState<Hud>(() => deriveHud(createInitialState()));

  useEffect(() => {
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
    imagesRef.current = { player, grunt, elite };
  }, []);

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
    if (!started) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      updateSurvival(stateRef.current, dt, keysRef.current);
      drawSurvival(ctx, stateRef.current, imagesRef.current);
      setHud(deriveHud(stateRef.current));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  function handleStart() {
    stateRef.current = createInitialState();
    setHud(deriveHud(stateRef.current));
    setStarted(true);
  }

  function handleRestart() {
    stateRef.current = createInitialState();
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

  if (!started) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <GlowPanel accent="neon" className="flex max-w-sm flex-col items-center gap-3 px-8 py-10">
          <Skull className="h-10 w-10 text-neon" />
          <h1 className="font-arcade text-sm glow-text-neon">Survival Mode</h1>
          <p className="text-xs text-zinc-500">
            Move with WASD or the arrow keys. Your Dragoon auto-attacks the nearest enemy. Collect the
            purple gems for EXP and pick an upgrade every time you level up. Survive as long as you can!
          </p>
          <p className="font-arcade text-[9px] uppercase tracking-wide text-zinc-600">
            Prototype build — Dragoon only, for now
          </p>
          <PixelButton variant="neon" onClick={handleStart}>
            Start Survival
          </PixelButton>
        </GlowPanel>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Survival Mode</h1>
        <p className="text-xs text-zinc-500">WASD / Arrow keys to move · auto-attacks the nearest foe</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <ProgressBar percent={(hud.hp / hud.maxHp) * 100} color="hp" label={`HP ${hud.hp}/${hud.maxHp}`} />
        </div>
        <div className="flex items-center justify-end gap-1 text-xs font-semibold text-foreground">
          <Timer className="h-3.5 w-3.5 text-zinc-500" />
          {formatTime(hud.elapsedMs)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <ProgressBar
            percent={(hud.xp / hud.xpToNext) * 100}
            color="exp"
            label={`Lv.${hud.level} · EXP ${hud.xp}/${hud.xpToNext}`}
          />
        </div>
        <div className="flex items-center justify-end gap-1 text-xs font-semibold text-foreground">
          <Swords className="h-3.5 w-3.5 text-zinc-500" />
          {hud.kills}
        </div>
      </div>

      <div className="relative mx-auto w-full overflow-hidden rounded-2xl border border-arcade-border shadow-sm" style={{ maxWidth: ARENA_WIDTH }}>
        <canvas
          ref={canvasRef}
          width={ARENA_WIDTH}
          height={ARENA_HEIGHT}
          className="block h-auto w-full"
          style={{ aspectRatio: `${ARENA_WIDTH} / ${ARENA_HEIGHT}` }}
        />

        {hud.phase === "levelup" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <GlowPanel accent="gold" className="w-full max-w-md space-y-3 p-4 text-center">
              <h2 className="font-arcade text-sm glow-text-gold">Level {hud.level}!</h2>
              <p className="text-xs text-zinc-500">Choose an upgrade</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {hud.pendingUpgradeIds.map((id) => {
                  const upgrade = UPGRADE_POOL.find((u) => u.id === id);
                  if (!upgrade) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => handleUpgrade(id)}
                      className="rounded-xl border border-arcade-border bg-arcade-panel-light p-3 text-left transition-colors hover:border-gold"
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-gold-bright" />
                        <p className="text-xs font-semibold text-foreground">{upgrade.name}</p>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-600">{upgrade.description}</p>
                    </button>
                  );
                })}
              </div>
            </GlowPanel>
          </div>
        )}

        {hud.phase === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
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
                <Link href="/hub" className="flex-1">
                  <PixelButton variant="gold" className="w-full">
                    Back to Hub
                  </PixelButton>
                </Link>
              </div>
            </GlowPanel>
          </div>
        )}
      </div>
    </div>
  );
}
