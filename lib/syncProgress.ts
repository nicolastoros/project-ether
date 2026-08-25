import { useGameStore } from "@/lib/store";

/** Best-effort push of local progress (profile level/exp, creature levels/exp, highest campaign
 * stage cleared) to BigQuery — mirrors what GameGate already polls every 60s, but exposed here so
 * callers that just made a change worth not losing (e.g. a stage clear) can push it immediately
 * instead of waiting for the next interval tick. Never throws; local play continues either way. */
export function syncProgressToServer(): void {
  const { profile, creatures, dungeon } = useGameStore.getState();
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
      dungeonHighestStageCleared: dungeon.highestStageCleared,
    }),
  }).catch(() => {
    // Non-fatal: local play continues regardless of sync success.
  });
}

/** Persists a one-time creature grant (see lib/store.ts's grantCreature) server-side — the
 * generic sync above only UPDATEs creatures the account already owns, so a freshly-granted one
 * needs this dedicated insert-if-missing call or it silently vanishes on the next hydrate. */
export function grantCreatureOnServer(creatureId: string): void {
  fetch("/api/user/creatures/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatureId }),
  }).catch(() => {
    // Non-fatal: the local grant already happened, so play continues either way. If this
    // request fails, the grant just won't have made it to BigQuery — retrying isn't wired up.
  });
}
