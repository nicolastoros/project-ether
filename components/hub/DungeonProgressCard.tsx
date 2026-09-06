"use client";

import Link from "next/link";
import { Map } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { CAMPAIGN_CHAPTERS } from "@/lib/campaignChapters";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function DungeonProgressCard() {
  const dungeon = useGameStore((s) => s.dungeon);

  const clearedStage = dungeon.highestStageCleared > 0
    ? DUNGEON_STAGES.find((s) => s.stageNumber === dungeon.highestStageCleared)
    : null;
  const chapter = clearedStage ? CAMPAIGN_CHAPTERS.find((c) => c.chapter === clearedStage.world) : null;
  const areasInChapter = chapter?.areaNames.length ?? 0;
  const percent = clearedStage && areasInChapter > 0
    ? Math.min(100, (clearedStage.worldStageNumber / areasInChapter) * 100)
    : 0;

  return (
    <Link href="/campaign">
      <GlowPanel accent="none" className="px-4 py-3 transition-colors hover:border-gold">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Map className="h-4 w-4 shrink-0 text-gold-bright" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Campaign Progress</p>
              <p className="truncate text-[10px] text-zinc-600">
                {clearedStage && areasInChapter > 0
                  ? `Chapter ${clearedStage.world} · ${clearedStage.name} (${clearedStage.worldStageNumber}/${areasInChapter})`
                  : "Chapter 1 · The Beginning · Not started yet"}
              </p>
            </div>
          </div>
          <span className="shrink-0 font-arcade text-[10px] text-gold-bright">Continue →</span>
        </div>
        <div className="mt-2.5">
          <ProgressBar percent={percent} color="exp" />
        </div>
      </GlowPanel>
    </Link>
  );
}
