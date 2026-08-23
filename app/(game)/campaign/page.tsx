"use client";

import { useState } from "react";
import { DUNGEON_STAGES } from "@/lib/gameData";
import type { DungeonStage } from "@/types/game";
import { CampaignMap } from "@/components/campaign/CampaignMap";
import { StageDetailModal } from "@/components/campaign/StageDetailModal";

export default function CampaignPage() {
  const [selectedStage, setSelectedStage] = useState<DungeonStage | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Campaign</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Follow the path, clear each stage, and push toward the next world.
        </p>
      </div>

      <CampaignMap stages={DUNGEON_STAGES} onSelectStage={setSelectedStage} />

      <StageDetailModal stage={selectedStage} onClose={() => setSelectedStage(null)} />
    </div>
  );
}
