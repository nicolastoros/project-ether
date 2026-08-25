"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Swords } from "lucide-react";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { PlaceholderView } from "@/components/ui/PlaceholderView";
import { BattlePage } from "@/components/combat/BattlePage";

function CombatPageContent() {
  const searchParams = useSearchParams();
  const stageId = searchParams.get("stage");
  const stage = DUNGEON_STAGES.find((s) => s.id === stageId);

  // World 1 has a defined enemy line-up per stage (lib/campaignEnemies.ts); other worlds
  // don't have real battle content yet, so they still fall through to the sandbox placeholder.
  if (stage && stage.world === 1) {
    return <BattlePage stage={stage} />;
  }

  return (
    <PlaceholderView
      icon={Swords}
      title="Auto-DG / Combat Sandbox"
      description="The full ATB lane battle arena lands next. For now, try World 1-1 from the Campaign to test the new 2v2 turn-based battle."
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
