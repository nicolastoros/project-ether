import type { DungeonStage } from "@/types/game";

// Picks the same stage for every player on a given UTC day, per world — no cron/DB needed, just
// deterministic date math. Automatically covers every world in DUNGEON_STAGES (including ones not
// playable yet), so nothing further is needed once World 2+ opens up or Worlds 4-12 get real stages.
export function getDailyExpEventStageId(world: number, stages: DungeonStage[]): string | null {
  const worldStages = stages.filter((s) => s.world === world);
  if (worldStages.length === 0) return null;

  const now = new Date();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayOfYear = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - startOfYear) / msPerDay);

  return worldStages[dayOfYear % worldStages.length].id;
}
