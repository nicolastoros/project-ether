"use client";

import { useMemo, useState, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Lock, Zap, Coins, Sparkles, ChevronLeft, ChevronRight, Hammer } from "lucide-react";
import { DUNGEON_STAGES, TAMER_EQUIPMENT_CATALOG } from "@/lib/gameData";
import { CAMPAIGN_WORLDS } from "@/lib/campaignWorlds";
import { getDailyExpEventStageId } from "@/lib/expEvent";
import type { DungeonStage } from "@/types/game";
import { useGameStore } from "@/lib/store";
import { CampaignWorldMap } from "@/components/campaign/CampaignWorldMap";
import { StageDetailModal } from "@/components/campaign/StageDetailModal";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { cn } from "@/lib/utils";

/** Tamer gear thematically tied to a world: any item whose set has at least one campaign-clear
 * piece dropping in that world (e.g. Crimson's hat/shoulders both come from World 1, so its
 * craftable chest/legs/shoes count as "this world's gear" too). */
function tamerGearForWorld(world: number) {
  const setNames = new Set(
    TAMER_EQUIPMENT_CATALOG.filter((t) => {
      if (t.source.kind !== "campaign-clear") return false;
      const stageId = t.source.stageId;
      const stage = DUNGEON_STAGES.find((s) => s.id === stageId);
      return stage?.world === world;
    }).map((t) => t.setName)
  );
  return TAMER_EQUIPMENT_CATALOG.filter((t) => setNames.has(t.setName));
}

export function CampaignHome() {
  const highestCleared = useGameStore((s) => s.dungeon.highestStageCleared);
  const tamerInventory = useGameStore((s) => s.tamerInventory);
  const [activeWorld, setActiveWorld] = useState(1);
  const [selectedStage, setSelectedStage] = useState<DungeonStage | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollSectors = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -250 : 250,
        behavior: "smooth"
      });
    }
  };

  const world = CAMPAIGN_WORLDS.find((w) => w.world === activeWorld) ?? CAMPAIGN_WORLDS[0];
  // isLocked/isCleared on DUNGEON_STAGES are seed placeholders — override with real progress
  // from the store (dungeon.highestStageCleared, updated by BattleScreen on victory).
  const worldStages = DUNGEON_STAGES.filter((s) => s.world === activeWorld).map((s) => ({
    ...s,
    isCleared: s.stageNumber <= highestCleared,
    isLocked: s.stageNumber > highestCleared + 1,
  }));

  const clearedInWorld = worldStages.filter((s) => s.isCleared).length;
  const eventStageId = useMemo(
    () => getDailyExpEventStageId(activeWorld, DUNGEON_STAGES),
    [activeWorld]
  );
  const eventStage = worldStages.find((s) => s.id === eventStageId) ?? null;
  const worldGear = tamerGearForWorld(activeWorld);
  const ownedGearIds = new Set(tamerInventory.map((t) => t.id));

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0">
        <h1 className="font-arcade text-lg glow-text-gold">Campaign</h1>
        <p className="mt-1 text-xs text-zinc-500">Pick a world, then follow the path and clear each stage.</p>
      </div>

      {/* Side gutters use the extra width AppShell's max-w opened up (see monsters/page.tsx for
          the same pattern) — World Info on the left, obtainable Tamer gear on the right. Both
          collapse away below lg since there isn't room to spare on mobile. */}
      <div className="flex min-h-0 flex-1 gap-3 lg:flex-row lg:items-stretch">
        
        {/* CENTER SECTION: Map + World Selector */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-row gap-3 lg:flex-col">
          {/* Mobile Worlds Selector (Vertical) */}
          <div className="scrollbar-hidden flex w-16 shrink-0 flex-col gap-2 overflow-y-auto sm:w-24 lg:hidden">
            {CAMPAIGN_WORLDS.map((w) => (
              <button
                key={w.world}
                type="button"
                onClick={() => setActiveWorld(w.world)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-2 py-2.5 font-arcade transition-colors",
                  activeWorld === w.world
                    ? "border-gold bg-gold/10 text-gold-bright"
                    : "border-arcade-border bg-arcade-panel text-zinc-500 hover:text-foreground"
                )}
              >
                <span className="text-[9px] uppercase tracking-wide">World</span>
                <span className="text-base font-bold">{w.world}</span>
                {!w.isAvailable && (
                  <>
                    <Lock className="mt-0.5 h-3 w-3" />
                    <span className="text-center text-[6px] leading-tight text-zinc-400">(bloqueados aún)</span>
                  </>
                )}
              </button>
            ))}
          </div>

          {/* PC Worlds Selector (Horizontal Tech) */}
          <div className="relative hidden w-full shrink-0 lg:flex items-center group">
            <button
              onClick={() => scrollSectors("left")}
              className="absolute left-0 z-10 -ml-4 flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-500 shadow-md opacity-0 transition-all hover:bg-sky-50 hover:scale-110 group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div ref={scrollContainerRef} className="scrollbar-hidden flex w-full gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth px-1">
              {CAMPAIGN_WORLDS.map((w) => (
                <button
                  key={w.world}
                  type="button"
                  onClick={() => setActiveWorld(w.world)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl border-2 px-6 py-3 font-arcade transition-all",
                    activeWorld === w.world
                      ? "border-sky-400 bg-white text-sky-600 shadow-[0_8px_20px_-6px_rgba(56,189,248,0.4)]"
                      : "border-slate-200 bg-white/60 text-slate-400 hover:border-slate-300 hover:bg-white hover:text-slate-600"
                  )}
                >
                  {/* Active state particles/tech effect */}
                  {activeWorld === w.world && (
                    <motion.div
                      layoutId="pcWorldActiveBg"
                      className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(56,189,248,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] opacity-80"
                      animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  
                  <div className="relative z-10 flex flex-col items-start leading-none">
                    <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">Sector</span>
                    <span className="mt-1 text-2xl font-bold">W{w.world}</span>
                  </div>
                  {!w.isAvailable && (
                    <Lock className="relative z-10 ml-2 h-5 w-5 opacity-40" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => scrollSectors("right")}
              className="absolute right-0 z-10 -mr-4 flex h-8 w-8 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-500 shadow-md opacity-0 transition-all hover:bg-sky-50 hover:scale-110 group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="min-w-0 flex-1 lg:h-full lg:min-h-[320px] relative group">
            {world.isAvailable ? (
              <CampaignWorldMap world={world} stages={worldStages} onSelectStage={setSelectedStage} />
            ) : (
              <GlowPanel accent="none" className="flex h-full flex-col items-center justify-center gap-2 rounded-3xl p-8 text-center lg:border-sky-200 lg:bg-white/80 lg:shadow-xl lg:shadow-sky-900/5">
                <Lock className="h-10 w-10 text-slate-300 lg:text-sky-300" />
                <p className="font-arcade text-sm text-zinc-500 lg:text-sky-600">Sector {world.world} — Locked</p>
              </GlowPanel>
            )}

            {/* PC World Navigation Arrows */}
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-4 lg:flex">
              <button
                type="button"
                className={cn("pointer-events-auto flex h-10 w-10 xl:h-12 xl:w-12 items-center justify-center rounded-full border border-sky-200 bg-white/90 text-sky-600 shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-sky-50", activeWorld <= 1 && "opacity-0 pointer-events-none")}
                onClick={() => setActiveWorld(Math.max(1, activeWorld - 1))}
              >
                <ChevronLeft className="h-6 w-6 xl:h-8 xl:w-8" />
              </button>
              
              <button
                type="button"
                className={cn("pointer-events-auto flex h-10 w-10 xl:h-12 xl:w-12 items-center justify-center rounded-full border border-sky-200 bg-white/90 text-sky-600 shadow-xl backdrop-blur-md transition-all hover:scale-110 hover:bg-sky-50", activeWorld >= CAMPAIGN_WORLDS.length && "opacity-0 pointer-events-none")}
                onClick={() => setActiveWorld(Math.min(CAMPAIGN_WORLDS.length, activeWorld + 1))}
              >
                <ChevronRight className="h-6 w-6 xl:h-8 xl:w-8" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (PC ONLY) */}
        <div className="hidden shrink-0 flex-col gap-4 lg:flex lg:w-[280px] xl:w-[350px] 2xl:w-[420px]">
          {/* World Info */}
          <GlowPanel accent="none" className="flex shrink-0 flex-col gap-4 rounded-2xl border-2 border-sky-100 bg-white/90 p-5 shadow-xl backdrop-blur-md transition-all">
            <div>
              <p className="font-arcade text-[11px] uppercase tracking-widest text-sky-500/80">System Info</p>
              <p className="mt-1 text-lg font-bold text-slate-800 xl:text-xl 2xl:text-2xl">
                Sector {world.world} {world.isAvailable && <span className="opacity-70">/ {world.name}</span>}
              </p>
            </div>

            {world.isAvailable ? (
              <>
                <div className="rounded-xl bg-slate-50 p-4 shadow-inner">
                  <ProgressBar
                    percent={worldStages.length > 0 ? (clearedInWorld / worldStages.length) * 100 : 0}
                    color="exp"
                    label={`${clearedInWorld}/${worldStages.length} stages cleared`}
                    showPercentText
                  />
                </div>

                {eventStage && (
                  <button
                    type="button"
                    onClick={() => setSelectedStage(eventStage)}
                    className="group relative flex flex-col items-start gap-1 overflow-hidden rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-white p-4 text-left shadow-md transition-all hover:border-sky-400 hover:shadow-sky-200"
                  >
                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-sky-200/40 blur-2xl transition-all group-hover:bg-sky-400/30" />
                    
                    <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 font-arcade text-[10px] font-bold uppercase text-sky-600 xl:text-[11px]">
                      <Zap className="h-3.5 w-3.5 fill-current" /> 2x EXP Today
                    </span>
                    <span className="relative z-10 mt-1 text-sm font-bold text-slate-700 xl:text-base">
                      S-{eventStage.worldStageNumber} · {eventStage.name}
                    </span>
                    <span className="relative z-10 text-[10px] font-semibold uppercase tracking-wide text-sky-500/70 xl:text-[11px]">Deploy Team &gt;&gt;</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-slate-100/50 p-4">
                <Lock className="h-6 w-6 text-slate-400" />
                <p className="text-xs text-slate-500">Not unlocked yet — check back once this sector opens up.</p>
              </div>
            )}
          </GlowPanel>

          {/* Rewards */}
          <GlowPanel accent="none" className="flex min-h-0 flex-1 flex-col gap-3 rounded-2xl border-2 border-sky-100 bg-white/90 p-5 shadow-xl backdrop-blur-md transition-all">
            <p className="shrink-0 font-arcade text-[11px] uppercase tracking-widest text-sky-500/80">Sector Loot</p>
            
            {/* Added Standard Drops Info */}
            <div className="flex shrink-0 gap-2 mb-2">
               <div className="flex-1 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2 shadow-sm">
                 <div className="flex h-7 w-7 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                   <Coins className="h-4 w-4 xl:h-5 xl:w-5" />
                 </div>
                 <div className="flex flex-col leading-tight">
                   <span className="text-[10px] xl:text-[11px] font-bold text-amber-700 uppercase">Gold</span>
                   <span className="text-[9px] xl:text-[10px] text-amber-600/80 font-medium">All Stages</span>
                 </div>
               </div>
               <div className="flex-1 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-2 shadow-sm">
                 <div className="flex h-7 w-7 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                   <Sparkles className="h-4 w-4 xl:h-5 xl:w-5" />
                 </div>
                 <div className="flex flex-col leading-tight">
                   <span className="text-[10px] xl:text-[11px] font-bold text-blue-700 uppercase">Tamer EXP</span>
                   <span className="text-[9px] xl:text-[10px] text-blue-600/80 font-medium">All Stages</span>
                 </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sky-200">
              {worldGear.length === 0 ? (
                <p className="text-sm italic text-slate-500">No Tamer gear discovered in this sector yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {worldGear.map((item) => {
                    const owned = ownedGearIds.has(item.id);
                    const source = item.source;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-4 rounded-xl border-2 p-3 transition-all",
                          owned 
                            ? "border-sky-300 bg-sky-50 shadow-[0_4px_15px_-5px_rgba(56,189,248,0.3)]" 
                            : "border-slate-100 bg-slate-50/50"
                        )}
                      >
                        <div className={cn("relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg xl:h-14 xl:w-14", owned ? "bg-white shadow-sm" : "bg-slate-200/50")}>
                          <Image
                            src={item.icon}
                            alt=""
                            width={40}
                            height={40}
                            className={cn("h-9 w-9 object-contain xl:h-11 xl:w-11", !owned && "opacity-40 grayscale")}
                          />
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-bold xl:text-base", owned ? "text-slate-800" : "text-slate-500")}>
                            {item.name}
                          </p>
                          <RarityBadge rarity={item.rarity} className="mt-1" />
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] xl:text-[11px] font-medium uppercase tracking-wider">
                            {source.kind === "campaign-clear" ? (
                              <span className="text-sky-600/80 bg-sky-100/50 px-1.5 py-0.5 rounded-md">
                                Drops: Stage {DUNGEON_STAGES.find(s => s.id === source.stageId)?.worldStageNumber}
                              </span>
                            ) : (
                              <span className="text-amber-600/80 bg-amber-100/50 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Hammer className="h-3 w-3" /> Forge ({source.sealCoinCost} SC)
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {owned && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-500 shadow-sm">
                            <Check className="h-4.5 w-4.5" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlowPanel>
        </div>
      </div>

      <StageDetailModal stage={selectedStage} onClose={() => setSelectedStage(null)} />
    </div>
  );
}
