import "server-only";
import { randomUUID } from "node:crypto";
import { BigQuery } from "@google-cloud/bigquery";
import { STARTER_CREATURES } from "@/lib/gameData";

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID ?? "project-scrappy-intelic";
const DATASET = process.env.BIGQUERY_DATASET ?? "project_ether";

// Locally, GOOGLE_APPLICATION_CREDENTIALS points at the key file on disk (Application
// Default Credentials). That file is gitignored and never deployed, so on Vercel there's
// no file to point at — instead we read the whole key JSON, base64-encoded, from an env
// var and hand it to the client directly. Falls back to ADC (ie. the file) when that
// env var isn't set, so local dev keeps working unchanged.
function getCredentials() {
  const encoded = process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) return undefined;
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

let client: BigQuery | null = null;
function bq() {
  if (!client) {
    const credentials = getCredentials();
    client = new BigQuery({ projectId: PROJECT_ID, ...(credentials && { credentials }) });
  }
  return client;
}

function table(name: string) {
  return `\`${PROJECT_ID}.${DATASET}.${name}\``;
}

export interface DbUser {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  title: string;
  avatar_key: string;
  level: number;
  exp: number;
  exp_to_next_level: number;
  is_admin: boolean | null;
}

const USER_SELECT_COLUMNS =
  "id, username, password_hash, display_name, title, avatar_key, level, exp, exp_to_next_level, is_admin";

export async function getUserByUsername(username: string): Promise<DbUser | null> {
  const [rows] = await bq().query({
    query: `
      SELECT ${USER_SELECT_COLUMNS}
      FROM ${table("users")}
      WHERE LOWER(username) = LOWER(@username)
      LIMIT 1
    `,
    params: { username },
  });
  return (rows[0] as DbUser | undefined) ?? null;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const [rows] = await bq().query({
    query: `
      SELECT ${USER_SELECT_COLUMNS}
      FROM ${table("users")}
      WHERE LOWER(email) = LOWER(@email)
      LIMIT 1
    `,
    params: { email },
  });
  return (rows[0] as DbUser | undefined) ?? null;
}

export async function createAccount(opts: {
  username: string;
  email: string;
  passwordHash: string;
  gender: "male" | "female";
  starterCreatureId: string;
}): Promise<{ userId: string }> {
  const userId = randomUUID();
  const avatarKey = opts.gender === "male" ? "avatar-male" : "avatar-female";

  const base = STARTER_CREATURES.find((c) => c.id === opts.starterCreatureId);
  if (!base) throw new Error(`Unknown starter creature: ${opts.starterCreatureId}`);

  // userId is generated here (not by the DB), so none of these inserts actually depend
  // on another one having committed first — run them concurrently instead of one round
  // trip at a time, since each BigQuery query has multi-second latency.
  //
  // Every account starts identical: is_admin is always false here. Admin is granted
  // manually after the fact (see docs/gcp-database-schema.md) — never automatically on
  // registration, since registration is public and a self-serve admin grant would let
  // anyone who learns/guesses the right username hand themselves the whole game.
  await Promise.all([
    bq().query({
      query: `
        INSERT INTO ${table("users")}
          (id, username, email, password_hash, display_name, title, avatar_key, level, exp, exp_to_next_level, is_admin, created_at, updated_at)
        VALUES (@id, @username, @email, @passwordHash, @displayName, 'Novice Tamer', @avatarKey, 1, 0, 100, false, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
      `,
      params: {
        id: userId,
        username: opts.username,
        email: opts.email,
        passwordHash: opts.passwordHash,
        displayName: opts.username,
        avatarKey,
      },
    }),
    bq().query({
      query: `
        INSERT INTO ${table("user_creatures")}
          (id, user_id, creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, party_slot)
        VALUES (@id, @userId, @creatureId, 1, 0, 100, @hp, @atk, @def, @spd, true, 1)
      `,
      params: {
        id: randomUUID(),
        userId,
        creatureId: opts.starterCreatureId,
        hp: base.baseStats.hp,
        atk: base.baseStats.atk,
        def: base.baseStats.def,
        spd: base.baseStats.spd,
      },
    }),
    bq().query({
      query: `INSERT INTO ${table("user_currencies")} (user_id) VALUES (@userId)`,
      params: { userId },
    }),
    bq().query({
      query: `INSERT INTO ${table("user_dungeon_state")} (user_id) VALUES (@userId)`,
      params: { userId },
    }),
  ]);

  return { userId };
}

export async function recordLogin(userId: string, success: boolean) {
  await bq().query({
    query: `
      INSERT INTO ${table("login_history")} (id, user_id, success)
      VALUES (@id, @userId, @success)
    `,
    params: { id: randomUUID(), userId, success },
  });
}

export interface AccountBundle {
  profile: {
    id: string;
    username: string;
    displayName: string;
    title: string;
    avatarKey: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    isAdmin: boolean;
  };
  currencies: {
    gold: number;
    gems: number;
    sealCoins: number;
    energy: number;
    energyMax: number;
    energyRegenMinutes: number;
  };
  dungeon: {
    highestStageCleared: number;
    currentWave: number;
    autoBattleEnabled: boolean;
    autoDgEnabled: boolean;
    speedMultiplier: 1 | 2 | 4;
    perfectStages: string[];
  };
  creatures: {
    creatureId: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    hp: number;
    atk: number;
    def: number;
    spd: number;
    isInHubTeam: boolean;
    partySlot: number | null;
    copies: number;
  }[];
  equipment: {
    equipmentId: string;
    enhancementLevel: number;
    equippedTo: string | null;
  }[];
  tamerEquipment: { itemId: string }[];
  items: { itemId: string; quantity: number }[];
  /** Always includes "tamer1" (the free default) even though it's never actually inserted as a
   * row — only avatars bought beyond that show up in user_tamer_avatars. */
  ownedTamerIds: string[];
  expeditions: { id: string; defId: string; creatureIds: string[]; startedAt: number; durationMs: number }[];
}

export async function getAccountBundle(userId: string): Promise<AccountBundle | null> {
  const [
    userResult,
    currencyResult,
    dungeonResult,
    creatureResult,
    equipmentResult,
    tamerResult,
    itemsResult,
    tamerAvatarResult,
    expeditionsResult,
  ] = await Promise.all([
      bq().query({
        query: `
        SELECT id, username, display_name, title, avatar_key, level, exp, exp_to_next_level, is_admin
        FROM ${table("users")} WHERE id = @userId LIMIT 1
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT gold, gems, seal_coins, energy, energy_max, energy_regen_minutes
        FROM ${table("user_currencies")} WHERE user_id = @userId LIMIT 1
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT highest_stage_cleared, current_wave, auto_battle_enabled, auto_dg_enabled, speed_multiplier, perfect_stages
        FROM ${table("user_dungeon_state")} WHERE user_id = @userId LIMIT 1
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, party_slot, copies
        FROM ${table("user_creatures")} WHERE user_id = @userId ORDER BY acquired_at
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT equipment_id, enhancement_level, equipped_to
        FROM ${table("user_equipment")} WHERE user_id = @userId ORDER BY acquired_at
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT item_id
        FROM ${table("user_tamer_equipment")} WHERE user_id = @userId ORDER BY acquired_at
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT item_id, quantity
        FROM ${table("user_items")} WHERE user_id = @userId
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT tamer_id
        FROM ${table("user_tamer_avatars")} WHERE user_id = @userId ORDER BY acquired_at
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT id, def_id, creature_ids, started_at, duration_ms
        FROM ${table("user_expeditions")} WHERE user_id = @userId
      `,
        params: { userId },
      }),
    ]);

  const userRow = userResult[0][0];
  if (!userRow) return null;
  const currencyRow = currencyResult[0][0];
  const dungeonRow = dungeonResult[0][0];
  const creatureRows = creatureResult[0];
  const equipmentRows = equipmentResult[0];
  const tamerRows = tamerResult[0];
  const itemsRows = itemsResult[0];
  const tamerAvatarRows = tamerAvatarResult[0];
  const expeditionRows = expeditionsResult[0];

  return {
    profile: {
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.display_name,
      title: userRow.title,
      avatarKey: userRow.avatar_key,
      level: userRow.level,
      exp: userRow.exp,
      expToNextLevel: userRow.exp_to_next_level,
      isAdmin: Boolean(userRow.is_admin),
    },
    currencies: currencyRow
      ? {
          gold: currencyRow.gold,
          gems: currencyRow.gems,
          sealCoins: currencyRow.seal_coins ?? 0,
          energy: currencyRow.energy,
          energyMax: currencyRow.energy_max,
          energyRegenMinutes: currencyRow.energy_regen_minutes,
        }
      : { gold: 0, gems: 0, sealCoins: 0, energy: 0, energyMax: 120, energyRegenMinutes: 5 },
    dungeon: dungeonRow
      ? {
          highestStageCleared: dungeonRow.highest_stage_cleared,
          currentWave: dungeonRow.current_wave,
          autoBattleEnabled: dungeonRow.auto_battle_enabled,
          autoDgEnabled: dungeonRow.auto_dg_enabled,
          speedMultiplier: dungeonRow.speed_multiplier as 1 | 2 | 4,
          perfectStages: dungeonRow.perfect_stages || [],
        }
      : { highestStageCleared: 0, currentWave: 0, autoBattleEnabled: false, autoDgEnabled: false, speedMultiplier: 1, perfectStages: [] },
    creatures: creatureRows.map((row) => ({
      creatureId: row.creature_id,
      level: row.level,
      exp: row.exp,
      expToNextLevel: row.exp_to_next_level,
      hp: row.hp,
      atk: row.atk,
      def: row.def,
      spd: row.spd,
      isInHubTeam: row.is_in_hub_team,
      partySlot: row.party_slot ?? null,
      copies: row.copies ?? 1,
    })),
    equipment: equipmentRows.map((row) => ({
      equipmentId: row.equipment_id,
      enhancementLevel: row.enhancement_level,
      equippedTo: row.equipped_to ?? null,
    })),
    tamerEquipment: tamerRows.map((row) => ({ itemId: row.item_id })),
    items: itemsRows.map((row) => ({ itemId: row.item_id, quantity: row.quantity })),
    ownedTamerIds: ["tamer1", ...tamerAvatarRows.map((row) => row.tamer_id)],
    expeditions: expeditionRows.map((row) => ({
      id: row.id,
      defId: row.def_id,
      creatureIds: row.creature_ids ?? [],
      startedAt: row.started_at,
      durationMs: row.duration_ms,
    })),
  };
}

export async function syncPlayerProgress(
  userId: string,
  opts: {
    level: number;
    exp: number;
    expToNextLevel: number;
    creatures: { creatureId: string; level: number; exp: number; expToNextLevel: number }[];
    /** Highest Campaign stage cleared — only ever moves up (GREATEST), so an out-of-order sync
     * (e.g. two tabs) can't accidentally roll progress back. */
    dungeonHighestStageCleared?: number;
    dungeonPerfectStages?: string[];
    /** Wasn't synced at all before — gold/gems/sealCoins earned in a session only ever lived in
     * the browser, silently reverting to whatever was last written at account-creation time on
     * the next fresh hydrate. */
    currencies?: { gold: number; gems: number; sealCoins: number };
  }
) {
  // One UPDATE query *job* per creature — even fired concurrently via Promise.all — was the real
  // bug here, not just slow: BigQuery isn't a low-latency row-store, each DML statement has real
  // job scheduling overhead (multiple seconds), and BigQuery serializes concurrent DML against
  // the same table regardless of how "parallel" the client-side requests look. A 13-creature
  // roster (e.g. an admin owning every catalog creature) measured at 25+ seconds even parallelized
  // — well past a serverless function's timeout, silently killing the request before most (or any)
  // creature rows got updated. That's exactly what was observed: an admin account's creature
  // levels never advancing past their grant-time defaults while a single-creature account's
  // leveling persisted fine. Fix: collapse all N creature updates into ONE query job via MERGE
  // instead of N separate jobs — cost is then flat regardless of roster size.
  const queries = [
    bq().query({
      query: `
        UPDATE ${table("users")}
        SET level = @level, exp = @exp, exp_to_next_level = @expToNextLevel, updated_at = CURRENT_TIMESTAMP()
        WHERE id = @userId
      `,
      params: { userId, level: opts.level, exp: opts.exp, expToNextLevel: opts.expToNextLevel },
    }),
  ];

  if (opts.creatures.length > 0) {
    queries.push(
      bq().query({
        query: `
          MERGE ${table("user_creatures")} AS target
          USING UNNEST(@creatures) AS source
          ON target.user_id = @userId AND target.creature_id = source.creatureId
          WHEN MATCHED THEN
            UPDATE SET level = source.level, exp = source.exp, exp_to_next_level = source.expToNextLevel
        `,
        params: { userId, creatures: opts.creatures },
        types: {
          creatures: [{ creatureId: "STRING", level: "INT64", exp: "INT64", expToNextLevel: "INT64" }],
        },
      })
    );
  }

  if (opts.dungeonHighestStageCleared !== undefined || opts.dungeonPerfectStages) {
    queries.push(
      bq().query({
        query: `
          UPDATE ${table("user_dungeon_state")}
          SET 
            highest_stage_cleared = GREATEST(highest_stage_cleared, COALESCE(@highest, highest_stage_cleared)),
            perfect_stages = COALESCE(@perfectStages, perfect_stages)
          WHERE user_id = @userId
        `,
        params: { 
          userId, 
          highest: opts.dungeonHighestStageCleared ?? null,
          perfectStages: opts.dungeonPerfectStages ?? null 
        },
      })
    );
  }

  if (opts.currencies) {
    queries.push(
      bq().query({
        query: `
          UPDATE ${table("user_currencies")}
          SET gold = @gold, gems = @gems, seal_coins = @sealCoins, updated_at = CURRENT_TIMESTAMP()
          WHERE user_id = @userId
        `,
        params: { userId, ...opts.currencies },
      })
    );
  }

  await Promise.all(queries);
}

/** Adds a catalog creature to the account's owned roster — or, if already owned, increments its
 * copies count instead (creature ids are unique per account: one row per id, dupes tracked via
 * the copies column rather than extra rows). Mirrors lib/store.ts's client-side grantCreature —
 * this is what actually persists that grant, since syncPlayerProgress only UPDATEs creatures the
 * account already owns and has no notion of copies at all. */
export async function grantCreatureToUser(
  userId: string,
  creatureId: string
): Promise<{ isNew: boolean; copies: number }> {
  const [existingRows] = await bq().query({
    query: `SELECT copies FROM ${table("user_creatures")} WHERE user_id = @userId AND creature_id = @creatureId LIMIT 1`,
    params: { userId, creatureId },
  });
  if (existingRows.length > 0) {
    const copies = (existingRows[0].copies ?? 1) + 1;
    await bq().query({
      query: `
        UPDATE ${table("user_creatures")}
        SET copies = @copies
        WHERE user_id = @userId AND creature_id = @creatureId
      `,
      params: { userId, creatureId, copies },
    });
    return { isNew: false, copies };
  }

  const base = STARTER_CREATURES.find((c) => c.id === creatureId);
  if (!base) throw new Error(`Unknown creature id: ${creatureId}`);

  await bq().query({
    query: `
      INSERT INTO ${table("user_creatures")}
        (id, user_id, creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, party_slot, copies)
      VALUES (@id, @userId, @creatureId, @level, @exp, @expToNextLevel, @hp, @atk, @def, @spd, false, NULL, 1)
    `,
    params: {
      id: randomUUID(),
      userId,
      creatureId,
      level: base.level,
      exp: base.exp,
      expToNextLevel: base.expToNextLevel,
      hp: base.baseStats.hp,
      atk: base.baseStats.atk,
      def: base.baseStats.def,
      spd: base.baseStats.spd,
    },
  });
  return { isNew: true, copies: 1 };
}

/** Adds a Tamer gear piece to the account — a no-op if already owned (each piece is unique, no
 * copies concept for gear). Used both for the free Campaign-clear pieces and crafted ones. */
export async function grantTamerEquipmentToUser(userId: string, itemId: string): Promise<{ isNew: boolean }> {
  const [existingRows] = await bq().query({
    query: `SELECT 1 FROM ${table("user_tamer_equipment")} WHERE user_id = @userId AND item_id = @itemId LIMIT 1`,
    params: { userId, itemId },
  });
  if (existingRows.length > 0) return { isNew: false };

  await bq().query({
    query: `
      INSERT INTO ${table("user_tamer_equipment")} (id, user_id, item_id)
      VALUES (@id, @userId, @itemId)
    `,
    params: { id: randomUUID(), userId, itemId },
  });
  return { isNew: true };
}

/** Adds (or stacks onto) a generic collectible item — Consumable/Quest/Evolution/Skin/Crafting.
 * Unlike Tamer gear, these stack by quantity rather than being unique-per-account. */
export async function grantItemToUser(userId: string, itemId: string, quantity: number): Promise<void> {
  const [existingRows] = await bq().query({
    query: `SELECT quantity FROM ${table("user_items")} WHERE user_id = @userId AND item_id = @itemId LIMIT 1`,
    params: { userId, itemId },
  });
  if (existingRows.length > 0) {
    await bq().query({
      query: `
        UPDATE ${table("user_items")}
        SET quantity = quantity + @quantity, updated_at = CURRENT_TIMESTAMP()
        WHERE user_id = @userId AND item_id = @itemId
      `,
      params: { userId, itemId, quantity },
    });
    return;
  }

  await bq().query({
    query: `
      INSERT INTO ${table("user_items")} (user_id, item_id, quantity)
      VALUES (@userId, @itemId, @quantity)
    `,
    params: { userId, itemId, quantity },
  });
}

/** Removes `quantity` of an owned item — used by Inventory's "Use" action and Shop sales. Clamps
 * at 0 rather than erroring if the client and server have drifted (e.g. a stale local quantity). */
export async function consumeItemForUser(userId: string, itemId: string, quantity: number): Promise<void> {
  await bq().query({
    query: `
      UPDATE ${table("user_items")}
      SET quantity = GREATEST(0, quantity - @quantity), updated_at = CURRENT_TIMESTAMP()
      WHERE user_id = @userId AND item_id = @itemId
    `,
    params: { userId, itemId, quantity },
  });
}

/** Adds a purchased Tamer avatar to the account — a no-op if already owned. "tamer1" (the free
 * default) is never inserted here; it's implied for every account (see getAccountBundle). */
export async function grantTamerAvatarToUser(userId: string, tamerId: string): Promise<{ isNew: boolean }> {
  const [existingRows] = await bq().query({
    query: `SELECT 1 FROM ${table("user_tamer_avatars")} WHERE user_id = @userId AND tamer_id = @tamerId LIMIT 1`,
    params: { userId, tamerId },
  });
  if (existingRows.length > 0) return { isNew: false };

  await bq().query({
    query: `
      INSERT INTO ${table("user_tamer_avatars")} (id, user_id, tamer_id)
      VALUES (@id, @userId, @tamerId)
    `,
    params: { id: randomUUID(), userId, tamerId },
  });
  return { isNew: true };
}

/** Records a newly-sent expedition — startedAt/durationMs are plain epoch-ms numbers (INT64), not
 * BigQuery TIMESTAMPs, so the client's own Date.now()-based clock round-trips exactly. */
export async function startExpeditionForUser(
  userId: string,
  expedition: { id: string; defId: string; creatureIds: string[]; startedAt: number; durationMs: number }
): Promise<void> {
  await bq().query({
    query: `
      INSERT INTO ${table("user_expeditions")} (id, user_id, def_id, creature_ids, started_at, duration_ms)
      VALUES (@id, @userId, @defId, @creatureIds, @startedAt, @durationMs)
    `,
    params: {
      id: expedition.id,
      userId,
      defId: expedition.defId,
      creatureIds: expedition.creatureIds,
      startedAt: expedition.startedAt,
      durationMs: expedition.durationMs,
    },
    types: { creatureIds: ["STRING"] },
  });
}

/** Removes a resolved expedition — collection is one-shot client-side (lib/store.ts's
 * collectExpedition already deletes it from local state before this fires), so there's nothing
 * to update, just clear the row. */
export async function collectExpeditionForUser(userId: string, expeditionId: string): Promise<void> {
  await bq().query({
    query: `DELETE FROM ${table("user_expeditions")} WHERE user_id = @userId AND id = @expeditionId`,
    params: { userId, expeditionId },
  });
}

// ============================================================================
// FRIENDS SYSTEM
// ============================================================================

export interface DbFriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  // Join fields from users table (if joined)
  other_username?: string;
  other_display_name?: string;
  other_level?: number;
  other_avatar_key?: string;
}

export interface DbFriend {
  user_id: string;
  username: string;
  display_name: string;
  title: string;
  creature_count: number;
  level: number;
  avatar_key: string;
  is_online: boolean;
  is_in_battle: boolean;
  last_seen_at: string | null;
  friendship_created_at: string;
}

export async function searchUsersByUsername(query: string, limit: number = 10): Promise<DbFriend[]> {
  const [rows] = await bq().query({
    query: `
      SELECT u.id as user_id, u.username, u.display_name, u.title,
      (SELECT COUNT(*) FROM ${table("user_creatures")} uc WHERE uc.user_id = u.id) as creature_count,
      u.level, u.avatar_key, u.is_online, u.is_in_battle, u.last_seen_at, CURRENT_TIMESTAMP() as friendship_created_at
      FROM ${table("users")} u
      WHERE LOWER(u.username) LIKE CONCAT('%', LOWER(@query), '%')
      LIMIT @limit
    `,
    params: { query, limit },
  });
  return rows as DbFriend[];
}

export async function getFriendRequests(userId: string): Promise<{ incoming: DbFriendRequest[]; outgoing: DbFriendRequest[] }> {
  const [rows] = await bq().query({
    query: `
      SELECT
        r.id, r.requester_id, r.addressee_id, r.status, r.created_at,
        u.username as other_username, u.display_name as other_display_name,
        u.level as other_level, u.avatar_key as other_avatar_key
      FROM ${table("friend_requests")} r
      JOIN ${table("users")} u ON u.id = CASE WHEN r.requester_id = @userId THEN r.addressee_id ELSE r.requester_id END
      WHERE (r.requester_id = @userId OR r.addressee_id = @userId)
        AND r.status = 'pending'
    `,
    params: { userId },
  });

  const incoming = (rows as DbFriendRequest[]).filter((r) => r.addressee_id === userId);
  const outgoing = (rows as DbFriendRequest[]).filter((r) => r.requester_id === userId);

  return { incoming, outgoing };
}

export async function getFriends(userId: string): Promise<DbFriend[]> {
  const [rows] = await bq().query({
    query: `
      SELECT
        u.id as user_id, u.username, u.display_name, u.title,
        (SELECT COUNT(*) FROM ${table("user_creatures")} uc WHERE uc.user_id = u.id) as creature_count,
        u.level, u.avatar_key,
        u.is_online, u.is_in_battle, u.last_seen_at,
        f.created_at as friendship_created_at
      FROM ${table("friendships")} f
      JOIN ${table("users")} u ON u.id = CASE WHEN f.user_id_a = @userId THEN f.user_id_b ELSE f.user_id_a END
      WHERE (f.user_id_a = @userId OR f.user_id_b = @userId)
    `,
    params: { userId },
  });
  return rows as DbFriend[];
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  const [existing] = await bq().query({
    query: `
      SELECT 1 FROM ${table("friend_requests")}
      WHERE requester_id = @requesterId AND addressee_id = @addresseeId AND status = 'pending'
      LIMIT 1
    `,
    params: { requesterId, addresseeId },
  });
  if (existing.length > 0) return;

  await bq().query({
    query: `
      INSERT INTO ${table("friend_requests")} (id, requester_id, addressee_id, status)
      VALUES (@id, @requesterId, @addresseeId, 'pending')
    `,
    params: { id: randomUUID(), requesterId, addresseeId },
  });
}

export async function acceptFriendRequest(requestId: string, requesterId: string, addresseeId: string): Promise<void> {
  const [user_id_a, user_id_b] = requesterId < addresseeId ? [requesterId, addresseeId] : [addresseeId, requesterId];

  await Promise.all([
    bq().query({
      query: `
        UPDATE ${table("friend_requests")}
        SET status = 'accepted', resolved_at = CURRENT_TIMESTAMP()
        WHERE id = @requestId
      `,
      params: { requestId },
    }),
    bq().query({
      query: `
        INSERT INTO ${table("friendships")} (user_id_a, user_id_b)
        VALUES (@user_id_a, @user_id_b)
      `,
      params: { user_id_a, user_id_b },
    })
  ]);
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await bq().query({
    query: `
      UPDATE ${table("friend_requests")}
      SET status = 'declined', resolved_at = CURRENT_TIMESTAMP()
      WHERE id = @requestId
    `,
    params: { requestId },
  });
}
