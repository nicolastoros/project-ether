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
}

export async function getAccountBundle(userId: string): Promise<AccountBundle | null> {
  const [userResult, currencyResult, dungeonResult, creatureResult, equipmentResult, tamerResult] =
    await Promise.all([
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
        SELECT highest_stage_cleared, current_wave, auto_battle_enabled, auto_dg_enabled, speed_multiplier
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
    ]);

  const userRow = userResult[0][0];
  if (!userRow) return null;
  const currencyRow = currencyResult[0][0];
  const dungeonRow = dungeonResult[0][0];
  const creatureRows = creatureResult[0];
  const equipmentRows = equipmentResult[0];
  const tamerRows = tamerResult[0];

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
        }
      : { highestStageCleared: 0, currentWave: 0, autoBattleEnabled: false, autoDgEnabled: false, speedMultiplier: 1 },
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

  if (opts.dungeonHighestStageCleared !== undefined) {
    queries.push(
      bq().query({
        query: `
          UPDATE ${table("user_dungeon_state")}
          SET highest_stage_cleared = GREATEST(highest_stage_cleared, @value)
          WHERE user_id = @userId
        `,
        params: { userId, value: opts.dungeonHighestStageCleared },
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
