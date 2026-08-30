import { useGameStore } from "@/lib/store";

// Every function below fires a fetch without awaiting it (the caller already applied the local
// change; these just persist it best-effort) — but that means a fast player can navigate to a new
// page (or GameGate's own refreshAccountInStore, which runs once per app load) before a batch of
// these has actually committed server-side. That fresh page's own account-bundle fetch would then
// read an incomplete snapshot and — correctly, from its own narrower view — apply it, silently
// discarding whatever hadn't landed yet. Confirmed live: claiming an 8-gift bundle fires ~23
// concurrent grants; navigating away moments later (well within BigQuery's real 700-1900ms+ query
// latency) could catch some still in flight. Tracking them here lets refreshAccountInStore wait
// for all of them to settle before it trusts a freshly-fetched bundle.
let pendingCount = 0;
function trackPending(promise: Promise<unknown>): void {
  pendingCount++;
  promise.finally(() => {
    pendingCount--;
  });
}
/** True while any grant/consume/sync request below is still in flight. */
export function hasPendingSync(): boolean {
  return pendingCount > 0;
}
/** Resolves once every currently-tracked request has settled (success or failure). Polls rather
 * than holding references to each promise, since new ones can start while this is waiting. */
export async function waitForPendingSync(): Promise<void> {
  while (pendingCount > 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/** Best-effort push of local progress (profile level/exp, creature levels/exp, highest campaign
 * stage cleared, currencies) to BigQuery — mirrors what GameGate already polls every 60s, but
 * exposed here so callers that just made a change worth not losing (e.g. a stage clear) can push
 * it immediately instead of waiting for the next interval tick. Never throws; local play
 * continues either way. */
export function syncProgressToServer(): void {
  const { profile, creatures, dungeon, currencies } = useGameStore.getState();
  trackPending(fetch("/api/user/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Lets the browser finish sending this even if the page navigates/reloads right after the
    // call returns (these are all fire-and-forget) — without it, a fast navigation can abort the
    // request mid-flight, and the next page's own account-bundle fetch then reads pre-write data.
    keepalive: true,
    body: JSON.stringify({
      level: profile.level,
      exp: profile.exp,
      expToNextLevel: profile.expToNextLevel,
      creatures: creatures.map((c) => {
        const pIndex = useGameStore.getState().partyCreatureIds.indexOf(c.id);
        const partySlot = pIndex >= 0 ? pIndex + 1 : null;
        const isInHubTeam = useGameStore.getState().hubTeamIds.includes(c.id);
        return {
          creatureId: c.id,
          level: c.level,
          exp: c.exp,
          expToNextLevel: c.expToNextLevel,
          partySlot,
          isInHubTeam,
          superAttackLevel: c.superAttackLevel,
          potentialNodes: c.potentialNodes,
          copies: c.copies,
        };
      }),
      dungeonHighestStageCleared: dungeon.highestStageCleared,
      dungeonPerfectStages: serializeStageStars(dungeon.stageStars),
      currencies: { 
        gold: currencies.gold, 
        gems: currencies.gems, 
        sealCoins: currencies.sealCoins,
        energy: currencies.energy,
        lastEnergyTickAt: currencies.lastEnergyTickAt 
      },
      dailyEventAttempts: profile.dailyEventAttempts,
    }),
  }).catch(() => {
    // Non-fatal: local play continues regardless of sync success.
  }));
}

function serializeStageStars(stageStars: Record<string, { noDeaths: boolean; noItems: boolean; underFiveTurns: boolean }>) {
  const result: string[] = [];
  for (const [stageId, stars] of Object.entries(stageStars)) {
    if (stars.noDeaths && stars.noItems && stars.underFiveTurns) {
      result.push(stageId); // Legacy format for fully complete stages
    } else {
      if (stars.noDeaths) result.push(`${stageId}_nd`);
      if (stars.noItems) result.push(`${stageId}_ni`);
      if (stars.underFiveTurns) result.push(`${stageId}_u5`);
    }
  }
  return result;
}

/** Persists a one-time creature grant (see lib/store.ts's grantCreature) server-side — the
 * generic sync above only UPDATEs creatures the account already owns, so a freshly-granted one
 * needs this dedicated insert-if-missing call or it silently vanishes on the next hydrate. */
export function grantCreatureOnServer(creatureId: string, quantity = 1): void {
  trackPending(fetch("/api/user/creatures/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true, // survives a navigation/reload right after — see syncProgressToServer's comment above.
    body: JSON.stringify({ creatureId, quantity }),
  }).catch(() => {
    // Non-fatal: the local grant already happened, so play continues either way. If this
    // request fails, the grant just won't have made it to BigQuery — retrying isn't wired up.
  }));
}

/** Persists a Tamer gear grant (free Campaign-clear piece or a crafted one) server-side — same
 * insert-if-missing reasoning as grantCreatureOnServer above. */
export function grantTamerEquipmentOnServer(itemId: string): void {
  trackPending(fetch("/api/user/tamer/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true, // survives a navigation/reload right after — see syncProgressToServer's comment above.
    body: JSON.stringify({ itemId }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  }));
}

/** Persists a generic collectible item grant (Consumable/Quest/Evolution/Skin/Crafting) server-
 * side — same insert-or-stack reasoning as grantTamerEquipmentOnServer above. */
export function grantItemOnServer(itemId: string, quantity = 1): void {
  trackPending(fetch("/api/user/items/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true, // survives a navigation/reload right after — see syncProgressToServer's comment above.
    body: JSON.stringify({ itemId, quantity }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  }));
}

/** Persists several item grants in ONE request — use this instead of calling grantItemOnServer in
 * a loop whenever more than a couple of items are being granted at once (e.g. "Claim All" on a
 * multi-gift bundle). Firing many individual grantItemOnServer calls concurrently hits BigQuery's
 * per-table concurrent-DML limit; the ones that get rejected are silently dropped by design (best-
 * effort, non-fatal), so the item just never lands — confirmed live, this is why claimed gift
 * items were vanishing. */
export function grantItemsOnServer(items: { itemId: string; quantity: number }[]): void {
  if (items.length === 0) return;
  trackPending(fetch("/api/user/items/grant-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true, // survives a navigation/reload right after — see syncProgressToServer's comment above.
    body: JSON.stringify({ items }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  }));
}

/** Persists an item consumption (Inventory's "Use" action, or a Shop sale) server-side. */
export function consumeItemOnServer(itemId: string, quantity = 1): void {
  trackPending(fetch("/api/user/items/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true, // survives a navigation/reload right after — see syncProgressToServer's comment above.
    body: JSON.stringify({ itemId, quantity }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  }));
}

/** Persists a purchased Tamer avatar server-side — same insert-if-missing reasoning as
 * grantTamerEquipmentOnServer above. */
export function grantTamerAvatarOnServer(tamerId: string): void {
  trackPending(fetch("/api/user/tamer-avatar/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true, // survives a navigation/reload right after — see syncProgressToServer's comment above.
    body: JSON.stringify({ tamerId }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  }));
}

/** Persists a newly-sent expedition server-side — see lib/store.ts's startExpedition, which
 * returns the same shape this expects. */
export function startExpeditionOnServer(expedition: {
  id: string;
  defId: string;
  creatureIds: string[];
  startedAt: number;
  durationMs: number;
}): void {
  trackPending(fetch("/api/user/expeditions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true, // survives a navigation/reload right after — see syncProgressToServer's comment above.
    body: JSON.stringify(expedition),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  }));
}

/** Persists an expedition's resolution server-side — clears the row so it doesn't reappear as
 * still-active on the next hydrate (lib/store.ts's collectExpedition already removed it locally). */
export function collectExpeditionOnServer(expeditionId: string): void {
  trackPending(fetch("/api/user/expeditions/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true, // survives a navigation/reload right after — see syncProgressToServer's comment above.
    body: JSON.stringify({ expeditionId }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  }));
}
