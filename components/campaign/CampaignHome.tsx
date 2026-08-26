"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Lock, Zap } from "lucide-react";
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
      <div className="flex min-h-0 flex-1 gap-3 lg:grid lg:grid-cols-[220px_1fr_220px] lg:items-stretch">
        <GlowPanel accent="none" className="hidden flex-col gap-3 overflow-y-auto p-3 lg:flex">
          <div>
            <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">World Info</p>
            <p className="mt-1 text-sm font-bold text-foreground">
              World {world.world} {world.isAvailable && `· ${world.name}`}
            </p>
          </div>

          {world.isAvailable ? (
            <>
              <div>
                <ProgressBar
                  percent={worldStages.length > 0 ? (clearedInWorld / worldStages.length) * 100 : 0}
                  color="gold"
                  label={`${clearedInWorld}/${worldStages.length} stages cleared`}
                  showPercentText
                />
              </div>

              {eventStage && (
                <button
                  type="button"
                  onClick={() => setSelectedStage(eventStage)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-sky-400 bg-sky-50 p-2.5 text-left transition-colors hover:bg-sky-100"
                >
                  <span className="inline-flex items-center gap-1 font-arcade text-[9px] font-bold uppercase text-sky-600">
                    <Zap className="h-3 w-3 fill-current" /> 2x EXP Today
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {eventStage.world}-{eventStage.worldStageNumber} · {eventStage.name}
                  </span>
                  <span className="text-[9px] text-zinc-500">Tap to view this stage</span>
                </button>
              )}
            </>
          ) : (
            <p className="text-[11px] text-zinc-500">Not unlocked yet — check back once this world opens up.</p>
          )}
        </GlowPanel>

        {/* Worlds as a side tab strip (not a stacked list) so browsing stays a flat, quick lookup
            even with many worlds — no scrolling through a tall map to reach a later one. */}
        <div className="flex min-h-0 min-w-0 flex-1 gap-3">
          <div className="scrollbar-hidden flex w-16 shrink-0 flex-col gap-2 overflow-y-auto sm:w-24">
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

          <div className="min-w-0 flex-1">
            {world.isAvailable ? (
              <CampaignWorldMap world={world} stages={worldStages} onSelectStage={setSelectedStage} />
            ) : (
              <GlowPanel accent="none" className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <Lock className="h-8 w-8 text-zinc-400" />
                <p className="font-arcade text-xs text-zinc-500">World {world.world} — Coming soon</p>
              </GlowPanel>
            )}
          </div>
        </div>

        <GlowPanel accent="none" className="hidden flex-col gap-2 overflow-y-auto p-3 lg:flex">
          <p className="font-arcade text-[10px] uppercase tracking-wide text-zinc-500">Rewards Here</p>
          {worldGear.length === 0 ? (
            <p className="text-[11px] text-zinc-500">No Tamer gear discovered in this world yet.</p>
          ) : (
            worldGear.map((item) => {
              const owned = ownedGearIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border p-2",
                    owned ? "border-gold bg-gold/10" : "border-arcade-border bg-arcade-panel-light"
                  )}
                >
                  <Image
                    src={item.icon}
                    alt=""
                    width={28}
                    height={28}
                    className={cn("h-7 w-7 object-contain", !owned && "opacity-40 grayscale")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold text-foreground">{item.name}</p>
                    <RarityBadge rarity={item.rarity} className="mt-0.5" />
                  </div>
                  {owned && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                </div>
              );
            })
          )}
        </GlowPanel>
      </div>

      <StageDetailModal stage={selectedStage} onClose={() => setSelectedStage(null)} />
    </div>
  );
}
