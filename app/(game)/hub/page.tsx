import { DungeonProgressCard } from "@/components/hub/DungeonProgressCard";
import { CreatureShowcase } from "@/components/hub/CreatureShowcase";
import { QuickActions } from "@/components/hub/QuickActions";
import { DailyTaskList } from "@/components/hub/DailyTaskList";

export default function HubPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Welcome back, Summoner</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Your creatures await orders in the city hub.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:items-start lg:gap-4">
        <div className="space-y-4 lg:col-span-2">
          <CreatureShowcase />
          <QuickActions />
        </div>

        <div className="mt-4 space-y-4 lg:col-span-1 lg:mt-0">
          <DungeonProgressCard />
          <DailyTaskList />
        </div>
      </div>
    </div>
  );
}
