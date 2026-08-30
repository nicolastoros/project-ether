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

interface RaidEvent {
  id: string;
  name: string;
  description: string;
  bannerImage: string | null;
  bossIds: string[];
}

const RAID_EVENTS: RaidEvent[] = [
  {
    id: "event-crimson",
    name: "Crimson Divine Power",
    description: "Challenge the Holy Knight to prove your worth and earn massive rewards!",
    bannerImage: "/assets/events/crimsondivinepower.png",
    bossIds: [
      "raid-crimson-paladin-hard",
      "raid-crimson-paladin-super",
      "raid-crimson-paladin-super2",
      "raid-crimson-paladin-super3",
    ]
  },
  {
    id: "event-silver-dragon",
    name: "Elder Dragon's Awakening",
    description: "An ancient Mythic dragon, far beyond anything Campaign has thrown at you yet.",
    bannerImage: null,
    bossIds: [
      "raid-elder-silver-dragon"
    ]
  }
];

function getDifficultyImage(bossId: string) {
  if (bossId.includes("-super3")) return "/assets/events/super3.png";
  if (bossId.includes("-super2")) return "/assets/events/super2.png";
  if (bossId.includes("-super")) return "/assets/events/super.png";
  if (bossId.includes("-hard")) return "/assets/events/hard.png";
  return null;
}

export default function RaidPage() {
  const creatures = useGameStore((s) => s.creatures);
  const isOnExpedition = useGameStore((s) => s.isOnExpedition);
  const energy = useGameStore((s) => s.currencies.energy);
  const spendEnergy = useGameStore((s) => s.spendEnergy);

  const [selectedEvent, setSelectedEvent] = useState<RaidEvent | null>(null);
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
          <button onClick={() => setPickingBoss(null)} className="text-zinc-500 hover:text-white mb-2 text-xs">
             ← Back to Stages
          </button>
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

  if (selectedEvent) {
    const eventBosses = RAID_BOSSES.filter(b => selectedEvent.bossIds.includes(b.id));
    return (
      <div className="space-y-4">
        <div>
          <button onClick={() => setSelectedEvent(null)} className="text-zinc-500 hover:text-white mb-2 text-xs">
             ← Back to Events
          </button>
          <h1 className="font-arcade text-lg glow-text-gold">{selectedEvent.name}</h1>
          <p className="mt-1 text-xs text-zinc-500">{selectedEvent.description}</p>
        </div>

        {selectedEvent.bannerImage && (
          <div className="rounded-xl border border-arcade-border overflow-hidden bg-black flex items-center justify-center">
             <img src={selectedEvent.bannerImage} alt={selectedEvent.name} className="w-full max-w-[600px] h-auto object-cover" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {eventBosses.map((boss) => {
            const diffImg = getDifficultyImage(boss.id);
            return (
              <GlowPanel key={boss.id} accent="gold" className="flex flex-col sm:flex-row gap-4 p-4 items-center relative overflow-hidden bg-arcade-panel-light/80 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                {diffImg && (
                  <div className="w-32 h-14 sm:w-40 sm:h-16 shrink-0 relative flex justify-center items-center">
                    <img 
                      src={diffImg} 
                      className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] pointer-events-none transition-transform group-hover:scale-105" 
                      alt="Difficulty" 
                    />
                  </div>
                )}
                
                <div className="min-w-0 flex-1 text-center sm:text-left z-10">
                  <p className="font-arcade text-sm font-bold text-foreground glow-text-gold">{boss.name.replace(/\s*\(.*\)\s*/, '')}</p>
                  <p className="text-xs text-zinc-400 mt-1">{boss.description}</p>
                  
                  <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-zinc-500 mt-2">
                    <span className="inline-flex items-center gap-1 font-arcade">
                      <Zap className="h-3 w-3 text-neon" /> {boss.staminaCost} STAMINA
                    </span>
                    <span className="inline-flex items-center gap-1 font-arcade">
                      <GoldCoinIcon className="h-3 w-3" /> {formatNumber(boss.rewardGold)} GOLD
                    </span>
                  </div>
                </div>
                
                <PixelButton
                  variant="gold"
                  className="w-full sm:w-32 shrink-0 z-10 mt-2 sm:mt-0"
                  disabled={energy < boss.staminaCost}
                  onClick={() => {
                    setPickingBoss(boss);
                    setPlayerIds([]);
                  }}
                >
                  Challenge
                </PixelButton>
              </GlowPanel>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Raid Events</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Select an event to challenge its bosses. More events will be added over time!
        </p>
        <button 
           onClick={() => useGameStore.getState().regenEnergy(100)}
           className="mt-2 font-arcade text-[10px] text-neon underline"
        >
          [Recover 100 Energy]
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {RAID_EVENTS.map((evt) => (
          <button 
            key={evt.id} 
            onClick={() => setSelectedEvent(evt)}
            className="group relative overflow-hidden rounded-xl border-2 border-arcade-border bg-arcade-panel-light text-left transition-all hover:scale-[1.02] shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-gold hover:shadow-gold/30"
          >
            {evt.bannerImage ? (
              <img src={evt.bannerImage} alt={evt.name} className="w-full h-auto max-h-[160px] object-cover" />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center p-4">
                 <p className="font-arcade text-base text-gold glow-text-gold">{evt.name}</p>
              </div>
            )}
            
            {/* Dark gradient overlay for text readability */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-6">
               <p className="font-arcade text-xs text-white">{evt.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
