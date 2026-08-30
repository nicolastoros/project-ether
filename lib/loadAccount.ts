import { useGameStore } from "@/lib/store";
import { waitForPendingSync } from "@/lib/syncProgress";
import type { AccountBundle } from "@/lib/db/bigquery";

/** Fetches the signed-in player's account bundle and hydrates the local store with it. Call right after a successful sign-in or registration. */
export async function loadAccountIntoStore(): Promise<boolean> {
  const res = await fetch("/api/user/me");
  if (!res.ok) return false;
  const bundle = (await res.json()) as AccountBundle;
  useGameStore.getState().hydrateFromServer(bundle);
  return true;
}

// Counts every store mutation (any zustand set() call, from any action) — refreshAccountInStore
// below uses this to detect "the player changed something locally while this fetch was still in
// flight" (claimed a gift, unlocked a Hidden Potential node, ...) and skip applying the fetch's
// now-stale snapshot over it. Without this, a slow /api/user/me response racing a fresh local
// action would silently discard that action the moment the response finally landed — confirmed
// live: claiming a gift then having it vanish ~1-2s later with no reload involved at all, purely
// from this refresh resolving late over a fresh BigQuery-backed grant.
let mutationCount = 0;
useGameStore.subscribe(() => {
  mutationCount++;
});

/** Re-fetches the account bundle for an already-open session and merges it in without disturbing
 * local-only selections (see GameState.refreshFromServer) — called once per app load by
 * GameGate.tsx so server-side changes (e.g. new creatures granted directly in BigQuery) show up
 * without requiring a logout/login round trip. Silently no-ops on failure — the persisted local
 * cache is already on screen, so there's nothing to fall back to or block on. */
export async function refreshAccountInStore(): Promise<boolean> {
  // Let any grant/consume/sync call already in flight (e.g. a just-claimed gift bundle's dozens
  // of concurrent grants) settle first — otherwise this fetch can land while some of those are
  // still committing, read an incomplete snapshot, and (correctly, from what it can see) apply
  // it, silently discarding whatever hadn't landed yet. See lib/syncProgress.ts's tracking.
  await waitForPendingSync();
  const mutationCountAtStart = mutationCount;
  const res = await fetch("/api/user/me");
  if (!res.ok) return false;
  const bundle = (await res.json()) as AccountBundle;
  if (mutationCount !== mutationCountAtStart) {
    // Local state moved on while this fetch was in flight — the snapshot we just got no longer
    // reflects what the player did in the meantime, so applying it would clobber that. Skip it;
    // the next app-open (or the periodic/immediate syncProgressToServer pushes already in place
    // elsewhere) reconciles normally.
    return false;
  }
  useGameStore.getState().refreshFromServer(bundle);
  return true;
}
