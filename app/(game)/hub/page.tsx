import { DungeonProgressCard } from "@/components/hub/DungeonProgressCard";
import { CreatureShowcase } from "@/components/hub/CreatureShowcase";
import { QuickActions } from "@/components/hub/QuickActions";
import { DailyTaskList } from "@/components/hub/DailyTaskList";
import { MobileHeroHub } from "@/components/hub/MobileHeroHub";

export default function HubPage() {
  return (
    <div className="space-y-4">
      <div className="-mx-3 -mt-4 lg:hidden">
        <MobileHeroHub />
      </div>
      <div className="space-y-4 lg:hidden">
        <DungeonProgressCard />
      </div>

      <div className="hidden lg:block">
        <div>
          <h1 className="font-arcade text-lg glow-text-gold">Welcome back, Summoner</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Your creatures await orders in the city hub.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 items-start gap-4">
          <div className="col-span-2 space-y-4">
            <CreatureShowcase />
            <QuickActions />
          </div>

          <div className="col-span-1 space-y-4">
            <DungeonProgressCard />
            <DailyTaskList />
          </div>
        </div>
      </div>
    </div>
  );
}
