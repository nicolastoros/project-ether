"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Map } from "lucide-react";
import type { DungeonStage } from "@/types/game";
import { DUNGEON_STAGES } from "@/lib/gameData";
import { getStageEnemyTeam } from "@/lib/campaignEnemies";
import { getTierStage, parseTierStageId } from "@/lib/difficultyTiers";
import { ALL_ORB_ELEMENTS, ORB_EVENTS, getEventEnemyTeam } from "@/lib/eventData";
import { PlaceholderView } from "@/components/ui/PlaceholderView";
import { BattlePage } from "@/components/combat/BattlePage";

function CombatPageContent() {
  const searchParams = useSearchParams();
  const stageId = searchParams.get("stage");
  const eventId = searchParams.get("eventId");
  const difficultyId = searchParams.get("difficultyId");

  if (eventId && difficultyId) {
    const ev = ORB_EVENTS.find((e) => e.id === eventId);
    const diff = ev?.difficulties.find((d) => d.id === difficultyId);
    if (ev && diff) {
      // One win now grants every element's Orbs (not just one fixed element) — see
      // lib/eventData.ts's ORB_EVENTS consolidation comment.
      const eventRewards: { itemId: string; amount: number }[] = [];
      for (const element of ALL_ORB_ELEMENTS) {
        const el = element.toLowerCase();
        if (diff.rewardAmount.small > 0) eventRewards.push({ itemId: `it-orb-small-${el}`, amount: diff.rewardAmount.small });
        if (diff.rewardAmount.medium > 0) eventRewards.push({ itemId: `it-orb-medium-${el}`, amount: diff.rewardAmount.medium });
        if (diff.rewardAmount.large > 0) eventRewards.push({ itemId: `it-orb-large-${el}`, amount: diff.rewardAmount.large });
      }

      // Purely a display/background/reward-shape vehicle now — world/worldStageNumber no longer
      // drive the enemy team (see eventEnemies below), so this event stops silently reusing
      // Campaign World 1's boss line-up and its "Easy"-only scaling.
      const mockStage: DungeonStage = {
        id: `${ev.id}-${diff.id}`,
        name: `${ev.name} [${diff.name}]`,
        world: 1, // Only used to pick ARENA_BACKGROUNDS[1] — no Campaign meaning beyond that here.
        worldStageNumber: 8,
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

      return (
        <BattlePage
          stage={mockStage}
          eventEnemies={getEventEnemyTeam(diff)}
          eventMaxWeeklyAttempts={ev.maxWeeklyAttempts}
        />
      );
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
