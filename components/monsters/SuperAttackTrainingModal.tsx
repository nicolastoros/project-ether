import { useState } from "react";
import { motion } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import type { Creature } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { PixelButton } from "@/components/ui/PixelButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toast } from "sonner";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { syncProgressToServer } from "@/lib/syncProgress";

export function SuperAttackTrainingModal({
  creature,
  onClose,
}: {
  creature: Creature;
  onClose: () => void;
}) {
  const trainSuperAttack = useGameStore((s) => s.trainSuperAttack);
  // Get live creature data from store to ensure UI updates immediately
  const liveCreature = useGameStore((s) => s.creatures.find((c) => c.id === creature.id)) || creature;
  const [isAnimating, setIsAnimating] = useState(false);

  const maxLevel = liveCreature.rarity === "LR" ? 20 : liveCreature.rarity === "SSR" || liveCreature.rarity === "Mythic" ? 15 : 10;
  const isMaxed = liveCreature.superAttackLevel >= maxLevel;
  const canTrain = liveCreature.copies > 1 && !isMaxed;

  const handleTrain = () => {
    if (trainSuperAttack(liveCreature.id)) {
      syncProgressToServer();
      setIsAnimating(true);
      toast.success(`${liveCreature.name}'s Super Attack increased to Lv. ${liveCreature.superAttackLevel + 1}!`, {
        icon: "🌟"
      });
      setTimeout(() => setIsAnimating(false), 800);
    } else {
      toast.error("Not enough duplicate copies!");
    }
  };

  const skill = liveCreature.skills[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-t-3xl border border-arcade-border bg-arcade-panel shadow-xl sm:rounded-3xl"
      >
        <RarityCardAura rarity={liveCreature.rarity} />
        
        <div className="relative z-10 p-5 text-center">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-arcade-panel-light text-zinc-500 hover:text-foreground border border-arcade-border"
          >
            <X className="h-5 w-5" />
          </button>
          
          <h2 className="font-arcade text-lg text-gold-bright">Super Attack Training</h2>
          <p className="mt-1 text-xs text-zinc-500">Consume duplicate copies to power up.</p>

          <div className="mt-6 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-gold/40 bg-arcade-panel-light">
                <motion.div
                  animate={isAnimating ? { scale: [1, 1.4, 1], rotate: [0, 15, -15, 0], filter: ["brightness(1)", "brightness(2)", "brightness(1)"] } : {}}
                  transition={{ duration: 0.6 }}
                >
                  <CreatureSprite creature={liveCreature} className="h-16 w-16" />
                </motion.div>
                <motion.div 
                  className="absolute -bottom-2 whitespace-nowrap rounded-full border border-gold bg-arcade-panel px-2 py-0.5 font-arcade text-[10px] text-zinc-900 shadow-sm"
                  animate={isAnimating ? { scale: [1, 1.3, 1], color: ["#18181b", "#c9820f", "#18181b"] } : {}}
                >
                  Lv. {liveCreature.superAttackLevel}
                </motion.div>
                
                {isAnimating && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 2, 3], opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8 }}
                    className="pointer-events-none absolute inset-0 rounded-full border-2 border-gold"
                  />
                )}
              </div>
              
              <ArrowRight className="h-6 w-6 text-zinc-500" />
              
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-gold bg-arcade-panel-light opacity-60">
                <CreatureSprite creature={liveCreature} className="h-16 w-16 grayscale" />
                <div className="absolute -bottom-2 whitespace-nowrap rounded-full border border-gold bg-arcade-panel px-2 py-0.5 font-arcade text-[10px] text-zinc-500 shadow-sm">
                  Duplicates: {liveCreature.copies > 1 ? liveCreature.copies - 1 : 0}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-arcade-border bg-arcade-panel-light p-3 text-left">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground">{skill?.name || "Attack"}</h3>
              <span className="font-arcade text-[10px] text-red-500">Super Attack</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">{skill?.description || ""}</p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[10px] text-zinc-500">
                <span>Power Level</span>
                <span>Max: {maxLevel}</span>
              </div>
              <ProgressBar 
                percent={(liveCreature.superAttackLevel / maxLevel) * 100} 
                color="exp" 
                label={`Lv. ${liveCreature.superAttackLevel} / ${maxLevel}`} 
                showPercentText={false}
              />
            </div>
          </div>

          <div className="mt-6">
            <PixelButton
              variant={canTrain ? "gold" : "ghost"}
              className="w-full"
              disabled={!canTrain}
              onClick={handleTrain}
            >
              {isMaxed ? "Max Level Reached" : canTrain ? "Train (-1 Duplicate)" : "No Duplicates Available"}
            </PixelButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
