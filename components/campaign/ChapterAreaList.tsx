"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, Lock, Star } from "lucide-react";
import type { DifficultyTier, DungeonStage } from "@/types/game";
import type { CampaignChapter } from "@/lib/campaignChapters";
import { DIFFICULTY_TIERS, getTierStage, isTierUnlocked, tierStageId } from "@/lib/difficultyTiers";
import { TAMER_EQUIPMENT_CATALOG } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn, formatNumber } from "@/lib/utils";

// Easy is relabeled "Normal" here — the underlying tier (and its unlock chain: Normal -> Medium ->
// Hard -> Super) is unchanged, this is a display-only rename for the new chapter UI.
const TIER_LABEL: Record<DifficultyTier, string> = { Easy: "Normal", Medium: "Medium", Hard: "Hard", Super: "Super" };

interface ChapterAreaListProps {
  chapter: CampaignChapter;
  stages: DungeonStage[]; // store-overridden isCleared/isLocked, one per area, in order
  onBack: () => void;
  onSelectStage: (stage: DungeonStage) => void;
}

export function ChapterAreaList({ chapter, stages, onBack, onSelectStage }: ChapterAreaListProps) {
  const dungeon = useGameStore((s) => s.dungeon);
  const attemptedStageIds = useGameStore((s) => s.attemptedStageIds);
  const [selectedTier, setSelectedTier] = useState<DifficultyTier>("Easy");

  // Deliberately NOT stage.isCleared (highestStageCleared) — that counter only tracks "how far
  // the sequential unlock has advanced" and can outpace what's actually been fought/starred (e.g.
  // stale progress carried over from before this area's content existed at its current id, or any
  // future sync edge case). dungeon.stageStars is the same source each card's own NEW/COMPLETED
  // badge already reads below, so the header count and the badges you're looking at can never
  // visibly disagree with each other, whatever highestStageCleared's own value happens to be.
  const clearedCount = stages.filter((s) => {
    const stars = dungeon.stageStars[s.id];
    return Boolean(stars && (stars.noDeaths || stars.noItems || stars.underFiveTurns));
  }).length;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2 lg:gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Chapters"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-arcade-border bg-arcade-panel text-zinc-500 shadow-sm transition-colors hover:text-foreground lg:h-11 lg:w-11"
        >
          <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-arcade text-base text-foreground lg:text-lg">Chapter {chapter.chapter}</h2>
          <div className="mt-1 max-w-xs">
            <ProgressBar
              percent={stages.length > 0 ? (clearedCount / stages.length) * 100 : 0}
              color="exp"
              label={`${clearedCount}/${stages.length} areas cleared`}
            />
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5 lg:gap-2">
        {DIFFICULTY_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setSelectedTier(tier)}
            data-selected={tier === selectedTier}
            className={cn(
              "flex-1 rounded-lg border-2 py-1.5 font-arcade text-[9px] font-semibold uppercase tracking-wide transition-colors lg:rounded-xl lg:py-2 lg:text-xs",
              tier === selectedTier
                ? "border-gold bg-gold text-white shadow-sm"
                : "border-arcade-border bg-arcade-panel text-zinc-500 hover:text-foreground"
            )}
          >
            {TIER_LABEL[tier]}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pb-2 lg:grid-cols-2">
        {stages.map((stage, i) => {
          const areaNumber = i + 1;
          const tierUnlockedHere = !stage.isLocked && isTierUnlocked(stage, selectedTier, dungeon);
          const gear = TAMER_EQUIPMENT_CATALOG.find(
            (t) => t.source.kind === "campaign-clear" && t.source.stageId === stage.id
          );
          const tierStage = getTierStage(stage, selectedTier);
          // The 3-star objectives (no deaths / no items / under 5 turns) for whichever tier is
          // currently selected — same shape StageDetailModal's own criteria already track.
          const earnedStars = dungeon.stageStars[tierStageId(stage.id, selectedTier)] ?? {
            noDeaths: false,
            noItems: false,
            underFiveTurns: false,
          };
          // COMPLETED requires at least 1 star, not just "cleared" — a stage can technically be
          // marked cleared (highestStageCleared) with zero recorded stars, and that shouldn't read
          // as "done". Otherwise NEW, unless the player already went in and lost once — a loss
          // means "no longer unseen" but also isn't a win, so it shows neither badge.
          const hasAnyStar = earnedStars.noDeaths || earnedStars.noItems || earnedStars.underFiveTurns;
          const hasBeenAttempted = attemptedStageIds.includes(stage.id);

          return (
            <div key={stage.id} className="relative aspect-[3/1] w-full rounded-xl">
              <button
                type="button"
                disabled={stage.isLocked}
                onClick={() => onSelectStage(stage)}
                className={cn(
                  "relative h-full w-full overflow-hidden rounded-xl text-left transition-[filter]",
                  stage.isLocked ? "cursor-not-allowed" : "hover:brightness-110"
                )}
              >
                <Image
                  src="/assets/ui/campaign_slot.png"
                  alt=""
                  fill
                  className={cn("object-fill", stage.isLocked && "opacity-50 grayscale")}
                />

                {/* Top (lighter) half: area number + name — centered in the zone, big and legible,
                    with real breathing room from the frame's top edge. */}
                <div className="absolute inset-x-0 top-0 flex h-[52%] flex-col items-center justify-center gap-1 px-3 pt-3 sm:flex-row sm:gap-2.5 sm:pt-4 lg:px-6 lg:pt-6">
                  <span className="flex h-6 shrink-0 items-center justify-center rounded-md border border-white/40 bg-black/30 px-2 font-arcade text-[10px] font-bold text-white sm:h-7 sm:text-xs lg:h-9 lg:px-3 lg:text-sm">
                    Area {areaNumber}
                  </span>
                  <span className="max-w-full truncate text-center text-sm font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-lg lg:text-2xl">
                    {stage.name}
                  </span>
                </div>

                {/* Bottom (darker) half ("mitad posterior"): "Rewards" label and the reward itself
                    on one line — the bottom padding (without matching top padding) nudges the
                    centered row up off the frame's bottom edge, into the true middle of the dark
                    zone. overflow-hidden + shrink-safe sizing so this never spills past the
                    frame's diagonal-cut corners. */}
                <div className="absolute inset-x-0 bottom-0 flex h-[48%] items-center justify-center gap-1.5 overflow-hidden px-3 pb-2 sm:pb-2.5 lg:px-6 lg:pb-14">
                  {stage.isLocked ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-white/60 sm:text-xs lg:text-sm">
                      <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Locked
                    </span>
                  ) : !tierUnlockedHere ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-white/60 sm:text-xs lg:text-sm">
                      <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {TIER_LABEL[selectedTier]} locked
                    </span>
                  ) : (
                    <>
                      <span className="shrink-0 font-arcade text-[9px] font-semibold uppercase tracking-widest text-white/85 sm:text-[10px] lg:text-xs">
                        Rewards:
                      </span>
                      {gear ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Image src={gear.icon} alt="" width={24} height={24} className="h-4 w-4 shrink-0 object-contain sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                          <span className="truncate text-xs font-semibold text-white sm:text-sm lg:text-base">{gear.name}</span>
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1.5">
                          <GoldCoinIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                          <span className="text-xs font-semibold text-white sm:text-sm lg:text-base">
                            {formatNumber(tierStage.rewardGold)}
                          </span>
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Three states: NEW (never even attempted) -> blank (attempted and lost — no
                    longer "unseen", but not a win either) -> COMPLETED (>=1 star earned).
                    Positioned inside the card's own corner (not hanging off it) so it renders over
                    the gray frame art instead of being clipped by the button's overflow-hidden;
                    nudged further in on lg so it sits on the frame's border, not above/outside it. */}
                {hasAnyStar ? (
                  <Image
                    src="/assets/ui/completed_notification.png"
                    alt=""
                    width={110}
                    height={46}
                    className="absolute left-1 top-1 h-6 w-auto object-contain drop-shadow-md lg:left-4 lg:top-4 lg:h-8"
                  />
                ) : (
                  !hasBeenAttempted && (
                    <Image
                      src="/assets/ui/new_notification.png"
                      alt=""
                      width={110}
                      height={46}
                      className="absolute left-1 top-1 h-6 w-auto object-contain drop-shadow-md lg:h-8"
                    />
                  )
                )}

                {/* 3-star objectives for the selected tier — top-right, mirroring NEW/COMPLETED's
                    top-left corner. Shown once unlocked, dim/unfilled until earned. */}
                {!stage.isLocked && (
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-1 lg:right-2 lg:top-2 lg:gap-1.5 lg:px-2.5 lg:py-2">
                    {[earnedStars.noDeaths, earnedStars.noItems, earnedStars.underFiveTurns].map((earned, idx) => (
                      <Star
                        key={idx}
                        className={cn("h-3 w-3 lg:h-5 lg:w-5", earned ? "fill-yellow-400 text-yellow-400" : "text-white/25")}
                      />
                    ))}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
