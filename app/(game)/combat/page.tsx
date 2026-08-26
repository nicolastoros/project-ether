"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Map } from "lucide-react";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { getStageEnemyTeam } from "@/lib/campaignEnemies";
import { PlaceholderView } from "@/components/ui/PlaceholderView";
import { BattlePage } from "@/components/combat/BattlePage";

function CombatPageContent() {
  const searchParams = useSearchParams();
  const stageId = searchParams.get("stage");
  const stage = DUNGEON_STAGES.find((s) => s.id === stageId);

  // Worlds 1 and 2 have a defined enemy line-up per stage (lib/campaignEnemies.ts); other worlds
  // don't have real battle content yet. This route only exists to serve those real Campaign
  // battles via ?stage= (see StageDetailModal.tsx) — there's no standalone "sandbox" mode here
  // anymore (see Raid Battle / Expeditions for that).
  if (stage && getStageEnemyTeam(stage) !== null) {
    return <BattlePage stage={stage} />;
  }

  return (
    <PlaceholderView
      icon={Map}
      title="Pick a stage from Campaign"
      description="This screen only runs real Campaign battles — head to Campaign and select a stage to fight."
    />
  );
}

export default function CombatPage() {
  return (
    <Suspense fallback={null}>
      <CombatPageContent />
    </Suspense>
  );
}
