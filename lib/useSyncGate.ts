"use client";

import { useCallback, useState } from "react";
import { refreshAccountInStore } from "@/lib/loadAccount";

// Kept visible at least this long even when the refresh resolves instantly, so it reads as a
// deliberate beat instead of a flash — and capped implicitly by refreshAccountInStore itself,
// which never hangs (it no-ops safely on any fetch failure).
const MIN_VISIBLE_MS = 550;

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
      const remaining = MIN_VISIBLE_MS - elapsed;
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
