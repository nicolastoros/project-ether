"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGameStore } from "@/lib/store";
import { syncProgressToServer } from "@/lib/syncProgress";
import { refreshAccountInStore } from "@/lib/loadAccount";
import { AppShell } from "@/components/layout/AppShell";

const PROGRESS_SYNC_INTERVAL_MS = 60_000;

export function GameGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const tickBoxExp = useGameStore((s) => s.tickBoxExp);
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

  // Best-effort progress sync: mirrors profile/creature level & exp and highest campaign stage
  // cleared back to BigQuery periodically so a login from another device sees roughly current
  // progress. Equipment/currencies aren't synced yet — see docs/gcp-database-schema.md.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    const id = setInterval(syncProgressToServer, PROGRESS_SYNC_INTERVAL_MS);
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
