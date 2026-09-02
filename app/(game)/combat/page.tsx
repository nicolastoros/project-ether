"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Map } from "lucide-react";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { getStageEnemyTeam } from "@/lib/campaignEnemies";
import { getTierStage, parseTierStageId } from "@/lib/difficultyTiers";
import { PlaceholderView } from "@/components/ui/PlaceholderView";
import { BattlePage } from "@/components/combat/BattlePage";

function CombatPageContent() {
  const searchParams = useSearchParams();
  const stageId = searchParams.get("stage");
  const eventId = searchParams.get("eventId");
  const difficultyId = searchParams.get("difficultyId");

  if (eventId && difficultyId) {
    const { ORB_EVENTS } = require("@/lib/eventData");
    const ev = ORB_EVENTS.find((e: any) => e.id === eventId);
    const diff = ev?.difficulties.find((d: any) => d.id === difficultyId);
    if (ev && diff) {
      const eventRewards = [];
      if (diff.rewardAmount.small > 0) eventRewards.push({ itemId: `it-orb-small-${ev.element.toLowerCase()}`, amount: diff.rewardAmount.small });
      if (diff.rewardAmount.medium > 0) eventRewards.push({ itemId: `it-orb-medium-${ev.element.toLowerCase()}`, amount: diff.rewardAmount.medium });
      if (diff.rewardAmount.large > 0) eventRewards.push({ itemId: `it-orb-large-${ev.element.toLowerCase()}`, amount: diff.rewardAmount.large });

      const mockStage: any = {
        id: `${ev.id}-${diff.id}`,
        name: `${ev.name} [${diff.name}]`,
        world: 1, // Use W1 for background (ARENA_BACKGROUNDS[1]) and enemy scaling
        worldStageNumber: 8, // Use W1 Boss for enemy team
        stageNumber: 1,
        difficulty: "Normal",
        recommendedPower: diff.recommendedLevel * 100,
        isLocked: false,
        isCleared: false,
        staminaCost: diff.staminaCost,
        rewardGold: diff.staminaCost * 10,
        rewardExp: diff.staminaCost * 5,
        equipmentDropChance: 0,
        bgmKey: "bgm-boss-1",
        eventId: ev.id,
        eventRewards,
      };
      
      return <BattlePage stage={mockStage} />;
    }
  }

  // stageId may be a plain base id ("dg-stage-12") or a composite tier id ("dg-stage-12-hard")
  // from StageDetailModal.tsx's tier picker — recover the base stage and requested tier, then
  // rebuild the full (possibly-scaled) DungeonStage via getTierStage.
  const { baseId, tier } = stageId ? parseTierStageId(stageId) : { baseId: null, tier: "Easy" as const };
  const baseStage = DUNGEON_STAGES.find((s) => s.id === baseId);
  const stage = baseStage ? getTierStage(baseStage, tier) : undefined;

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
