import { Suspense } from "react";
import { CampaignHome } from "@/components/campaign/CampaignHome";

export default function CampaignPage() {
  return (
    <div className="h-full">
      {/* CampaignHome reads ?chapter= (BattleResultScreen's "Exit" link back into the chapter you
          just fought in) via useSearchParams, which requires a Suspense boundary. */}
      <Suspense fallback={null}>
        <CampaignHome />
      </Suspense>
    </div>
  );
}
