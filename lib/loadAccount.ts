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
