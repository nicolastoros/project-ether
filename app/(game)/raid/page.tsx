"use client";

import { useMemo, useState } from "react";
import { Flame, Zap } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { RAID_BOSSES, getRaidBossCreature, type RaidBoss } from "@/lib/raidBosses";
import { MultiCreaturePicker } from "@/components/combat/MultiCreaturePicker";
import { RaidBattleScreen } from "@/components/combat/RaidBattleScreen";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { GoldCoinIcon } from "@/components/icons/GoldCoinIcon";
import { formatNumber } from "@/lib/utils";

const MAX_RAID_PARTY = 4;

export default function RaidPage() {
  const creatures = useGameStore((s) => s.creatures);
  const isOnExpedition = useGameStore((s) => s.isOnExpedition);
  const energy = useGameStore((s) => s.currencies.energy);
  const spendEnergy = useGameStore((s) => s.spendEnergy);

  const [pickingBoss, setPickingBoss] = useState<RaidBoss | null>(null);
  const [playerIds, setPlayerIds] = useState<string[]>([]);
  const [fightingBoss, setFightingBoss] = useState<RaidBoss | null>(null);
  const [battleKey, setBattleKey] = useState(0);

  const excludedIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of creatures) {
      if (isOnExpedition(c.id)) set.add(c.id);
    }
    return set;
  }, [creatures, isOnExpedition]);

  if (fightingBoss) {
    const playerCreatures = playerIds
      .map((id) => creatures.find((c) => c.id === id))
      .filter((c): c is (typeof creatures)[number] => Boolean(c));
    return (
      <RaidBattleScreen
        key={battleKey}
        boss={fightingBoss}
        bossCreature={getRaidBossCreature(fightingBoss)}
        playerCreatures={playerCreatures}
        onRematch={() => setBattleKey((k) => k + 1)}
        onExit={() => {
          setFightingBoss(null);
          setPlayerIds([]);
        }}
      />
    );
  }

  if (pickingBoss) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">{pickingBoss.name}</h1>
          <p className="text-xs text-zinc-500">Choose up to {MAX_RAID_PARTY} creatures for this raid.</p>
        </div>
        <MultiCreaturePicker
          creatures={creatures}
          excludedIds={excludedIds}
          selectedIds={playerIds}
          maxCount={MAX_RAID_PARTY}
          onToggle={(id) =>
            setPlayerIds((prev) => {
              if (prev.includes(id)) return prev.filter((x) => x !== id);
              if (prev.length >= MAX_RAID_PARTY) return prev;
              return [...prev, id];
            })
          }
          confirmLabel="Start Raid"
          confirmDisabled={playerIds.length === 0 || energy < pickingBoss.staminaCost}
          onConfirm={() => {
            if (!spendEnergy(pickingBoss.staminaCost)) return;
            setFightingBoss(pickingBoss);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Raid Battle</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Special bosses with huge HP pools — bring up to {MAX_RAID_PARTY} creatures.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {RAID_BOSSES.map((boss) => (
          <GlowPanel key={boss.id} accent="gold" className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold bg-gold/10">
                <Flame className="h-5 w-5 text-gold-bright" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-arcade text-xs font-bold text-foreground">{boss.name}</p>
                <p className="text-[10px] text-zinc-500">{boss.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-zinc-600">
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3 w-3 text-neon" /> {boss.staminaCost} Stamina
              </span>
              <span className="inline-flex items-center gap-1">
                <GoldCoinIcon className="h-3 w-3" /> {formatNumber(boss.rewardGold)}
              </span>
            </div>
            <PixelButton
              variant="gold"
              className="mt-1 w-full"
              disabled={energy < boss.staminaCost}
              onClick={() => {
                setPickingBoss(boss);
                setPlayerIds([]);
              }}
            >
              Challenge
            </PixelButton>
          </GlowPanel>
        ))}
      </div>
    </div>
  );
}
