"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGameStore } from "@/lib/store";
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

  // Creatures benched outside the hub team keep farming EXP in the box, both while
  // this tab is open and (via the persisted timestamp) across time away from the game.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;
    tickBoxExp();
    const id = setInterval(tickBoxExp, 5000);
    return () => clearInterval(id);
  }, [hasHydrated, status, tickBoxExp]);

  // Best-effort progress sync: mirrors profile/creature level & exp back to BigQuery
  // periodically so a login from another device sees roughly current progress.
  // Equipment/currencies/dungeon progress aren't synced yet — see docs/gcp-database-schema.md.
  useEffect(() => {
    if (!hasHydrated || status !== "authenticated") return;

    const syncProgress = () => {
      const { profile, creatures } = useGameStore.getState();
      fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: profile.level,
          exp: profile.exp,
          expToNextLevel: profile.expToNextLevel,
          creatures: creatures.map((c) => ({
            creatureId: c.id,
            level: c.level,
            exp: c.exp,
            expToNextLevel: c.expToNextLevel,
          })),
        }),
      }).catch(() => {
        // Non-fatal: local play continues regardless of sync success.
      });
    };

    const id = setInterval(syncProgress, PROGRESS_SYNC_INTERVAL_MS);
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
