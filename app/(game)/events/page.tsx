import { EventsClient } from "@/components/events/EventsClient";

export default function EventsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-arcade text-lg glow-text-gold">Events</h1>
        <p className="mt-1 text-xs text-zinc-500">
          Battle elementals and gather Orbs to awaken your Digimon's hidden potential!
        </p>
      </div>
      <EventsClient />
    </div>
  );
}
