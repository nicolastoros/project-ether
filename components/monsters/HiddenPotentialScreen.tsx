import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Unlock, Star, Plus } from "lucide-react";
import type { Creature } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { PixelButton } from "@/components/ui/PixelButton";
import { POTENTIAL_TREE, PotentialNode } from "@/lib/hiddenPotential";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { syncProgressToServer, consumeItemOnServer } from "@/lib/syncProgress";


type BranchId = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const BRANCHES: { id: BranchId; label: string; desc: string }[] = [
  { id: "top-left", label: "Top-Left", desc: "Balanced (ATK/DEF)" },
  { id: "top-right", label: "Top-Right", desc: "Offensive (ATK/HP)" },
  { id: "bottom-left", label: "Bottom-Left", desc: "Defensive (HP/DEF)" },
  { id: "bottom-right", label: "Bottom-Right", desc: "Ultimate (ATK/HP)" },
];

export function HiddenPotentialScreen({
  creature,
  onClose,
}: {
  creature: Creature;
  onClose: () => void;
}) {
  const [activeBranch, setActiveBranch] = useState<BranchId>("top-left");
  const unlockNode = useGameStore((s) => s.unlockPotentialNode);
  const ownedItems = useGameStore((s) => s.ownedItems);
  const liveCreature = useGameStore((s) => s.creatures.find((c) => c.id === creature.id)) || creature;

  const elementStr = liveCreature.element.toLowerCase();
  const smallOrbId = `it-orb-small-${elementStr}`;
  const mediumOrbId = `it-orb-medium-${elementStr}`;
  const largeOrbId = `it-orb-large-${elementStr}`;

  const smallOrbAmt = ownedItems.find((i) => i.itemId === smallOrbId)?.quantity || 0;
  const mediumOrbAmt = ownedItems.find((i) => i.itemId === mediumOrbId)?.quantity || 0;
  const largeOrbAmt = ownedItems.find((i) => i.itemId === largeOrbId)?.quantity || 0;

  const branchNodes = POTENTIAL_TREE.filter((n) => n.branch === activeBranch);
  
  const handleUnlock = (node: PotentialNode) => {
    const isGate = node.type === "gate";
    const cost = { ...node.cost, element: liveCreature.element };
    
    if (unlockNode(liveCreature.id, node.id, cost, isGate)) {
      if (!isGate) {
        if (cost.small > 0) consumeItemOnServer(smallOrbId, cost.small);
        if (cost.medium > 0) consumeItemOnServer(mediumOrbId, cost.medium);
        if (cost.large > 0) consumeItemOnServer(largeOrbId, cost.large);
      }
      syncProgressToServer();
      toast.success(isGate ? "Gate Unlocked!" : "Node Unlocked!");
    } else {
      toast.error(isGate ? "Not enough duplicate copies!" : "Not enough Orbs!");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 text-white sm:p-6 md:p-12">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-arcade-border/50 bg-arcade-panel/50 p-4 backdrop-blur-md sm:rounded-t-3xl sm:border">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-b", ELEMENT_GRADIENT[liveCreature.element])}>
            <CreatureSprite creature={creature} className="h-8 w-8 drop-shadow-md" />
          </div>
          <div>
            <h2 className="font-arcade text-lg text-gold-bright">Hidden Potential</h2>
            <p className="text-xs text-zinc-400">{liveCreature.name} · {liveCreature.copies > 1 ? `${liveCreature.copies - 1} Dupes Available` : "No Dupes"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-zinc-400 transition-colors hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden sm:flex-row sm:rounded-b-3xl sm:border sm:border-t-0 sm:border-arcade-border/50">
        
        {/* Sidebar / Tabs */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-arcade-border/30 bg-black/50 p-3 sm:w-64 sm:flex-col sm:border-b-0 sm:border-r sm:overflow-y-auto">
          <div className="mb-2 hidden px-2 sm:block">
            <p className="font-arcade text-[10px] uppercase text-zinc-500">Your Orbs</p>
            <div className="mt-2 flex gap-2">
              <div className="flex-1 rounded-lg border border-arcade-border/50 bg-black/40 p-1.5 text-center text-xs">
                <div className="text-zinc-500">S</div>
                <div className="font-mono">{smallOrbAmt}</div>
              </div>
              <div className="flex-1 rounded-lg border border-arcade-border/50 bg-black/40 p-1.5 text-center text-xs">
                <div className="text-zinc-500">M</div>
                <div className="font-mono">{mediumOrbAmt}</div>
              </div>
              <div className="flex-1 rounded-lg border border-arcade-border/50 bg-black/40 p-1.5 text-center text-xs">
                <div className="text-zinc-500">L</div>
                <div className="font-mono">{largeOrbAmt}</div>
              </div>
            </div>
          </div>

          {BRANCHES.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBranch(b.id)}
              className={cn(
                "flex shrink-0 flex-col items-start rounded-xl border p-3 text-left transition-colors sm:w-full",
                activeBranch === b.id
                  ? "border-gold bg-gold/10"
                  : "border-arcade-border/30 bg-arcade-panel/50 hover:bg-arcade-panel"
              )}
            >
              <div className="font-arcade text-xs text-white">{b.label}</div>
              <div className="mt-1 text-[10px] text-zinc-400">{b.desc}</div>
            </button>
          ))}
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto bg-black p-4">
          <div className="mx-auto max-w-2xl space-y-4">
            {branchNodes.map((node, i) => {
              const isUnlocked = liveCreature.potentialNodes.includes(node.id);
              const isPrevUnlocked = !node.requiresNodeId || liveCreature.potentialNodes.includes(node.requiresNodeId);
              const isGate = node.type === "gate";
              const canUnlock = !isUnlocked && isPrevUnlocked && (isGate ? liveCreature.copies > 1 : true);
              
              return (
                <div
                  key={node.id}
                  className={cn(
                    "relative flex items-center justify-between rounded-2xl border p-4 transition-opacity",
                    isUnlocked ? "border-gold/50 bg-gold/5" : "border-arcade-border bg-arcade-panel/80",
                    !isPrevUnlocked && "opacity-40 grayscale"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border",
                      isUnlocked ? "border-gold bg-gold/20 text-gold-bright" : "border-zinc-700 bg-zinc-900 text-zinc-500"
                    )}>
                      {isGate ? <Lock className="h-5 w-5" /> : node.type === "advanced" ? <Star className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-arcade text-sm">
                        {isGate ? "Duplicate Gate" : node.type === "advanced" ? "Advanced Node" : "Stat Node"}
                      </h3>
                      {node.statType && (
                        <p className="mt-0.5 text-xs text-zinc-400 uppercase">
                          +{node.value} {node.statType}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Cost */}
                    {!isUnlocked && isPrevUnlocked && !isGate && (
                      <div className="hidden flex-col items-end gap-1 text-[10px] text-zinc-400 sm:flex">
                        {node.cost.small > 0 && <span>{node.cost.small} Small</span>}
                        {node.cost.medium > 0 && <span>{node.cost.medium} Medium</span>}
                        {node.cost.large > 0 && <span>{node.cost.large} Large</span>}
                      </div>
                    )}

                    {isUnlocked ? (
                      <div className="flex items-center gap-1 font-arcade text-xs text-gold-bright">
                        <Unlock className="h-4 w-4" /> Unlocked
                      </div>
                    ) : (
                      <PixelButton
                        variant={canUnlock ? "gold" : "ghost"}
                        disabled={!canUnlock}
                        onClick={() => handleUnlock(node)}
                        className="text-[10px]"
                      >
                        {isGate ? "Open (-1 Dupe)" : "Unlock"}
                      </PixelButton>
                    )}
                  </div>

                  {/* Connector Line */}
                  {i < branchNodes.length - 1 && (
                    <div className={cn(
                      "absolute -bottom-4 left-[31px] h-4 w-0.5",
                      isUnlocked ? "bg-gold" : "bg-zinc-800"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
