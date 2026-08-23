"use client";

import Link from "next/link";
import { Map } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";

export function DungeonProgressCard() {
  const dungeon = useGameStore((s) => s.dungeon);

  return (
    <Link href="/campaign">
      <GlowPanel
        accent="none"
        className="flex items-center justify-between px-4 py-3 transition-colors hover:border-gold"
      >
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-gold-bright" />
          <div>
            <p className="text-xs font-semibold text-foreground">Campaign Progress</p>
            <p className="text-[10px] text-zinc-600">
              {dungeon.highestStageCleared > 0
                ? `Stage ${dungeon.highestStageCleared} · Wave ${dungeon.currentWave}`
                : "World 1-1 · Not started yet"}
            </p>
          </div>
        </div>
        <span className="font-arcade text-[10px] text-gold-bright">Continue →</span>
      </GlowPanel>
    </Link>
  );
}
