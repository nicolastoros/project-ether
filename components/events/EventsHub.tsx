"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ExtraTab } from "./ExtraTab";
import { ChallengeTab } from "./ChallengeTab";
import { ExtremeBattlesTab } from "./ExtremeBattlesTab";

const TABS = [
  { id: "extra", label: "Extra" },
  { id: "challenge", label: "Challenge" },
  { id: "extreme", label: "Extreme Battles" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

/** Dokkan-style category tabs for the Events screen — Extra (training events, e.g. Hidden
 * Training), Challenge (reserved for future Ticket/premium-currency events), Extreme Battles
 * (raid bosses, moved here from the old standalone /raid page — see ExtremeBattlesTab's comment).
 * Replaces a single page that used to just be Hidden Training's own screen: that worked fine for
 * exactly one event, but its hero banner ate most of the screen and had nowhere to go once a
 * second event needed a home too.
 * Tab choice lives in the URL (?tab=) rather than plain local state so the Hub's raid-event
 * carousel slides (HubHeroCarousel.tsx/MobileHeroHub.tsx) and the Raid Battle quick-action tile
 * can deep-link straight into Extreme Battles instead of dropping the player on Extra. */
export function EventsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<TabId>(isTabId(initialTab) ? initialTab : "extra");

  const selectTab = (id: TabId) => {
    setTab(id);
    router.replace(`/events?tab=${id}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 sm:gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTab(t.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 font-arcade text-xs uppercase tracking-wide transition-colors sm:px-5 sm:py-2 sm:text-sm",
              tab === t.id
                ? "border-gold bg-gold text-white"
                : "border-arcade-border bg-arcade-panel-light text-zinc-600 hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "extra" && <ExtraTab />}
      {tab === "challenge" && <ChallengeTab />}
      {tab === "extreme" && <ExtremeBattlesTab />}
    </div>
  );
}
