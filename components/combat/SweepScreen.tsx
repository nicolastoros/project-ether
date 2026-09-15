"use client";

import { useEffect, useMemo, useState } from "react";
import type { Creature, DungeonStage } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { grantStageRewards, type StageRewardResult } from "@/lib/battleRewards";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Zap } from "lucide-react";
import { BattleResultScreen } from "./BattleResultScreen";
import { useT } from "@/lib/i18n/useT";

// Display name for the World 1-1 first-clear gift — see lib/battleRewards.ts's own
// FIRST_CLEAR_GIFT_CREATURE_ID (and BattleScreen.tsx's identical constant) for the id this must
// stay in sync with.
const FIRST_CLEAR_GIFT_CREATURE_NAME = "Dragoon";

interface SweepScreenProps {
  stage: DungeonStage;
  playerCreatures: Creature[];
  onExit: () => void;
  onResweep?: () => void;
}

/** Instant-clear path — same "no simulation, straight to the reward screen" idea as before, now
 * sharing lib/battleRewards.ts's grantStageRewards with the real BattleScreen.tsx instead of its
 * own independently-reimplemented (and previously incomplete — missing the first-clear multiplier,
 * Exchange/Awaken Coins, Tamer gear, achievements, the first-stage-1 gift) reward math, and
 * rendering the same shared BattleResultScreen so all of that is actually visible instead of
 * silently dropped by a bespoke panel that only ever had slots for gold/EXP/Seal Coins/items. */
export function SweepScreen({ stage, playerCreatures, onExit, onResweep }: SweepScreenProps) {
  const t = useT();
  const guild = useGameStore((s) => s.guild);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const equippedTamerGear = useGameStore((s) => s.equippedTamerGear);

  const activeTamerGear = useMemo(() => {
    const equippedGearIds = new Set(Object.values(equippedTamerGear).filter(Boolean));
    return tamerInventory.filter((gear) => equippedGearIds.has(gear.id));
  }, [tamerInventory, equippedTamerGear]);

  const [result, setResult] = useState<StageRewardResult | null>(null);

  useEffect(() => {
    const isEventBattle = Boolean(stage.eventRewards);
    setResult(grantStageRewards({ stage, playerCreatures, isEventBattle, activeTamerGear, guild }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // LoadingOverlay is already a fixed, full-viewport overlay — no wrapper needed here. Same
  // "results are being calculated" beat as a real battle's own SYNC_PAUSE_MS-gated showResult —
  // grantStageRewards' own syncProgressToServer call is fire-and-forget, so this isn't just a
  // decorative pause: it's the same protection against Continue being tapped before that write
  // has any real chance to land.
  if (!result) {
    return <LoadingOverlay show label={t("battle.calculating_results")} />;
  }

  return (
    <BattleResultScreen
      phase="victory"
      title={stage.name}
      goldEarned={stage.rewardGold * result.rewardMultiplier}
      creatureResults={result.creatureResults}
      itemsDropped={result.itemsDropped}
      sealCoinsDropped={result.sealCoinsDropped}
      tamerResult={result.tamerResult}
      skipKoSplash
      bonusLines={[
        result.rewardMultiplier > 1 && t("battle.first_clear_bonus"),
        result.isExpEventStage && (
          <span className="inline-flex items-center gap-1 text-sky-500">
            <Zap className="h-3 w-3 fill-current" /> {t("battle.exp_event")}
          </span>
        ),
        result.firstClearGift &&
          (result.firstClearGift.isNew
            ? `${FIRST_CLEAR_GIFT_CREATURE_NAME}${t("battle.joined_roster_suffix")}`
            : `${t("battle.copy_owned_prefix")}${FIRST_CLEAR_GIFT_CREATURE_NAME}${t("battle.copy_owned_mid")}${result.firstClearGift.copies}${t("battle.copy_owned_suffix")}`),
        result.tamerGearGranted && `${result.tamerGearGranted}${t("battle.tamer_gear_unlocked_suffix")}`,
      ].filter((line): line is NonNullable<typeof line> => Boolean(line))}
      rematchLabel={t("sweep.re_sweep")}
      onRematch={onResweep ?? (() => {})}
      onExitClick={onExit}
      exitLabel={t("sweep.continue")}
    />
  );
}
