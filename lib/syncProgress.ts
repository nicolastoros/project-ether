import { useGameStore } from "@/lib/store";

/** Best-effort push of local progress (profile level/exp, creature levels/exp, highest campaign
 * stage cleared, currencies) to BigQuery — mirrors what GameGate already polls every 60s, but
 * exposed here so callers that just made a change worth not losing (e.g. a stage clear) can push
 * it immediately instead of waiting for the next interval tick. Never throws; local play
 * continues either way. */
export function syncProgressToServer(): void {
  const { profile, creatures, dungeon, currencies } = useGameStore.getState();
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
      dungeonPerfectStages: serializeStageStars(dungeon.stageStars),
      currencies: { 
        gold: currencies.gold, 
        gems: currencies.gems, 
        sealCoins: currencies.sealCoins,
        energy: currencies.energy,
        lastEnergyTickAt: currencies.lastEnergyTickAt 
      },
    }),
  }).catch(() => {
    // Non-fatal: local play continues regardless of sync success.
  });
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

/** Persists a Tamer gear grant (free Campaign-clear piece or a crafted one) server-side — same
 * insert-if-missing reasoning as grantCreatureOnServer above. */
export function grantTamerEquipmentOnServer(itemId: string): void {
  fetch("/api/user/tamer/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  });
}

/** Persists a generic collectible item grant (Consumable/Quest/Evolution/Skin/Crafting) server-
 * side — same insert-or-stack reasoning as grantTamerEquipmentOnServer above. */
export function grantItemOnServer(itemId: string, quantity = 1): void {
  fetch("/api/user/items/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, quantity }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  });
}

/** Persists an item consumption (Inventory's "Use" action, or a Shop sale) server-side. */
export function consumeItemOnServer(itemId: string, quantity = 1): void {
  fetch("/api/user/items/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, quantity }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  });
}

/** Persists a purchased Tamer avatar server-side — same insert-if-missing reasoning as
 * grantTamerEquipmentOnServer above. */
export function grantTamerAvatarOnServer(tamerId: string): void {
  fetch("/api/user/tamer-avatar/grant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tamerId }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  });
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
  fetch("/api/user/expeditions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expedition),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  });
}

/** Persists an expedition's resolution server-side — clears the row so it doesn't reappear as
 * still-active on the next hydrate (lib/store.ts's collectExpedition already removed it locally). */
export function collectExpeditionOnServer(expeditionId: string): void {
  fetch("/api/user/expeditions/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expeditionId }),
  }).catch(() => {
    // Non-fatal — see grantCreatureOnServer's comment above.
  });
}
