"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";

export function GameGate({ children }: { children: ReactNode }) {
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const isAuthenticated = useGameStore((s) => s.auth.isAuthenticated);
  const tickBoxExp = useGameStore((s) => s.tickBoxExp);
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  // Creatures benched outside the hub team keep farming EXP in the box, both while
  // this tab is open and (via the persisted timestamp) across time away from the game.
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    tickBoxExp();
    const id = setInterval(tickBoxExp, 5000);
    return () => clearInterval(id);
  }, [hasHydrated, isAuthenticated, tickBoxExp]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arcade-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
