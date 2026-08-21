"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/store";
import { AppShell } from "@/components/layout/AppShell";

export function GameGate({ children }: { children: ReactNode }) {
  const hasHydrated = useGameStore((s) => s.hasHydrated);
  const isAuthenticated = useGameStore((s) => s.auth.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace("/");
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arcade-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
