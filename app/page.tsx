"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { loadAccountIntoStore } from "@/lib/loadAccount";
import { LandingPage } from "@/components/landing/LandingPage";

// The root route is now the public marketing landing (was the login form — that moved to
// app/play/page.tsx, which every "Play"/"Log In" link on this page points at). A visitor who's
// already got a live session skips straight past the pitch into the game, same as the old login
// page did for a returning player.
export default function RootPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      const loaded = await loadAccountIntoStore();
      if (!cancelled && loaded) router.replace("/hub");
    })();
    return () => {
      cancelled = true;
    };
  }, [status, router]);

  return <LandingPage />;
}
