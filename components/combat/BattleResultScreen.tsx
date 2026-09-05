"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Clock, RotateCcw, Sparkles, Star, TrendingUp } from "lucide-react";
import type { Creature } from "@/types/game";
import { ITEM_CATALOG, MAX_LEVEL } from "@/lib/gameData";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { SealCoinIcon } from "@/components/icons/SealCoinIcon";
import { ItemIcon } from "@/components/ui/ItemIcon";
import { cn, formatNumber, xpPercent } from "@/lib/utils";

export interface CreatureResultEntry {
  creature: Creature;
  expGained: number;
  levelBefore: number;
  levelAfter: number;
  /** Post-gain values — renders the "how much until next level" EXP bar. */
  exp: number;
  expToNextLevel: number;
}

export interface TamerResultEntry {
  expGained: number;
  levelBefore: number;
  levelAfter: number;
  exp: number;
  expToNextLevel: number;
}

/** mm:ss — battles are short enough that hours never come up. */
function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface BattleResultScreenProps {
  phase: "victory" | "defeat";
  /** Stage/boss name shown as the results subtitle. */
  title: string;
  goldEarned: number;
  creatureResults: CreatureResultEntry[];
  itemsDropped: { itemId: string; quantity: number }[];
  sealCoinsDropped?: number;
  /** Wall-clock battle duration, in seconds — shown as mm:ss next to the star rating. */
  elapsedSeconds?: number;
  /** Campaign-only star criteria (Raid has no equivalent) — see lib/store.ts's recordStageStars,
   * whose exact inputs this expects. */
  stars?: { noDeaths: boolean; noItems: boolean; underFiveTurns: boolean };
  /** The Tamer's own EXP/level result for this battle — separate from creatureResults below. */
  tamerResult?: TamerResultEntry;
  /** Extra reward callouts specific to the caller (first-clear ×2, 2x EXP event, a gifted
   * creature, unlocked Tamer gear, an achievement, Raid's material drop, ...) — rendered above
   * the reward row, in order. Presentation only; each screen keeps computing its own rewards. */
  bonusLines?: ReactNode[];
  defeatMessage?: string;
  onRematch: () => void;
  /** Link-based exit (BattleScreen returns to /campaign). Mutually exclusive with onExitClick. */
  exitHref?: string;
  /** Callback-based exit (RaidBattleScreen). Mutually exclusive with exitHref. */
  onExitClick?: () => void;
  exitLabel: string;
  /** Campaign-only: link straight into the next area's team-select, skipping back through the
   * Chapter/Area list. Omitted (no button rendered) when there's no next area to jump to — the
   * last area of a chapter, or any non-Campaign caller (Raid has no "next" concept). */
  nextHref?: string;
  nextLabel?: string;
}

/** Shared post-battle presentation for both BattleScreen and RaidBattleScreen: a KO splash on
 * victory (their KOscreen.png asset with a light-burst, dismissed by the player — click/tap
 * anywhere or Escape, no auto-advance) leading into a Dokkan-style results screen — reward totals
 * plus a per-creature EXP/level-up readout. Adapted
 * from SweepScreen.tsx's existing gold/EXP/drops/"Team Progress" layout, extended with the
 * level-before → level-after state the reference screenshot showed ("No subió de nivel" when a
 * creature didn't level up). Reward-granting logic itself stays in each caller — this component
 * only presents numbers it's handed. */
export function BattleResultScreen({
  phase,
  title,
  goldEarned,
  creatureResults,
  itemsDropped,
  sealCoinsDropped = 0,
  elapsedSeconds,
  stars,
  tamerResult,
  bonusLines = [],
  defeatMessage = "Your team was defeated. Give it another shot!",
  onRematch,
  exitHref,
  onExitClick,
  exitLabel,
  nextHref,
  nextLabel = "Next Area",
}: BattleResultScreenProps) {
  const [showKoSplash, setShowKoSplash] = useState(phase === "victory");

  // No auto-dismiss — the player decides when to move on, via a click/tap anywhere on the
  // overlay (see the button below) or Escape.
  useEffect(() => {
    if (!showKoSplash) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowKoSplash(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showKoSplash]);

  if (showKoSplash) {
    return (
      <motion.button
        type="button"
        onClick={() => setShowKoSplash(false)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        // A darkened, translucent backdrop (not solid black) — the battlefield stays visible
        // behind the K.O. logo, same "victory flash over the arena" feel as the reference shot,
        // instead of cutting to a blank screen.
        className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center overflow-hidden border-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Continue"
      >
        <motion.span
          initial={{ scale: 0, opacity: 0.9 }}
          animate={{ scale: [0, 2.6], opacity: [0.9, 0] }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="absolute h-40 w-40 rounded-full bg-gradient-to-br from-white via-gold-bright to-transparent blur-xl"
        />
        <motion.img
          src="/assets/ui/KOscreen.png"
          alt="K.O."
          draggable={false}
          initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14 }}
          className="relative w-[85%] max-w-md select-none drop-shadow-[0_0_40px_rgba(255,184,77,0.65)] sm:max-w-lg"
        />
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 flex flex-col items-center gap-1 text-gold-bright"
        >
          <ChevronDown className="h-6 w-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" strokeWidth={3} />
          <span className="font-arcade text-[9px] uppercase tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Tap to continue
          </span>
        </motion.div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
    >
      <GlowPanel
        accent={phase === "victory" ? "gold" : "none"}
        className="my-auto w-full max-w-md space-y-4 p-5 text-center sm:max-w-lg sm:space-y-5 sm:p-7 lg:max-w-xl lg:space-y-6 lg:p-8"
      >
        <div>
          <h2 className={cn("font-arcade text-lg sm:text-xl lg:text-2xl", phase === "victory" ? "glow-text-gold" : "text-zinc-500")}>
            {phase === "victory" ? "Victory!" : "Defeat"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 sm:text-base lg:text-lg">{title}</p>
        </div>

        {phase === "victory" ? (
          <>
            {(elapsedSeconds !== undefined || stars) && (
              <div className="flex items-center justify-center gap-4 text-sm text-zinc-500 sm:gap-6 sm:text-base">
                {elapsedSeconds !== undefined && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" /> {formatElapsed(elapsedSeconds)}
                  </span>
                )}
                {stars && (
                  <span className="inline-flex items-center gap-1">
                    {[stars.noDeaths, stars.noItems, stars.underFiveTurns].map((earned, i) => (
                      <Star
                        key={i}
                        className={cn("h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8", earned ? "fill-gold-bright text-gold-bright" : "text-zinc-300")}
                      />
                    ))}
                  </span>
                )}
              </div>
            )}

            {bonusLines.length > 0 && (
              <div className="space-y-1">
                {bonusLines.map((line, i) => (
                  <div key={i} className="font-arcade text-[10px] uppercase tracking-wide text-gold-bright sm:text-xs lg:text-sm">
                    {line}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 text-sm text-zinc-600 sm:gap-6 sm:text-base lg:text-lg">
              <span className="inline-flex items-center gap-1.5">
                <GoldCoinIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" /> +{formatNumber(goldEarned)}
              </span>
              {sealCoinsDropped > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <SealCoinIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" /> +{sealCoinsDropped}
                </span>
              )}
            </div>

            {itemsDropped.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
                {itemsDropped.map((drop, i) => {
                  const item = ITEM_CATALOG.find((it) => it.id === drop.itemId);
                  if (!item) return null;
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-2 rounded-full border border-arcade-border bg-arcade-panel-light px-3.5 py-2 text-sm text-foreground sm:gap-2.5 sm:px-4 sm:py-2.5 sm:text-base lg:text-lg"
                    >
                      <ItemIcon item={item} className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" /> +{drop.quantity} {item.name}
                    </span>
                  );
                })}
              </div>
            )}

            {tamerResult && (
              <div className="text-left">
                <p className="mb-2 font-arcade text-xs uppercase tracking-wide text-zinc-500 sm:text-sm">Tamer</p>
                <div className="rounded-xl border border-arcade-border bg-arcade-panel-light p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    {tamerResult.levelAfter > tamerResult.levelBefore ? (
                      <p className="flex items-center gap-1.5 font-arcade text-xs font-semibold text-gold-bright sm:text-sm">
                        <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" /> Lv.{tamerResult.levelBefore} → {tamerResult.levelAfter}
                      </p>
                    ) : (
                      <p className="font-arcade text-xs font-semibold text-foreground sm:text-sm">Lv.{tamerResult.levelAfter}</p>
                    )}
                    <p className="flex items-center gap-1.5 text-sm text-sky-500 sm:text-base">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" /> +{formatNumber(tamerResult.expGained)} EXP
                    </p>
                  </div>
                  {tamerResult.levelAfter < MAX_LEVEL ? (
                    <ProgressBar
                      percent={xpPercent(tamerResult.exp, tamerResult.expToNextLevel)}
                      color="exp"
                      innerText={`${formatNumber(tamerResult.exp)}/${formatNumber(tamerResult.expToNextLevel)}`}
                      className="mt-2"
                    />
                  ) : (
                    <p className="mt-2 font-arcade text-xs uppercase text-gold-bright sm:text-sm">Max level</p>
                  )}
                </div>
              </div>
            )}

            {creatureResults.length > 0 && (
              <div className="text-left">
                <p className="mb-2 font-arcade text-xs uppercase tracking-wide text-zinc-500 sm:text-sm">Team Result</p>
                <div className="space-y-2 sm:space-y-3">
                  {creatureResults.map(({ creature, expGained, levelBefore, levelAfter, exp, expToNextLevel }) => {
                    const leveledUp = levelAfter > levelBefore;
                    return (
                      <div
                        key={creature.id}
                        className="flex items-center gap-3 rounded-xl border border-arcade-border bg-arcade-panel-light p-3 sm:gap-4 sm:p-4"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-arcade-border bg-arcade-panel sm:h-16 sm:w-16">
                          <CreatureSprite creature={creature} className="h-10 w-10 sm:h-12 sm:w-12" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-base font-semibold text-foreground sm:text-lg">{creature.name}</p>
                            {leveledUp ? (
                              <p className="flex shrink-0 items-center gap-1 font-arcade text-xs font-semibold text-gold-bright sm:text-sm">
                                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" /> Lv.{levelBefore} → {levelAfter}
                              </p>
                            ) : (
                              <p className="shrink-0 font-arcade text-xs uppercase text-zinc-400 sm:text-sm">Lv.{levelAfter}</p>
                            )}
                          </div>
                          <p className="flex items-center gap-1.5 text-sm text-sky-500 sm:text-base">
                            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" /> +{formatNumber(expGained)} EXP
                          </p>
                          {levelAfter < MAX_LEVEL ? (
                            <ProgressBar percent={xpPercent(exp, expToNextLevel)} color="exp" className="mt-1.5" />
                          ) : (
                            <p className="mt-1.5 font-arcade text-[10px] uppercase text-gold-bright sm:text-xs">Max level</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-500 sm:text-base">{defeatMessage}</p>
        )}

        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex gap-2 sm:gap-3">
            <PixelButton variant="ghost" className="flex-1 sm:py-3 sm:text-base" onClick={onRematch}>
              <RotateCcw className="mr-1 inline h-4 w-4 sm:h-5 sm:w-5" />
              Rematch
            </PixelButton>
            {exitHref ? (
              <Link href={exitHref} className="flex-1" onClick={onExitClick}>
                <PixelButton variant={nextHref ? "ghost" : "gold"} className="w-full sm:py-3 sm:text-base">
                  {exitLabel}
                </PixelButton>
              </Link>
            ) : (
              <PixelButton variant={nextHref ? "ghost" : "gold"} className="flex-1 sm:py-3 sm:text-base" onClick={onExitClick}>
                {exitLabel}
              </PixelButton>
            )}
          </div>
          {/* Primary CTA once a next area exists — the common case is "keep going", not "leave". */}
          {nextHref && (
            <Link href={nextHref} className="block" onClick={onExitClick}>
              <PixelButton variant="gold" className="w-full sm:py-3.5 sm:text-base">
                {nextLabel}
              </PixelButton>
            </Link>
          )}
        </div>
      </GlowPanel>
    </motion.div>
  );
}
