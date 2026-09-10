import { Suspense } from "react";
import { EventsHub } from "@/components/events/EventsHub";

export default function EventsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Events</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Battle elementals and gather Orbs, take down raid bosses, and more — organized below.
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
