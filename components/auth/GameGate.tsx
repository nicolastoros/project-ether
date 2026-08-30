"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
  const isAdmin = useGameStore((s) => s.profile.isAdmin);
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
    if (!store.hasReceivedGiftsV9) {
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
        hasReceivedGiftsV9: true
      }));
    }
  }, [hasHydrated, status]);

  // Re-grant the V9 wave as a fresh V10 one: gifts are a local-only inbox (no server table of
  // their own — see types/game.ts's Gift comment), so anyone who already claimed V9 before the
  // item/Hidden-Potential persistence bugs were fixed may have "claimed" it locally (removing it
  // from their inbox) without the items ever actually landing in BigQuery. hasReceivedGiftsV10
  // defaults to false for every account regardless of their V9 status, so this reaches everyone —
  // new and existing — once, and this time the claim will actually stick.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    const store = useGameStore.getState();
    if (!store.hasReceivedGiftsV10) {
      const newGifts: Gift[] = [];
      const now = Date.now();

      newGifts.push({ id: `gift-v10-leg-${now}`, type: "item", itemId: "it-legendary-ticket", quantity: 20, message: "Bug Fixed — Rewards Reissued!", createdAt: now });
      newGifts.push({ id: `gift-v10-myth-${now}`, type: "item", itemId: "it-mythic-ticket", quantity: 20, message: "Bug Fixed — Rewards Reissued!", createdAt: now });

      const elements = ["fire", "water", "nature", "light", "dark", "electric", "neutral"];
      for (const el of elements) {
        newGifts.push({ id: `gift-v10-orb-sm-${el}-${now}`, type: "item", itemId: `it-orb-small-${el}`, quantity: 100, message: "Bug Fixed — Rewards Reissued!", createdAt: now });
        newGifts.push({ id: `gift-v10-orb-md-${el}-${now}`, type: "item", itemId: `it-orb-medium-${el}`, quantity: 50, message: "Bug Fixed — Rewards Reissued!", createdAt: now });
        newGifts.push({ id: `gift-v10-orb-lg-${el}-${now}`, type: "item", itemId: `it-orb-large-${el}`, quantity: 25, message: "Bug Fixed — Rewards Reissued!", createdAt: now });
      }

      useGameStore.setState((s) => ({
        gifts: [...s.gifts, ...newGifts],
        hasReceivedGiftsV10: true
      }));
    }
  }, [hasHydrated, status]);

  // Maintenance mode: an admin can flip this on from /admin without a deploy (see
  // app/api/admin/maintenance) to boot every non-admin player to a static "Server Maintenance"
  // page. Checked once on load and then polled on the same cadence as the progress sync above, so
  // a player already online gets redirected within a minute instead of only on their next login.
  //
  // This same poll also catches a ban applied mid-session: sessions here are stateless JWTs (see
  // auth.ts), so banning someone only blocks their *next* login sign-in attempt — it can't revoke
  // a session they already hold. isBanned closes that gap (see isUserBanned's comment in
  // lib/db/bigquery.ts) by signing them out within the same ~minute window.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated" || isAdmin) return;
    const checkServerStatus = async () => {
      try {
        const res = await fetch("/api/server-status");
        if (!res.ok) return;
        const config = await res.json();
        if (config.isBanned) {
          await signOut({ redirect: false });
          router.replace("/");
          return;
        }
        if (config.maintenanceMode) router.replace("/maintenance");
      } catch {
        // Non-fatal — if this fetch fails, the player just isn't caught until the next tick.
      }
    };
    checkServerStatus();
    const id = setInterval(checkServerStatus, PROGRESS_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasHydrated, status, isAdmin, router]);

  // Admin-sent gifts (app/api/admin/gifts) are a real server-side inbox — unlike the hardcoded
  // local-only waves above, these can arrive at any time from the admin panel. Poll for pending
  // ones and merge new ones into the local gifts list (GiftsModal.tsx renders both kinds the same
  // way, telling them apart by id prefix when claiming).
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    const checkAdminGifts = async () => {
      try {
        const res = await fetch("/api/user/gifts");
        if (!res.ok) return;
        const { gifts: pending } = await res.json();
        if (!Array.isArray(pending) || pending.length === 0) return;
        useGameStore.setState((s) => {
          const existingIds = new Set(s.gifts.map((g) => g.id));
          const newGifts: Gift[] = pending
            .filter((g: { id: string }) => !existingIds.has(`admin-gift-${g.id}`))
            .map((g: {
              id: string;
              type: "item" | "creature";
              itemId: string | null;
              creatureId: string | null;
              quantity: number;
              message: string;
              createdAt: number;
            }) => ({
              id: `admin-gift-${g.id}`,
              type: g.type,
              itemId: g.itemId ?? undefined,
              creatureId: g.creatureId ?? undefined,
              quantity: g.quantity,
              message: g.message,
              createdAt: g.createdAt,
            }));
          if (newGifts.length === 0) return s;
          return { gifts: [...s.gifts, ...newGifts] };
        });
      } catch {
        // Non-fatal — the gift just doesn't show up locally until the next successful poll.
      }
    };
    checkAdminGifts();
    const id = setInterval(checkAdminGifts, PROGRESS_SYNC_INTERVAL_MS);
    return () => clearInterval(id);
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
