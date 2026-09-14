"use client";

import { Suspense } from "react";
import { EventsHub } from "@/components/events/EventsHub";
import { useT } from "@/lib/i18n/useT";

export default function EventsPage() {
  const t = useT();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">{t("events.title")}</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {t("events.subtitle")}
        </p>
      </div>
      {/* useSearchParams (inside EventsHub, for the ?tab= deep link) requires a Suspense boundary
          — same pattern as app/(game)/combat/page.tsx. */}
      <Suspense fallback={null}>
        <EventsHub />
      </Suspense>
    </div>
  );
}
