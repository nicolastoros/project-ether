import { useGameStore } from "@/lib/store";
import type { AccountBundle } from "@/lib/db/bigquery";

/** Fetches the signed-in player's account bundle and hydrates the local store with it. Call right after a successful sign-in or registration. */
export async function loadAccountIntoStore(): Promise<boolean> {
  const res = await fetch("/api/user/me");
  if (!res.ok) return false;
  const bundle = (await res.json()) as AccountBundle;
  useGameStore.getState().hydrateFromServer(bundle);
  return true;
}

/** Re-fetches the account bundle for an already-open session and merges it in without disturbing
 * local-only selections (see GameState.refreshFromServer) — called once per app load by
 * GameGate.tsx so server-side changes (e.g. new creatures granted directly in BigQuery) show up
 * without requiring a logout/login round trip. Silently no-ops on failure — the persisted local
 * cache is already on screen, so there's nothing to fall back to or block on. */
export async function refreshAccountInStore(): Promise<boolean> {
  const res = await fetch("/api/user/me");
  if (!res.ok) return false;
  const bundle = (await res.json()) as AccountBundle;
  useGameStore.getState().refreshFromServer(bundle);
  return true;
}
