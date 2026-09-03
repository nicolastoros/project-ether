"use client";

import Image from "next/image";
import { Lock } from "lucide-react";
import { CAMPAIGN_CHAPTERS } from "@/lib/campaignChapters";
import { DIFFICULTY_TIERS, tierStageId } from "@/lib/difficultyTiers";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { useGameStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CHAPTER_LOGOS: Record<number, string> = {
  1: "/assets/ui/chapter1.png",
  2: "/assets/ui/chapter2.png",
  3: "/assets/ui/chapter3.png",
  4: "/assets/ui/chapter4.png",
};

interface ChapterListProps {
  onSelectChapter: (chapter: number) => void;
}

/** Top-level Campaign view — a grid of Chapter tiles (chapter_layout.png frame + that chapter's
 * logo), each opening into ChapterAreaList. Replaces the old per-World map. */
export function ChapterList({ onSelectChapter }: ChapterListProps) {
  const stageStars = useGameStore((s) => s.dungeon.stageStars);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {CAMPAIGN_CHAPTERS.map((chapter) => {
        const stages = DUNGEON_STAGES.filter((s) => s.world === chapter.chapter);
        // Same rule as each area's own badge (see ChapterAreaList) — every area needs >=1 earned
        // star (any tier), not just "cleared", or this reads as done when it isn't.
        const isChapterComplete =
          chapter.isAvailable &&
          stages.length > 0 &&
          stages.every((stage) =>
            DIFFICULTY_TIERS.some((tier) => {
              const stars = stageStars[tierStageId(stage.id, tier)];
              return stars && (stars.noDeaths || stars.noItems || stars.underFiveTurns);
            })
          );

        return (
          <button
            key={chapter.chapter}
            type="button"
            disabled={!chapter.isAvailable}
            onClick={() => onSelectChapter(chapter.chapter)}
            className={cn(
              "group relative aspect-[2/1] w-full overflow-hidden rounded-2xl transition-[filter]",
              chapter.isAvailable ? "hover:brightness-110" : "cursor-not-allowed"
            )}
          >
            <Image
              src="/assets/ui/chapter_layout.png"
              alt=""
              fill
              className={cn("object-contain", !chapter.isAvailable && "opacity-40 grayscale")}
            />

            {chapter.isAvailable ? (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                <Image
                  src={CHAPTER_LOGOS[chapter.chapter]}
                  alt={`Chapter ${chapter.chapter}`}
                  width={480}
                  height={160}
                  className="max-h-[45%] w-auto max-w-[60%] object-contain drop-shadow-lg"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/70">
                <Lock className="h-6 w-6 lg:h-8 lg:w-8" />
                <span className="font-arcade text-[10px] uppercase tracking-wide lg:text-xs">Coming Soon</span>
              </div>
            )}

            {chapter.isAvailable && (
              <Image
                src={isChapterComplete ? "/assets/ui/completed_notification.png" : "/assets/ui/new_notification.png"}
                alt=""
                width={140}
                height={60}
                className="absolute left-1 top-1 h-9 w-auto object-contain drop-shadow-md lg:h-12"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
