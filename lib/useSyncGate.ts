"use client";

import { useCallback, useState } from "react";
import { refreshAccountInStore } from "@/lib/loadAccount";

// Kept visible at least this long — long enough to read as a deliberate "the game is saving your
// progress" beat (Dokkan Battle and most gacha games hold a loading beat like this around every
// meaningful sync point, not just a flash) rather than an instant flicker, and generous enough
// that a fire-and-forget syncProgressToServer/consumeItemOnServer call fired around the same
// moment has real wall-clock time to land before the player can act again or navigate away — the
// exact race class documented in reconcileCreatureProgress's comment in lib/store.ts.
export const SYNC_PAUSE_MS = 1500;

/** Gates entry into a risky action (starting a battle, opening Hidden Potential/Super
 * Attack/Awaken) behind a brief re-sync against server truth — see refreshAccountInStore. Reused
 * across every one of those call sites instead of each screen rolling its own: this is exactly
 * the race that caused the level/Hidden-Potential reset bug (a stale local snapshot — a previous
 * tab's fire-and-forget sync still catching up, or a change applied directly server-side — acted
 * on before the client caught up). Renders as the spinning-disc LoadingOverlay while `gating` is
 * true; callers just wrap their action in runGated instead of calling it directly. */
export function useSyncGate() {
  const [gating, setGating] = useState(false);

  const runGated = useCallback((action: () => void) => {
    setGating(true);
    const startedAt = Date.now();
    void refreshAccountInStore().finally(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = SYNC_PAUSE_MS - elapsed;
      const finish = () => {
        setGating(false);
        action();
      };
      if (remaining > 0) {
        setTimeout(finish, remaining);
      } else {
        finish();
      }
    });
  }, []);

  return { gating, runGated };
}

/** Companion to useSyncGate, for the opposite direction: an action that already ran locally (a
 * store mutation whose result you already know — unlocking a Hidden Potential node, Awakening,
 * training a Super Attack) and fires a best-effort server write, instead of one that needs a
 * fresh read first. Holds a LoadingOverlay up for SYNC_PAUSE_MS afterward so that write has real
 * time to land before the screen closes or the player can act again — call the local mutation
 * yourself first (so you can branch on failure without a pointless loading beat), then pass only
 * the success-path side effects (the *OnServer calls, syncProgressToServer, the success toast) as
 * the action here. */
export function useSyncSettleGate() {
  const [settling, setSettling] = useState(false);

  const runWithSettle = useCallback((action: () => void, onSettled?: () => void) => {
    setSettling(true);
    action();
    setTimeout(() => {
      setSettling(false);
      onSettled?.();
    }, SYNC_PAUSE_MS);
  }, []);

  return { settling, runWithSettle };
}
