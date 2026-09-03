"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { CAMPAIGN_CHAPTERS } from "@/lib/campaignChapters";
import type { DungeonStage } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { ChapterList } from "@/components/campaign/ChapterList";
import { ChapterAreaList } from "@/components/campaign/ChapterAreaList";
import { StageDetailModal } from "@/components/campaign/StageDetailModal";

export function CampaignHome() {
  const highestCleared = useGameStore((s) => s.dungeon.highestStageCleared);
  const markCampaignSeen = useGameStore((s) => s.markCampaignSeen);

  // ?chapter=N deep-links straight into that chapter's Area List — used by BattleScreen's "Exit"
  // button so finishing a battle returns you to the area you were just in, not the chapter picker.
  // Read once on mount (initial state only), same as the rest of this component's simple local
  // view state — not kept in sync with the URL afterward.
  const searchParams = useSearchParams();
  const linkedChapter = CAMPAIGN_CHAPTERS.find(
    (c) => c.chapter === Number(searchParams.get("chapter")) && c.isAvailable
  );

  const [view, setView] = useState<"chapters" | "areas">(linkedChapter ? "areas" : "chapters");
  const [activeChapter, setActiveChapter] = useState(linkedChapter?.chapter ?? 1);
  const [selectedStage, setSelectedStage] = useState<DungeonStage | null>(null);

  // Opening Campaign at all clears its nav badge — the old special-casing around specific World
  // numbers doesn't apply anymore now that there are only a handful of Chapters.
  useEffect(() => {
    markCampaignSeen();
  }, [markCampaignSeen]);

  const chapter = CAMPAIGN_CHAPTERS.find((c) => c.chapter === activeChapter) ?? CAMPAIGN_CHAPTERS[0];
  // isLocked/isCleared on DUNGEON_STAGES are seed placeholders — override with real progress from
  // the store (dungeon.highestStageCleared, updated by BattleScreen on victory), same as before.
  const chapterStages = DUNGEON_STAGES.filter((s) => s.world === activeChapter).map((s) => ({
    ...s,
    isCleared: s.stageNumber <= highestCleared,
    isLocked: s.stageNumber > highestCleared + 1,
  }));

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0">
        <h1 className="font-arcade text-lg glow-text-gold">Campaign</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {view === "chapters" ? "Pick a chapter to see its areas." : "Pick an area, then clear it to progress."}
        </p>
      </div>

      <div className="min-h-0 flex-1">
        {view === "chapters" ? (
          <ChapterList
            onSelectChapter={(chapterNum) => {
              setActiveChapter(chapterNum);
              setView("areas");
            }}
          />
        ) : (
          <ChapterAreaList
            chapter={chapter}
            stages={chapterStages}
            onBack={() => setView("chapters")}
            onSelectStage={setSelectedStage}
          />
        )}
      </div>

      <StageDetailModal stage={selectedStage} onClose={() => setSelectedStage(null)} />
    </div>
  );
}
