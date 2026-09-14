import { useState } from "react";
import { motion } from "framer-motion";
import { X, Lock, Check, Star, Plus, Copy, Scale, Swords, Shield, Crown } from "lucide-react";
import type { Creature } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { PixelButton } from "@/components/ui/PixelButton";
import { POTENTIAL_TREE, PotentialNode } from "@/lib/hiddenPotential";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ELEMENT_GRADIENT, ELEMENT_ORB_COLOR } from "@/lib/elementVisuals";
import { syncProgressToServer, consumeItemOnServer } from "@/lib/syncProgress";
import { useSyncSettleGate } from "@/lib/useSyncGate";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

type BranchId = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const BRANCHES: { id: BranchId; label: string; desc: string; icon: typeof Scale }[] = [
  { id: "top-left", label: "Top-Left", desc: "Balanced (ATK/DEF)", icon: Scale },
  { id: "top-right", label: "Top-Right", desc: "Offensive (ATK/HP)", icon: Swords },
  { id: "bottom-left", label: "Bottom-Left", desc: "Defensive (HP/DEF)", icon: Shield },
  { id: "bottom-right", label: "Bottom-Right", desc: "Ultimate (ATK/HP)", icon: Crown },
];

// "sa"/"crit"/"evasion"/"heal" read as cryptic abbreviations on their own — spelled out here for
// the Advanced Node label, same way stat nodes already show a real stat name via statType.
const ADVANCED_LABEL: Record<string, string> = {
  sa: "Super Attack",
  crit: "Critical Rate",
  evasion: "Evasion",
  heal: "Healing",
};

// Node-type accent — a color language on top of the existing gold "progression" identity, so the
// three node kinds (plain stat grind vs. the rarer Duplicate Gate vs. the top-tier Advanced nodes)
// read apart at a glance instead of every node in the tree looking identical but for its label.
const NODE_ACCENT: Record<PotentialNode["type"], { text: string; border: string; bg: string; ring: string }> = {
  stat: { text: "text-gold-bright", border: "border-gold", bg: "bg-gold/15", ring: "rgba(255,184,77,0.55)" },
  gate: { text: "text-violet-300", border: "border-violet-400", bg: "bg-violet-500/15", ring: "rgba(167,139,250,0.55)" },
  advanced: { text: "text-cyan-300", border: "border-cyan-400", bg: "bg-cyan-500/15", ring: "rgba(34,211,238,0.55)" },
};

function orbIconSrc(color: string, size: "small" | "medium" | "large") {
  return `/assets/objects/orbs/${color}${size === "small" ? "" : `_${size}`}_orb.png`;
}

// Fixed, not random, so the ambient drift never looks lopsided across re-renders — same
// reasoning as CombatantCard.tsx's DEATH_PARTICLES.
const AMBIENT_MOTES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: (i * 0.6) % 6,
  duration: 7 + (i % 5),
  size: i % 3 === 0 ? 3 : 2,
}));

/** Full-screen ambient backdrop for the Hidden Potential shrine — a deep tech-cyan glow behind
 * the portrait, a slow-rotating "prism ring" borrowing LegendaryCardAura's conic-gradient trick
 * (recolored to the game's own cyan/gold "Digital Resonance" identity, blown up to fill the
 * screen instead of a card), and a scatter of drifting motes for depth. Purely decorative —
 * pointer-events-none, sits behind everything at z-0. */
function ShrineBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Fully opaque base FIRST — this used to be a bg-black/70 wash layered on top of the glows
          instead, which (combined with the branch tabs' own low-opacity panel background) let the
          app's real sidebar underneath ghost through on screens narrow enough to still render it.
          Everything decorative below is additive light on top of solid black, not a substitute
          for it. */}
      <div className="absolute inset-0 bg-black" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,211,238,0.16), transparent 60%), radial-gradient(ellipse 60% 50% at 50% 100%, rgba(255,184,77,0.08), transparent 60%)" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
        style={{
          background:
            "conic-gradient(from 0deg, #22d3ee, #eab308, #a78bfa, #22d3ee, #eab308, #a78bfa, #22d3ee)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
      {AMBIENT_MOTES.map((m, i) => (
        <motion.span
          key={i}
          className="absolute bottom-0 rounded-full bg-cyan-200/70"
          style={{ left: m.left, width: m.size, height: m.size }}
          animate={{ y: ["0vh", "-100vh"], opacity: [0, 0.7, 0] }}
          transition={{ duration: m.duration, repeat: Infinity, delay: m.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
}

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
  const { settling, runWithSettle } = useSyncSettleGate();

  const elementStr = liveCreature.element.toLowerCase();
  const orbColor = ELEMENT_ORB_COLOR[liveCreature.element];
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

    // unlockNode's own success/failure runs outside runWithSettle — a failed attempt (not enough
    // Orbs/dupes) never touched the server, so it doesn't deserve a fake "syncing" beat, just the
    // error toast. Only a real unlock enters the settle window (see useSyncSettleGate's doc
    // comment): buttons below disable and a LoadingOverlay covers the screen for SYNC_PAUSE_MS,
    // giving the consumeItemOnServer/syncProgressToServer calls fired here real time to land.
    if (unlockNode(liveCreature.id, node.id, cost, isGate)) {
      runWithSettle(() => {
        if (!isGate) {
          if (cost.small > 0) consumeItemOnServer(smallOrbId, cost.small);
          if (cost.medium > 0) consumeItemOnServer(mediumOrbId, cost.medium);
          if (cost.large > 0) consumeItemOnServer(largeOrbId, cost.large);
        }
        syncProgressToServer();
        toast.success(isGate ? "Gate Unlocked!" : "Node Unlocked!");
      });
    } else {
      toast.error(isGate ? "Not enough duplicate copies!" : "Not enough Orbs!");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col text-white sm:p-6 md:p-12">
      <ShrineBackdrop />

      {/* Header */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-cyan-400/20 bg-black/60 p-4 backdrop-blur-md sm:rounded-t-3xl sm:border">
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <motion.span
              className="absolute inset-0 rounded-xl"
              style={{ boxShadow: "0 0 0 2px rgba(255,184,77,0.5)" }}
              animate={{ boxShadow: ["0 0 8px 1px rgba(255,184,77,0.35)", "0 0 18px 4px rgba(255,184,77,0.6)", "0 0 8px 1px rgba(255,184,77,0.35)"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className={cn("flex h-full w-full items-center justify-center rounded-xl border border-gold/40 bg-gradient-to-b", ELEMENT_GRADIENT[liveCreature.element])}>
              <CreatureSprite creature={creature} className="h-9 w-9 drop-shadow-md" />
            </div>
          </div>
          <div>
            <h2 className="font-arcade text-lg tracking-wide text-gold-bright drop-shadow-[0_0_10px_rgba(255,184,77,0.5)]">Hidden Potential</h2>
            <p className="text-xs text-zinc-400">{liveCreature.name} · {liveCreature.copies > 1 ? `${liveCreature.copies - 1} Dupes Available` : "No Dupes"}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          disabled={settling}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-zinc-400 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden sm:flex-row sm:rounded-b-3xl sm:border sm:border-t-0 sm:border-cyan-400/20">
        {/* Sidebar / Tabs */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-cyan-400/10 bg-black/50 p-3 sm:w-64 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
          <div className="mb-2 hidden px-1 sm:block">
            <p className="font-arcade text-[10px] uppercase tracking-wider text-zinc-500">Your Orbs · {liveCreature.element}</p>
            <div className="mt-2 flex gap-2">
              {([
                ["small", smallOrbAmt] as const,
                ["medium", mediumOrbAmt] as const,
                ["large", largeOrbAmt] as const,
              ]).map(([size, amt]) => (
                <div key={size} className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={orbIconSrc(orbColor, size)} alt="" className="h-6 w-6 object-contain drop-shadow-[0_0_4px_rgba(255,255,255,0.25)]" />
                  <div className="font-mono text-xs">{amt}</div>
                </div>
              ))}
            </div>
          </div>

          {BRANCHES.map((b) => {
            const Icon = b.icon;
            const isActive = activeBranch === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setActiveBranch(b.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2.5 rounded-xl border p-3 text-left transition-colors sm:w-full",
                  // bg-arcade-panel/bg-arcade-border are light-theme tokens (white / pale blue) —
                  // wrong for this dark shrine, and at low opacity they barely registered at all
                  // against the backdrop, reading as "washed out" even before the separate
                  // bleed-through bug (see ShrineBackdrop's comment) made it worse.
                  isActive
                    ? "border-gold bg-gold/15 shadow-[0_0_16px_-2px_rgba(255,184,77,0.5)]"
                    : "border-white/10 bg-zinc-900/80 hover:border-gold/50 hover:bg-zinc-900"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-gold-bright" : "text-zinc-500")} />
                <div>
                  <div className={cn("font-arcade text-xs", isActive ? "text-white" : "text-zinc-300")}>{b.label}</div>
                  <div className="mt-0.5 text-[10px] text-zinc-500">{b.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-2xl space-y-4">
            {branchNodes.map((node, i) => {
              const isUnlocked = liveCreature.potentialNodes.includes(node.id);
              const isPrevUnlocked = !node.requiresNodeId || liveCreature.potentialNodes.includes(node.requiresNodeId);
              const isGate = node.type === "gate";
              const canUnlock = !isUnlocked && isPrevUnlocked && (isGate ? liveCreature.copies > 1 : true);
              const accent = NODE_ACCENT[node.type];
              const statLabel = node.type === "advanced" ? ADVANCED_LABEL[node.statType ?? ""] ?? node.statType : node.statType;

              return (
                <div key={node.id} className="relative">
                  <motion.div
                    className={cn(
                      "relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl border p-4 transition-opacity",
                      isUnlocked ? [accent.border, accent.bg] : "border-white/10 bg-black/50",
                      !isPrevUnlocked && "opacity-40 grayscale"
                    )}
                    animate={
                      canUnlock
                        ? { boxShadow: ["0 0 0px 0px rgba(255,255,255,0)", `0 0 22px 2px ${accent.ring}`, "0 0 0px 0px rgba(255,255,255,0)"] }
                        : undefined
                    }
                    transition={canUnlock ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border",
                          isUnlocked
                            ? cn(accent.border, accent.bg, accent.text)
                            : canUnlock
                              ? cn(accent.border, "bg-black/60", accent.text)
                              : "border-zinc-700 bg-zinc-900 text-zinc-600"
                        )}
                      >
                        {isGate ? <Copy className="h-5 w-5" /> : node.type === "advanced" ? <Star className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-arcade text-sm">
                          {isGate ? "Duplicate Gate" : node.type === "advanced" ? "Advanced Node" : "Stat Node"}
                        </h3>
                        {statLabel && (
                          <p className={cn("mt-0.5 text-xs uppercase", isUnlocked || canUnlock ? accent.text : "text-zinc-500")}>
                            +{node.value}{node.type === "advanced" && node.statType !== "sa" ? "%" : ""} {statLabel}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Cost — tiny orb icons instead of plain "Small/Medium/Large" text, so the
                          number a player needs to compare against their own sidebar balance is
                          shown in the same visual language, not translated through a label. */}
                      {!isUnlocked && isPrevUnlocked && !isGate && (
                        <div className="hidden items-center gap-2 sm:flex">
                          {(["small", "medium", "large"] as const).map((size) =>
                            node.cost[size] > 0 ? (
                              <span key={size} className="flex items-center gap-1 text-[11px] text-zinc-300">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={orbIconSrc(orbColor, size)} alt="" className="h-4 w-4 object-contain" />
                                {node.cost[size]}
                              </span>
                            ) : null
                          )}
                        </div>
                      )}

                      {isUnlocked ? (
                        <div className={cn("flex items-center gap-1.5 font-arcade text-[10px] uppercase tracking-wide", accent.text)}>
                          <Check className="h-4 w-4" /> Unlocked
                        </div>
                      ) : isPrevUnlocked ? (
                        <PixelButton
                          variant={canUnlock ? "gold" : "ghost"}
                          disabled={!canUnlock || settling}
                          onClick={() => handleUnlock(node)}
                          className="text-[10px]"
                        >
                          {isGate ? "Open (-1 Dupe)" : "Unlock"}
                        </PixelButton>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-600">
                          <Lock className="h-3.5 w-3.5" /> Locked
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Connector — a glowing conduit once both ends are powered, a flat dim bar
                      otherwise, instead of a single static gray/gold line regardless of state. */}
                  {i < branchNodes.length - 1 && (
                    <div className="absolute -bottom-4 left-[35px] h-4 w-0.5 overflow-hidden">
                      <div className={cn("h-full w-full", isUnlocked ? "bg-gold/30" : "bg-zinc-800")} />
                      {isUnlocked && (
                        <motion.div
                          className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-transparent via-gold-bright to-transparent"
                          animate={{ y: ["-100%", "300%"] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <LoadingOverlay show={settling} label="Saving potential..." />
    </div>
  );
}
