"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGameStore } from "@/lib/store";
import { syncProgressToServer } from "@/lib/syncProgress";
import { refreshAccountInStore } from "@/lib/loadAccount";
import { AppShell } from "@/components/layout/AppShell";
import type { Gift } from "@/types/game";

const PROGRESS_SYNC_INTERVAL_MS = 60_000;

export function GameGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const tickBoxExp = useGameStore((s) => s.tickBoxExp);
  const tickEnergy = useGameStore((s) => s.tickEnergy);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // The local store's persisted cache renders instantly on load (see lib/store.ts's persist
  // config), but it can be stale — e.g. content granted directly in BigQuery since this browser
  // last logged in. Reconcile once per app load (not on every render/route change, since this
  // effect's deps only flip once) rather than requiring a logout/login to see server-side
  // changes.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    refreshAccountInStore();
  }, [hasHydrated, status]);

  // Creatures benched outside the hub team keep farming EXP in the box, both while
  // this tab is open and (via the persisted timestamp) across time away from the game.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    tickBoxExp();
    const id = setInterval(tickBoxExp, 5000);
    return () => clearInterval(id);
  }, [hasHydrated, status, tickBoxExp]);

  // Passive energy regeneration ticks.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    tickEnergy();
    // Run the check every 5s, the store function itself checks if a full minute has passed.
    const id = setInterval(tickEnergy, 5000);
    return () => clearInterval(id);
  }, [hasHydrated, status, tickEnergy]);

  // Best-effort progress sync: mirrors profile/creature level & exp and highest campaign stage
  // cleared back to BigQuery periodically so a login from another device sees roughly current
  // progress. Equipment/currencies aren't synced yet — see docs/gcp-database-schema.md.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    const id = setInterval(syncProgressToServer, PROGRESS_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasHydrated, status]);

  // Grant V5 gifts (Tickets and Orbs) to all users via Inbox
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    const store = useGameStore.getState();
    if (!store.hasReceivedGiftsV6) {
      const newGifts: Gift[] = [];
      const now = Date.now();
      
      newGifts.push({ id: `gift-v5-leg-${now}`, type: "item", itemId: "it-legendary-ticket", quantity: 20, message: "Community Rewards!", createdAt: now });
      newGifts.push({ id: `gift-v5-myth-${now}`, type: "item", itemId: "it-mythic-ticket", quantity: 20, message: "Community Rewards!", createdAt: now });
      
      const elements = ["fire", "water", "nature", "light", "dark", "electric", "neutral"];
      for (const el of elements) {
        newGifts.push({ id: `gift-v5-orb-sm-${el}-${now}`, type: "item", itemId: `it-orb-small-${el}`, quantity: 100, message: "Training Campaign", createdAt: now });
        newGifts.push({ id: `gift-v5-orb-md-${el}-${now}`, type: "item", itemId: `it-orb-medium-${el}`, quantity: 50, message: "Training Campaign", createdAt: now });
        newGifts.push({ id: `gift-v5-orb-lg-${el}-${now}`, type: "item", itemId: `it-orb-large-${el}`, quantity: 25, message: "Training Campaign", createdAt: now });
      }
      
      useGameStore.setState((s) => ({
        gifts: [...s.gifts, ...newGifts],
        hasReceivedGiftsV6: true
      }));
    }
  }, [hasHydrated, status]);

  if (!hasHydrated || status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-arcade-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
