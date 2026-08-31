import "server-only";
import { randomUUID } from "node:crypto";
import { BigQuery } from "@google-cloud/bigquery";
import { STARTER_CREATURES } from "@/lib/gameData";
import { getPotentialBonuses } from "@/lib/hiddenPotential";

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
  is_banned: boolean | null;
}

const USER_SELECT_COLUMNS =
  "id, username, password_hash, display_name, title, avatar_key, level, exp, exp_to_next_level, is_admin, is_banned";

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
  secretQuestion: string;
  secretAnswer: string;
}): Promise<{ userId: string }> {
  const userId = randomUUID();
  const avatarKey = opts.gender === "male" ? "avatar-male" : "avatar-female";

  const base = STARTER_CREATURES.find((c) => c.id === opts.starterCreatureId);
  if (!base) throw new Error(`Unknown starter creature: ${opts.starterCreatureId}`);

  // "Early Access 2026" (see lib/gameData.ts's ACHIEVEMENTS) is purely a users.created_at fact —
  // granted right here at registration rather than via the general unlockAchievement() read-
  // modify-write path, since it's known for certain at insert time and needs no client trust at
  // all (unlike the other 3, which are client-detected gameplay events).
  const initialAchievements = new Date().getFullYear() === 2026 ? ["ach-early-access-2026"] : [];

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
          (id, username, email, password_hash, display_name, title, avatar_key, level, exp, exp_to_next_level, is_admin, created_at, updated_at, secret_question, secret_answer, achievements)
        VALUES (@id, @username, @email, @passwordHash, @displayName, 'Novice Tamer', @avatarKey, 1, 0, 100, false, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), @secretQuestion, @secretAnswer, @achievements)
      `,
      params: {
        id: userId,
        username: opts.username,
        email: opts.email,
        passwordHash: opts.passwordHash,
        displayName: opts.username,
        avatarKey,
        secretQuestion: opts.secretQuestion,
        secretAnswer: opts.secretAnswer.toLowerCase(),
        achievements: JSON.stringify(initialAchievements),
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
    dailyEventAttempts?: Record<string, number>;
  };
  currencies: {
    gold: number;
    gems: number;
    sealCoins: number;
    energy: number;
    energyMax: number;
    energyRegenMinutes: number;
    lastEnergyTickAt: number;
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
    superAttackLevel: number;
    potentialNodes: string[];
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
  guild?: {
    id: string;
    name: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    memberCap: number;
    description: string;
    avatarKey: string;
    role: string;
  };
  teamPresets: { id: string; name: string; creatureIds: string[] }[];
  pendingGuildInvitesCount: number;
  /** Parsed users.daily_missions_state — null when the column is empty/unparseable OR its stored
   * date isn't today (server-side half of the daily reset; lib/store.ts's ensureFreshDailyTasks
   * does the equivalent check client-side for a tab that's been open since before the rollover).
   * A null here means "generate a fresh day's tasks", same as the client does. */
  dailyMissionsState: { date: string; tasks: Record<string, { progress: number; claimed: boolean }> } | null;
  /** Unlocked achievement ids — see lib/gameData.ts's ACHIEVEMENTS for the catalog. */
  achievements: string[];
}

/** Server's local "today" as YYYY-MM-DD — the server-side half of the daily-missions reset check
 * (lib/store.ts's todayDateString is the client-side equivalent; a small client/server clock skew
 * at most shifts the reset moment slightly, never fabricates progress). */
function serverTodayDateString(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Parses users.daily_missions_state, returning null (meaning "generate a fresh day's tasks",
 * same as an absent/corrupt blob) whenever the stored date isn't today. */
function parseDailyMissionsState(
  raw: string | null | undefined
): { date: string; tasks: Record<string, { progress: number; claimed: boolean }> } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.date !== serverTodayDateString()) return null;
    return parsed;
  } catch {
    return null;
  }
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
    guildResult,
    invitesResult,
    formationsResult,
  ] = await Promise.all([
      bq().query({
        query: `
        SELECT id, username, display_name, title, avatar_key, level, exp, exp_to_next_level, is_admin, daily_event_attempts, daily_missions_state, achievements
        FROM ${table("users")} WHERE id = @userId LIMIT 1
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT gold, gems, seal_coins, energy, energy_max, energy_regen_minutes, UNIX_MILLIS(last_energy_tick_at) as last_energy_tick_at
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
        SELECT creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, party_slot, copies, potential_nodes, super_attack_level
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
        // Aggregated defensively: grantItemToUser now writes one row per item via MERGE, but
        // accounts that claimed items before that fix may still carry legacy duplicate rows for
        // the same item_id (see grantItemToUser's comment) — summing here means the bundle is
        // correct immediately, without needing a one-off migration to land first.
        query: `
        SELECT item_id, SUM(quantity) AS quantity
        FROM ${table("user_items")} WHERE user_id = @userId
        GROUP BY item_id
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
      bq().query({
        query: `
        SELECT g.id, g.name, g.level, g.exp, g.exp_to_next_level, g.member_cap, g.description, g.avatar_key, gm.role
        FROM ${table("guild_members")} gm
        JOIN ${table("guilds")} g ON g.id = gm.guild_id
        WHERE gm.user_id = @userId LIMIT 1
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT COUNT(*) as count
        FROM ${table("guild_invites")} WHERE invitee_id = @userId AND status = 'pending'
      `,
        params: { userId },
      }),
      bq().query({
        query: `
        SELECT id, name, creature_ids
        FROM ${table("user_formations")} WHERE user_id = @userId ORDER BY created_at ASC
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
  const guildRow = guildResult[0][0];
  const pendingGuildInvitesCount = invitesResult[0][0]?.count || 0;
  const formationRows = formationsResult[0];

  if (userRow.is_admin) {
    const ownedIds = new Set(creatureRows.map((row: any) => row.creature_id));
    const missing = STARTER_CREATURES.filter((c) => !ownedIds.has(c.id));
    if (missing.length > 0) {
      try {
        const rowsToInsert = missing.map((c) => ({
          id: randomUUID(),
          userId,
          creatureId: c.id,
          level: 1,
          exp: 0,
          expToNextLevel: 100,
          hp: c.baseStats.hp,
          atk: c.baseStats.atk,
          def: c.baseStats.def,
          spd: c.baseStats.spd,
        }));
        
        const values = rowsToInsert.map((_, i) => 
          `(@id${i}, @userId${i}, @creatureId${i}, @level${i}, @exp${i}, @expToNextLevel${i}, @hp${i}, @atk${i}, @def${i}, @spd${i}, false, null, 1)`
        ).join(", ");
        
        const params: Record<string, any> = {};
        rowsToInsert.forEach((r, i) => {
          params[`id${i}`] = r.id;
          params[`userId${i}`] = r.userId;
          params[`creatureId${i}`] = r.creatureId;
          params[`level${i}`] = r.level;
          params[`exp${i}`] = r.exp;
          params[`expToNextLevel${i}`] = r.expToNextLevel;
          params[`hp${i}`] = r.hp;
          params[`atk${i}`] = r.atk;
          params[`def${i}`] = r.def;
          params[`spd${i}`] = r.spd;
        });

        await bq().query({
          query: `
            INSERT INTO ${table("user_creatures")}
              (id, user_id, creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, party_slot, copies)
            VALUES ${values}
          `,
          params,
        });
        
        for (const r of rowsToInsert) {
          creatureRows.push({
            id: r.id,
            user_id: r.userId,
            creature_id: r.creatureId,
            level: r.level,
            exp: r.exp,
            exp_to_next_level: r.expToNextLevel,
            hp: r.hp,
            atk: r.atk,
            def: r.def,
            spd: r.spd,
            is_in_hub_team: false,
            party_slot: null,
            copies: 1,
          });
        }
      } catch (err) {
        console.error("Failed to auto-grant admin creatures:", err);
      }
    }
  }

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
      dailyEventAttempts: userRow.daily_event_attempts ? JSON.parse(userRow.daily_event_attempts) : {},
    },
    currencies: currencyRow
      ? {
          gold: currencyRow.gold,
          gems: currencyRow.gems,
          sealCoins: currencyRow.seal_coins ?? 0,
          energy: currencyRow.energy,
          energyMax: currencyRow.energy_max,
          energyRegenMinutes: currencyRow.energy_regen_minutes,
          lastEnergyTickAt: currencyRow.last_energy_tick_at,
        }
      : { gold: 0, gems: 0, sealCoins: 0, energy: 0, energyMax: 120, energyRegenMinutes: 1, lastEnergyTickAt: Date.now() },
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
      superAttackLevel: row.super_attack_level ?? 1,
      potentialNodes: row.potential_nodes ? row.potential_nodes.split(",") : [],
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
    guild: guildRow
      ? {
          id: guildRow.id,
          name: guildRow.name,
          level: guildRow.level,
          exp: guildRow.exp,
          expToNextLevel: guildRow.exp_to_next_level,
          memberCap: guildRow.member_cap,
          description: guildRow.description || "",
          avatarKey: guildRow.avatar_key,
          role: guildRow.role,
        }
      : undefined,
    teamPresets: formationRows.map((r) => ({
      id: r.id,
      name: r.name,
      creatureIds: r.creature_ids ? r.creature_ids.split(",") : [],
    })),
    pendingGuildInvitesCount,
    dailyMissionsState: parseDailyMissionsState(userRow.daily_missions_state),
    achievements: userRow.achievements ? JSON.parse(userRow.achievements) : [],
  };
}

export async function syncPlayerProgress(
  userId: string,
  opts: {
    level: number;
    exp: number;
    expToNextLevel: number;
    creatures: { creatureId: string; level: number; exp: number; expToNextLevel: number; partySlot: number | null; isInHubTeam: boolean; superAttackLevel: number; potentialNodes: string[]; copies: number }[];
    /** Highest Campaign stage cleared — only ever moves up (GREATEST), so an out-of-order sync
     * (e.g. two tabs) can't accidentally roll progress back. */
    dungeonHighestStageCleared?: number;
    dungeonPerfectStages?: string[];
    /** Wasn't synced at all before — gold/gems/sealCoins earned in a session only ever lived in
     * the browser, silently reverting to whatever was last written at account-creation time on
     * the next fresh hydrate. */
    currencies?: { gold: number; gems: number; sealCoins: number; energy: number; lastEnergyTickAt: number };
    dailyEventAttempts?: Record<string, number>;
    items?: { itemId: string; quantity: number }[];
    /** Whole-blob overwrite of users.daily_missions_state — see AccountBundle.dailyMissionsState's
     * comment. The client always sends its full current dailyTasks snapshot (not a delta), same
     * blob-overwrite reasoning as dailyEventAttempts just above. */
    dailyTasksState?: { date: string; tasks: Record<string, { progress: number; claimed: boolean }> };
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
        ${opts.dailyEventAttempts ? ', daily_event_attempts = @dailyEventAttempts' : ''}
        ${opts.dailyTasksState ? ', daily_missions_state = @dailyTasksState' : ''}
        WHERE id = @userId
      `,
      params: {
        userId,
        level: opts.level,
        exp: opts.exp,
        expToNextLevel: opts.expToNextLevel,
        ...(opts.dailyEventAttempts && { dailyEventAttempts: JSON.stringify(opts.dailyEventAttempts) }),
        ...(opts.dailyTasksState && { dailyTasksState: JSON.stringify(opts.dailyTasksState) }),
      },
    }),
  ];

  if (opts.creatures.length > 0) {
    const creaturesWithStats = opts.creatures.map((c) => {
      const base = STARTER_CREATURES.find((sc) => sc.id === c.creatureId);
      const pot = getPotentialBonuses(c.potentialNodes || []);
      return {
        ...c,
        hp: (base?.baseStats.hp ?? 500) + 8 * (c.level - 1) + pot.hp,
        atk: (base?.baseStats.atk ?? 100) + 3 * (c.level - 1) + pot.atk,
        def: (base?.baseStats.def ?? 50) + 2 * (c.level - 1) + pot.def,
        spd: (base?.baseStats.spd ?? 100) + 1 * (c.level - 1) + pot.spd,
      };
    });

    queries.push(
      bq().query({
        query: `
          MERGE ${table("user_creatures")} AS target
          USING UNNEST(@creatures) AS source
          ON target.user_id = @userId AND target.creature_id = source.creatureId
          WHEN MATCHED THEN
            UPDATE SET level = source.level, exp = source.exp, exp_to_next_level = source.expToNextLevel, party_slot = source.partySlot, is_in_hub_team = source.isInHubTeam, super_attack_level = source.superAttackLevel, potential_nodes = source.potentialNodes, copies = source.copies
          WHEN NOT MATCHED THEN
            INSERT (id, user_id, creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, party_slot, copies, super_attack_level, potential_nodes)
            VALUES (GENERATE_UUID(), @userId, source.creatureId, source.level, source.exp, source.expToNextLevel, source.hp, source.atk, source.def, source.spd, source.isInHubTeam, source.partySlot, source.copies, source.superAttackLevel, source.potentialNodes)
        `,
        params: { userId, creatures: creaturesWithStats.map(c => ({ ...c, potentialNodes: c.potentialNodes.join(",") })) },
        types: {
          creatures: [
            {
              creatureId: "STRING",
              level: "INT64",
              exp: "INT64",
              expToNextLevel: "INT64",
              hp: "INT64",
              atk: "INT64",
              def: "INT64",
              spd: "INT64",
              partySlot: "INT64",
              isInHubTeam: "BOOL",
              superAttackLevel: "INT64",
              potentialNodes: "STRING",
              copies: "INT64",
            },
          ],
        },
      })
    );
  }

  if (opts.dungeonHighestStageCleared !== undefined || opts.dungeonPerfectStages) {
    // Built dynamically rather than passing null for whichever field isn't being synced this
    // round: BigQuery can't infer an untyped null param's type on its own (throws "Parameter
    // types must be provided for null values"), and declaring perfectStages as an ARRAY<STRING>
    // type while its value is null crashes the client's own param encoding instead ("Cannot read
    // properties of null (reading 'map')") — so only ever include a param when it has a real
    // value, one SET clause per included field.
    const setClauses: string[] = [];
    // Shape depends on which fields are present, and the bigquery client's own QueryParamTypes
    // type isn't built for that — any is the pragmatic escape hatch for both dynamic dicts.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: Record<string, any> = { userId };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const types: Record<string, any> = { userId: "STRING" };

    if (opts.dungeonHighestStageCleared !== undefined) {
      setClauses.push("highest_stage_cleared = GREATEST(highest_stage_cleared, @highest)");
      params.highest = opts.dungeonHighestStageCleared;
      types.highest = "INT64";
    }
    if (opts.dungeonPerfectStages) {
      setClauses.push("perfect_stages = @perfectStages");
      params.perfectStages = opts.dungeonPerfectStages;
      types.perfectStages = ["STRING"];
    }

    queries.push(
      bq().query({
        query: `UPDATE ${table("user_dungeon_state")} SET ${setClauses.join(", ")} WHERE user_id = @userId`,
        params,
        types,
      })
    );
  }

  if (opts.currencies) {
    queries.push(
      bq().query({
        query: `
          UPDATE ${table("user_currencies")}
          SET gold = @gold, gems = @gems, seal_coins = @sealCoins, energy = @energy, last_energy_tick_at = TIMESTAMP_MILLIS(@lastEnergyTickAt), updated_at = CURRENT_TIMESTAMP()
          WHERE user_id = @userId
        `,
        params: { userId, ...opts.currencies },
      })
    );
  }

  if (opts.items && opts.items.length > 0) {
    queries.push(
      bq().query({
        query: `
          MERGE ${table("user_items")} AS target
          USING UNNEST(@items) AS source
          ON target.user_id = @userId AND target.item_id = source.itemId
          WHEN MATCHED THEN
            UPDATE SET quantity = source.quantity, updated_at = CURRENT_TIMESTAMP()
          WHEN NOT MATCHED THEN
            INSERT (user_id, item_id, quantity)
            VALUES (@userId, source.itemId, source.quantity)
        `,
        params: { userId, items: opts.items },
        types: {
          items: [
            {
              itemId: "STRING",
              quantity: "INT64",
            },
          ],
        },
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
  creatureId: string,
  quantity: number = 1
): Promise<{ isNew: boolean; copies: number }> {
  const [existingRows] = await bq().query({
    query: `SELECT copies FROM ${table("user_creatures")} WHERE user_id = @userId AND creature_id = @creatureId LIMIT 1`,
    params: { userId, creatureId },
  });
  const wasOwned = existingRows.length > 0;
  const copies = (existingRows[0]?.copies ?? 0) + quantity;

  const base = STARTER_CREATURES.find((c) => c.id === creatureId);
  if (!base) throw new Error(`Unknown creature id: ${creatureId}`);

  // A single atomic MERGE instead of branching on the SELECT above and then INSERT/UPDATE
  // separately — same race as grantItemToUser: two concurrent grants for a creature not yet
  // owned could both see "not found" and both INSERT, leaving two rows for the same creature id.
  // The isNew/copies returned below come from the SELECT above rather than the MERGE itself
  // (BigQuery's MERGE doesn't report which branch ran) — under a genuine race that read can be
  // slightly stale for the *returned message* (e.g. "joined the roster!" shown twice), but the
  // row itself, which is what actually matters, is always correctly a single accumulated row.
  await bq().query({
    query: `
      MERGE ${table("user_creatures")} AS target
      USING (SELECT @userId AS user_id, @creatureId AS creature_id) AS source
      ON target.user_id = source.user_id AND target.creature_id = source.creature_id
      WHEN MATCHED THEN
        UPDATE SET copies = target.copies + @quantity
      WHEN NOT MATCHED THEN
        INSERT (id, user_id, creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, party_slot, copies)
        VALUES (GENERATE_UUID(), @userId, @creatureId, @level, @exp, @expToNextLevel, @hp, @atk, @def, @spd, false, NULL, @quantity)
    `,
    params: {
      userId,
      creatureId,
      quantity,
      level: base.level,
      exp: base.exp,
      expToNextLevel: base.expToNextLevel,
      hp: base.baseStats.hp,
      atk: base.baseStats.atk,
      def: base.baseStats.def,
      spd: base.baseStats.spd,
    },
  });
  return { isNew: !wasOwned, copies };
}

/** Grants several creatures in ONE query job — required for a gacha x10 pull, which can easily
 * roll 3-10 creatures at once: firing one grantCreatureToUser MERGE per creature concurrently
 * hits BigQuery's per-table concurrent-DML limit (~20) the same way unbatched item grants did
 * (see grantItemsToUser's comment) — the ones rejected are silently swallowed by the client's
 * best-effort error handling, so a pulled creature just never lands. Mirrors grantItemsToUser's
 * shape: dedupe by id first (MERGE errors if two source rows match the same target row — very
 * likely here, since pulling the same creature twice in one x10 is common), one MERGE via
 * UNNEST. */
export async function grantCreaturesToUser(userId: string, creatureIds: string[]): Promise<void> {
  if (creatureIds.length === 0) return;
  const counts = new Map<string, number>();
  for (const id of creatureIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  const rows = Array.from(counts, ([creatureId, quantity]) => {
    const base = STARTER_CREATURES.find((c) => c.id === creatureId);
    if (!base) return null;
    return {
      creatureId,
      quantity,
      level: base.level,
      exp: base.exp,
      expToNextLevel: base.expToNextLevel,
      hp: base.baseStats.hp,
      atk: base.baseStats.atk,
      def: base.baseStats.def,
      spd: base.baseStats.spd,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length === 0) return;

  await bq().query({
    query: `
      MERGE ${table("user_creatures")} AS target
      USING UNNEST(@creatures) AS source
      ON target.user_id = @userId AND target.creature_id = source.creatureId
      WHEN MATCHED THEN
        UPDATE SET copies = target.copies + source.quantity
      WHEN NOT MATCHED THEN
        INSERT (id, user_id, creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, party_slot, copies)
        VALUES (GENERATE_UUID(), @userId, source.creatureId, source.level, source.exp, source.expToNextLevel, source.hp, source.atk, source.def, source.spd, false, NULL, source.quantity)
    `,
    params: { userId, creatures: rows },
    types: {
      creatures: [
        {
          creatureId: "STRING",
          quantity: "INT64",
          level: "INT64",
          exp: "INT64",
          expToNextLevel: "INT64",
          hp: "INT64",
          atk: "INT64",
          def: "INT64",
          spd: "INT64",
        },
      ],
    },
  });
}

/** Sells `quantity` copies of a creature — decrements `copies`, then a follow-up DELETE cleans up
 * the row if that emptied it out. Two plain statements (no MERGE): the UPDATE's own `copies >=
 * @quantity` guard is what keeps this safe under a race (a second concurrent sell for more than
 * what's left just matches 0 rows instead of driving copies negative), and the DELETE only ever
 * touches a row already at/below 0 — no read-then-branch-then-write gap like a naive
 * SELECT-then-decide version would have. */
export async function sellCreatureFromUser(userId: string, creatureId: string, quantity: number): Promise<void> {
  await bq().query({
    query: `
      UPDATE ${table("user_creatures")}
      SET copies = copies - @quantity
      WHERE user_id = @userId AND creature_id = @creatureId AND copies >= @quantity
    `,
    params: { userId, creatureId, quantity },
  });
  await bq().query({
    query: `DELETE FROM ${table("user_creatures")} WHERE user_id = @userId AND creature_id = @creatureId AND copies <= 0`,
    params: { userId, creatureId },
  });
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
  // A single atomic MERGE instead of SELECT-then-INSERT/UPDATE — concurrent grants for the same
  // item (e.g. claiming a gift bundle with several stacks of the same ticket, which fires several
  // grants for that item_id nearly simultaneously) could previously all see "not found" in their
  // own SELECT and each INSERT their own row, splitting one item's quantity across several
  // duplicate rows instead of accumulating into one. Confirmed live: claiming 3 separate Mythic
  // Ticket gifts landed as 3 separate rows (40+40+20) instead of one row at 100.
  await bq().query({
    query: `
      MERGE ${table("user_items")} AS target
      USING (SELECT @userId AS user_id, @itemId AS item_id) AS source
      ON target.user_id = source.user_id AND target.item_id = source.item_id
      WHEN MATCHED THEN
        UPDATE SET quantity = target.quantity + @quantity, updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (user_id, item_id, quantity) VALUES (@userId, @itemId, @quantity)
    `,
    params: { userId, itemId, quantity },
  });
}

/** Grants several items in ONE query job instead of one grantItemToUser() call each — required
 * for a big batch like "Claim All" on a multi-gift bundle: firing ~20+ concurrent individual
 * MERGE statements against the same table hits BigQuery's per-table concurrent-DML limit (~20),
 * and the ones that get rejected are silently swallowed by the client's best-effort error
 * handling — the item just never lands, permanently, with no visible error. Confirmed live:
 * claiming an 8-gift bundle (27 individual item grants once expanded) lost the orbs entirely and
 * under-counted both ticket types. Mirrors how syncPlayerProgress already batches N creature
 * updates into one MERGE via UNNEST for the same reason. */
export async function grantItemsToUser(userId: string, items: { itemId: string; quantity: number }[]): Promise<void> {
  if (items.length === 0) return;
  // Collapse duplicate item ids first — MERGE errors ("a row matched more than once") if two
  // source rows would both match the same target row in one statement.
  const merged = new Map<string, number>();
  for (const { itemId, quantity } of items) {
    merged.set(itemId, (merged.get(itemId) ?? 0) + quantity);
  }
  const rows = Array.from(merged, ([itemId, quantity]) => ({ itemId, quantity }));

  await bq().query({
    query: `
      MERGE ${table("user_items")} AS target
      USING UNNEST(@items) AS source
      ON target.user_id = @userId AND target.item_id = source.itemId
      WHEN MATCHED THEN
        UPDATE SET quantity = target.quantity + source.quantity, updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (user_id, item_id, quantity) VALUES (@userId, source.itemId, source.quantity)
    `,
    params: { userId, items: rows },
    types: { userId: "STRING", items: [{ itemId: "STRING", quantity: "INT64" }] },
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
// ============================================================================
// GUILDS SYSTEM
// ============================================================================

export interface DbGuild {
  id: string;
  name: string;
  level: number;
  exp: number;
  exp_to_next_level: number;
  member_cap: number;
  description: string;
  avatar_key: string;
  created_at: string;
  require_approval: boolean;
}

export interface DbGuildMember {
  guild_id: string;
  user_id: string;
  role: string;
  total_contribution: number;
  joined_at: string;
  username?: string;
  display_name?: string;
  level?: number;
  avatar_key?: string;
}

export interface DbGuildInvite {
  id: string;
  guild_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  created_at: string;
  guild_name?: string;
  inviter_name?: string;
}

export interface DbGuildRequest {
  id: string;
  guild_id: string;
  user_id: string;
  status: string;
  created_at: string;
  username?: string;
  level?: number;
}

export interface DbGuildLog {
  id: string;
  guild_id: string;
  type: string;
  message: string;
  created_at: string;
}

export async function createGuild(userId: string, name: string, description: string, avatarKey: string): Promise<string> {
  const guildId = randomUUID();
  
  await Promise.all([
    bq().query({
      query: `
        INSERT INTO \`${PROJECT_ID}.${DATASET}.guilds\` 
        (id, name, level, exp, exp_to_next_level, member_cap, description, avatar_key, require_approval)
        VALUES (@guildId, @name, 1, 0, 1000, 10, @description, @avatarKey, false)
      `,
      params: { guildId, name, description, avatarKey }
    }),
    bq().query({
      query: `
        INSERT INTO \`${PROJECT_ID}.${DATASET}.guild_members\` 
        (guild_id, user_id, role, total_contribution)
        VALUES (@guildId, @userId, 'Master', 0)
      `,
      params: { guildId, userId }
    })
  ]);

  return guildId;
}

export async function getGuilds(limit: number = 20): Promise<DbGuild[]> {
  const [rows] = await bq().query({
    query: `SELECT * FROM \`${PROJECT_ID}.${DATASET}.guilds\` ORDER BY level DESC, exp DESC LIMIT @limit`,
    params: { limit }
  });
  return rows.map((r: any) => ({
    ...r,
    created_at: r.created_at?.value || r.created_at || "",
  })) as DbGuild[];
}

export async function getGuildById(guildId: string): Promise<{ guild: DbGuild; members: DbGuildMember[] } | null> {
  const [[guildRows], [memberRows]] = await Promise.all([
    bq().query({
      query: `SELECT * FROM \`${PROJECT_ID}.${DATASET}.guilds\` WHERE id = @guildId LIMIT 1`,
      params: { guildId }
    }),
    bq().query({
      query: `
        SELECT 
          gm.guild_id, gm.user_id, gm.role, gm.total_contribution, gm.joined_at,
          u.username, u.display_name, u.level, u.avatar_key
        FROM \`${PROJECT_ID}.${DATASET}.guild_members\` gm
        JOIN \`${PROJECT_ID}.${DATASET}.users\` u ON u.id = gm.user_id
        WHERE gm.guild_id = @guildId
        ORDER BY gm.total_contribution DESC
      `,
      params: { guildId }
    })
  ]);

  if (guildRows.length === 0) return null;
  const guild = {
    ...guildRows[0],
    created_at: guildRows[0].created_at?.value || guildRows[0].created_at || "",
  } as DbGuild;
  
  const members = memberRows.map((r: any) => ({
    ...r,
    joined_at: r.joined_at?.value || r.joined_at || "",
  })) as DbGuildMember[];
  
  return { guild, members };
}

export async function getUserGuild(userId: string): Promise<DbGuild | null> {
  const [rows] = await bq().query({
    query: `
      SELECT g.*
      FROM \`${PROJECT_ID}.${DATASET}.guild_members\` gm
      JOIN \`${PROJECT_ID}.${DATASET}.guilds\` g ON g.id = gm.guild_id
      WHERE gm.user_id = @userId LIMIT 1
    `,
    params: { userId }
  });
  if (rows.length === 0) return null;
  return {
    ...rows[0],
    created_at: rows[0].created_at?.value || rows[0].created_at || "",
  } as DbGuild;
}

export async function joinGuild(guildId: string, userId: string): Promise<void> {
  await bq().query({
    query: `
      INSERT INTO \`${PROJECT_ID}.${DATASET}.guild_members\` 
      (guild_id, user_id, role, total_contribution)
      VALUES (@guildId, @userId, 'Member', 0)
    `,
    params: { guildId, userId }
  });
}

export async function addGuildExp(guildId: string, userId: string, expAmount: number): Promise<void> {
  await bq().query({
    query: `
      UPDATE \`${PROJECT_ID}.${DATASET}.guild_members\`
      SET total_contribution = total_contribution + @expAmount
      WHERE guild_id = @guildId AND user_id = @userId
    `,
    params: { guildId, userId, expAmount }
  });

  const [guildRows] = await bq().query({
    query: `SELECT level, exp, exp_to_next_level, member_cap FROM \`${PROJECT_ID}.${DATASET}.guilds\` WHERE id = @guildId LIMIT 1`,
    params: { guildId }
  });
  if (guildRows.length === 0) return;
  
  let g = guildRows[0];
  let newExp = g.exp + expAmount;
  let newLevel = g.level;
  let newExpToNext = g.exp_to_next_level;
  let newCap = g.member_cap;

  while (newExp >= newExpToNext) {
    newExp -= newExpToNext;
    newLevel++;
    newExpToNext = Math.floor(newExpToNext * 1.5);
    newCap += 2;
  }

  await bq().query({
    query: `
      UPDATE \`${PROJECT_ID}.${DATASET}.guilds\`
      SET exp = @newExp, level = @newLevel, exp_to_next_level = @newExpToNext, member_cap = @newCap
      WHERE id = @guildId
    `,
    params: { guildId, newExp, newLevel, newExpToNext, newCap }
  });
}

export async function addGuildLog(guildId: string, type: string, message: string): Promise<void> {
  await bq().query({
    query: `
      INSERT INTO \`${PROJECT_ID}.${DATASET}.guild_logs\` (id, guild_id, type, message, created_at)
      VALUES (@id, @guildId, @type, @message, CURRENT_TIMESTAMP())
    `,
    params: { id: randomUUID(), guildId, type, message }
  });
}

export async function getGuildLogs(guildId: string): Promise<DbGuildLog[]> {
  const [rows] = await bq().query({
    query: `SELECT * FROM \`${PROJECT_ID}.${DATASET}.guild_logs\` WHERE guild_id = @guildId ORDER BY created_at DESC LIMIT 50`,
    params: { guildId }
  });
  return rows.map((r: any) => ({
    ...r,
    created_at: r.created_at?.value || r.created_at || "",
  })) as DbGuildLog[];
}

export async function updateGuildSettings(guildId: string, requireApproval: boolean): Promise<void> {
  await bq().query({
    query: `UPDATE \`${PROJECT_ID}.${DATASET}.guilds\` SET require_approval = @requireApproval WHERE id = @guildId`,
    params: { guildId, requireApproval }
  });
}

export async function changeGuildMemberRole(guildId: string, targetUserId: string, newRole: string): Promise<void> {
  await bq().query({
    query: `UPDATE \`${PROJECT_ID}.${DATASET}.guild_members\` SET role = @newRole WHERE guild_id = @guildId AND user_id = @targetUserId`,
    params: { guildId, targetUserId, newRole }
  });
}

export async function removeGuildMember(guildId: string, targetUserId: string): Promise<void> {
  await bq().query({
    query: `DELETE FROM \`${PROJECT_ID}.${DATASET}.guild_members\` WHERE guild_id = @guildId AND user_id = @targetUserId`,
    params: { guildId, targetUserId }
  });
}

export async function createGuildRequest(guildId: string, userId: string): Promise<void> {
  const [existing] = await bq().query({
    query: `SELECT 1 FROM \`${PROJECT_ID}.${DATASET}.guild_requests\` WHERE guild_id = @guildId AND user_id = @userId AND status = 'pending' LIMIT 1`,
    params: { guildId, userId }
  });
  if (existing.length > 0) return;

  await bq().query({
    query: `
      INSERT INTO \`${PROJECT_ID}.${DATASET}.guild_requests\` (id, guild_id, user_id, status, created_at)
      VALUES (@id, @guildId, @userId, 'pending', CURRENT_TIMESTAMP())
    `,
    params: { id: randomUUID(), guildId, userId }
  });
}

export async function getGuildRequests(guildId: string): Promise<DbGuildRequest[]> {
  const [rows] = await bq().query({
    query: `
      SELECT r.*, u.username, u.level
      FROM \`${PROJECT_ID}.${DATASET}.guild_requests\` r
      JOIN \`${PROJECT_ID}.${DATASET}.users\` u ON u.id = r.user_id
      WHERE r.guild_id = @guildId AND r.status = 'pending'
      ORDER BY r.created_at DESC
    `,
    params: { guildId }
  });
  return rows.map((r: any) => ({
    ...r,
    created_at: r.created_at?.value || r.created_at || "",
  })) as DbGuildRequest[];
}

export async function resolveGuildRequest(requestId: string, accept: boolean): Promise<{ userId: string; guildId: string } | null> {
  const [reqs] = await bq().query({
    query: `SELECT user_id, guild_id FROM \`${PROJECT_ID}.${DATASET}.guild_requests\` WHERE id = @requestId AND status = 'pending' LIMIT 1`,
    params: { requestId }
  });
  if (reqs.length === 0) return null;
  const req = reqs[0];

  await bq().query({
    query: `UPDATE \`${PROJECT_ID}.${DATASET}.guild_requests\` SET status = @status WHERE id = @requestId`,
    params: { requestId, status: accept ? 'accepted' : 'declined' }
  });


  return { userId: req.user_id, guildId: req.guild_id };
}

export async function createGuildInvite(guildId: string, inviterId: string, inviteeId: string): Promise<void> {
  const [existing] = await bq().query({
    query: `SELECT 1 FROM \`${PROJECT_ID}.${DATASET}.guild_invites\` WHERE guild_id = @guildId AND invitee_id = @inviteeId AND status = 'pending' LIMIT 1`,
    params: { guildId, inviteeId }
  });
  if (existing.length > 0) return;

  await bq().query({
    query: `
      INSERT INTO \`${PROJECT_ID}.${DATASET}.guild_invites\` (id, guild_id, inviter_id, invitee_id, status, created_at)
      VALUES (@id, @guildId, @inviterId, @inviteeId, 'pending', CURRENT_TIMESTAMP())
    `,
    params: { id: randomUUID(), guildId, inviterId, inviteeId }
  });
}

export async function getGuildInvites(userId: string): Promise<DbGuildInvite[]> {
  const [rows] = await bq().query({
    query: `
      SELECT i.*, g.name as guild_name, u.username as inviter_name
      FROM \`${PROJECT_ID}.${DATASET}.guild_invites\` i
      JOIN \`${PROJECT_ID}.${DATASET}.guilds\` g ON g.id = i.guild_id
      JOIN \`${PROJECT_ID}.${DATASET}.users\` u ON u.id = i.inviter_id
      WHERE i.invitee_id = @userId AND i.status = 'pending'
      ORDER BY i.created_at DESC
    `,
    params: { userId }
  });
  return rows.map((r: any) => ({
    ...r,
    created_at: r.created_at?.value || r.created_at || "",
  })) as DbGuildInvite[];
}

export async function resolveGuildInvite(inviteId: string, accept: boolean): Promise<{ userId: string; guildId: string } | null> {
  const [invs] = await bq().query({
    query: `SELECT invitee_id, guild_id FROM \`${PROJECT_ID}.${DATASET}.guild_invites\` WHERE id = @inviteId AND status = 'pending' LIMIT 1`,
    params: { inviteId }
  });
  if (invs.length === 0) return null;
  const inv = invs[0];

  await bq().query({
    query: `UPDATE \`${PROJECT_ID}.${DATASET}.guild_invites\` SET status = @status WHERE id = @inviteId`,
    params: { inviteId, status: accept ? 'accepted' : 'declined' }
  });

  return { userId: inv.invitee_id, guildId: inv.guild_id };
}

export async function searchUsernamesOnly(query: string): Promise<string[]> {
  const [rows] = await bq().query({
    query: `SELECT username FROM ${table("users")} WHERE LOWER(username) LIKE LOWER(@query) LIMIT 10`,
    params: { query: `%${query}%` }
  });
  return rows.map((r: any) => r.username);
}

export async function createUserFormation(userId: string, name: string, creatureIds: string[]) {
  const id = randomUUID();
  await bq().query({
    query: `INSERT INTO ${table("user_formations")} (id, user_id, name, creature_ids) VALUES (@id, @userId, @name, @creatureIds)`,
    params: { id, userId, name, creatureIds: creatureIds.join(",") }
  });
  return id;
}

export async function deleteUserFormation(id: string, userId: string) {
  await bq().query({
    query: `DELETE FROM ${table("user_formations")} WHERE id = @id AND user_id = @userId`,
    params: { id, userId }
  });
}

// ============================================================================
// Admin panel — every function below is only ever called from an app/api/admin/*
// route, each of which checks session.user.isAdmin server-side (see lib/adminAuth.ts)
// before reaching here. None of these enforce that themselves — they trust the caller,
// same as the rest of this file trusts its callers to have already checked session.user.id.
// ============================================================================

export interface ServerConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

/** Single global row (id='global') — read by every authenticated client (via the public
 * /api/server-status route, not admin-gated) to decide whether to redirect to /maintenance. */
export async function getServerConfig(): Promise<ServerConfig> {
  const [rows] = await bq().query({
    query: `SELECT maintenance_mode, maintenance_message FROM ${table("server_config")} WHERE id = 'global' LIMIT 1`,
  });
  if (rows.length === 0) return { maintenanceMode: false, maintenanceMessage: "" };
  return {
    maintenanceMode: Boolean(rows[0].maintenance_mode),
    maintenanceMessage: rows[0].maintenance_message ?? "",
  };
}

export async function setServerMaintenanceMode(enabled: boolean, message: string): Promise<void> {
  await bq().query({
    query: `
      MERGE ${table("server_config")} AS target
      USING (SELECT 'global' AS id) AS source
      ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET maintenance_mode = @enabled, maintenance_message = @message, updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (id, maintenance_mode, maintenance_message, updated_at)
        VALUES ('global', @enabled, @message, CURRENT_TIMESTAMP())
    `,
    params: { enabled, message },
  });
}

export interface AdminUserSummary {
  id: string;
  username: string;
  displayName: string;
  level: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string | null;
}

export async function searchUsersForAdmin(query: string, limit = 20): Promise<AdminUserSummary[]> {
  const [rows] = await bq().query({
    query: `
      SELECT id, username, display_name, level, is_admin, is_banned, created_at
      FROM ${table("users")}
      WHERE LOWER(username) LIKE CONCAT('%', LOWER(@query), '%')
         OR LOWER(display_name) LIKE CONCAT('%', LOWER(@query), '%')
      ORDER BY username
      LIMIT @limit
    `,
    params: { query, limit },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    level: r.level,
    isAdmin: Boolean(r.is_admin),
    isBanned: Boolean(r.is_banned),
    createdAt: r.created_at?.value ?? r.created_at ?? null,
  }));
}

export interface AdminUserDetail extends AdminUserSummary {
  gold: number;
  gems: number;
  sealCoins: number;
  creatureCount: number;
  lastLoginAt: string | null;
}

export async function getUserAdminDetail(userId: string): Promise<AdminUserDetail | null> {
  const [rows] = await bq().query({
    query: `
      SELECT
        u.id, u.username, u.display_name, u.level, u.is_admin, u.is_banned, u.created_at,
        IFNULL(c.gold, 0) as gold, IFNULL(c.gems, 0) as gems, IFNULL(c.seal_coins, 0) as seal_coins,
        (SELECT COUNT(*) FROM ${table("user_creatures")} uc WHERE uc.user_id = u.id) as creature_count,
        (SELECT MAX(logged_in_at) FROM ${table("login_history")} lh WHERE lh.user_id = u.id AND lh.success) as last_login_at
      FROM ${table("users")} u
      LEFT JOIN ${table("user_currencies")} c ON c.user_id = u.id
      WHERE u.id = @userId
      LIMIT 1
    `,
    params: { userId },
  });
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    level: r.level,
    isAdmin: Boolean(r.is_admin),
    isBanned: Boolean(r.is_banned),
    createdAt: r.created_at?.value ?? r.created_at ?? null,
    gold: r.gold,
    gems: r.gems,
    sealCoins: r.seal_coins,
    creatureCount: r.creature_count,
    lastLoginAt: r.last_login_at?.value ?? r.last_login_at ?? null,
  };
}

/** Sessions here are stateless JWTs (see auth.ts) — banning someone only blocks their *next*
 * login, it can't invalidate a session they already hold. This is what closes that gap: polled
 * by GameGate (via /api/server-status) on the same cadence as the maintenance check, so an
 * already-logged-in banned player is signed out within about a minute instead of staying in until
 * their session naturally expires. */
export async function isUserBanned(userId: string): Promise<boolean> {
  const [rows] = await bq().query({
    query: `SELECT is_banned FROM ${table("users")} WHERE id = @userId LIMIT 1`,
    params: { userId },
  });
  return Boolean(rows[0]?.is_banned);
}

export async function setUserBanned(userId: string, banned: boolean): Promise<void> {
  await bq().query({
    query: `UPDATE ${table("users")} SET is_banned = @banned, updated_at = CURRENT_TIMESTAMP() WHERE id = @userId`,
    params: { userId, banned },
  });
}

/** Only ever called with at least one of the three fields set (enforced by the API route) — built
 * dynamically so an omitted field never passes an untyped null param, same reasoning as
 * syncPlayerProgress's dungeon-state UPDATE above. */
export async function setUserCurrency(
  userId: string,
  updates: { gold?: number; gems?: number; sealCoins?: number }
): Promise<void> {
  const setClauses: string[] = [];
  const params: Record<string, unknown> = { userId };
  if (updates.gold !== undefined) {
    setClauses.push("gold = @gold");
    params.gold = updates.gold;
  }
  if (updates.gems !== undefined) {
    setClauses.push("gems = @gems");
    params.gems = updates.gems;
  }
  if (updates.sealCoins !== undefined) {
    setClauses.push("seal_coins = @sealCoins");
    params.sealCoins = updates.sealCoins;
  }
  if (setClauses.length === 0) return;
  setClauses.push("updated_at = CURRENT_TIMESTAMP()");
  await bq().query({
    query: `UPDATE ${table("user_currencies")} SET ${setClauses.join(", ")} WHERE user_id = @userId`,
    params,
  });
}

export interface ServerStats {
  totalUsers: number;
  totalAdmins: number;
  totalBanned: number;
  newUsersLast7d: number;
  loginsLast24h: number;
  loginsLast7d: number;
  avgLevel: number;
}

export async function getServerStats(): Promise<ServerStats> {
  const [[userRows], [loginRows]] = await Promise.all([
    bq().query({
      query: `
        SELECT
          COUNT(*) as total_users,
          COUNTIF(is_admin) as total_admins,
          COUNTIF(is_banned) as total_banned,
          COUNTIF(created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)) as new_users_7d,
          AVG(level) as avg_level
        FROM ${table("users")}
      `,
    }),
    bq().query({
      query: `
        SELECT
          COUNTIF(logged_in_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY) AND success) as logins_24h,
          COUNTIF(logged_in_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY) AND success) as logins_7d
        FROM ${table("login_history")}
      `,
    }),
  ]);
  const u = userRows[0] ?? {};
  const l = loginRows[0] ?? {};
  return {
    totalUsers: Number(u.total_users ?? 0),
    totalAdmins: Number(u.total_admins ?? 0),
    totalBanned: Number(u.total_banned ?? 0),
    newUsersLast7d: Number(u.new_users_7d ?? 0),
    loginsLast24h: Number(l.logins_24h ?? 0),
    loginsLast7d: Number(l.logins_7d ?? 0),
    avgLevel: Math.round(Number(u.avg_level ?? 0) * 10) / 10,
  };
}

export interface AdminGift {
  id: string;
  type: "item" | "creature";
  itemId: string | null;
  creatureId: string | null;
  quantity: number;
  message: string;
  createdAt: number;
}

/** targetUserId null means broadcast — every current AND future user sees it, since
 * getPendingAdminGifts below matches on `target_user_id IS NULL` with no user allowlist. Built
 * with conditional literal NULLs rather than parameterized ones (BigQuery can't infer an untyped
 * null param's type — same issue documented on syncPlayerProgress's dungeon-state UPDATE above). */
export async function createAdminGift(opts: {
  targetUserId: string | null;
  type: "item" | "creature";
  itemId?: string | null;
  creatureId?: string | null;
  quantity: number;
  message: string;
  createdBy: string;
}): Promise<{ id: string }> {
  const id = randomUUID();
  const params: Record<string, unknown> = {
    id,
    type: opts.type,
    quantity: opts.quantity,
    message: opts.message,
    createdBy: opts.createdBy,
  };
  const targetUserIdExpr = opts.targetUserId ? "@targetUserId" : "NULL";
  if (opts.targetUserId) params.targetUserId = opts.targetUserId;
  const itemIdExpr = opts.itemId ? "@itemId" : "NULL";
  if (opts.itemId) params.itemId = opts.itemId;
  const creatureIdExpr = opts.creatureId ? "@creatureId" : "NULL";
  if (opts.creatureId) params.creatureId = opts.creatureId;

  await bq().query({
    query: `
      INSERT INTO ${table("admin_gifts")}
        (id, target_user_id, type, item_id, creature_id, quantity, message, created_at, created_by)
      VALUES (@id, ${targetUserIdExpr}, @type, ${itemIdExpr}, ${creatureIdExpr}, @quantity, @message, CURRENT_TIMESTAMP(), @createdBy)
    `,
    params,
  });
  return { id };
}

/** Gifts still pending for this user: targeted at them by id, or broadcast (target_user_id NULL),
 * and not already claimed by them (see admin_gift_claims below — one gift row can be claimed by
 * many different users when it's a broadcast). */
export async function getPendingAdminGifts(userId: string): Promise<AdminGift[]> {
  const [rows] = await bq().query({
    query: `
      SELECT g.id, g.type, g.item_id, g.creature_id, g.quantity, g.message, UNIX_MILLIS(g.created_at) as created_at
      FROM ${table("admin_gifts")} g
      WHERE (g.target_user_id = @userId OR g.target_user_id IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM ${table("admin_gift_claims")} c
          WHERE c.gift_id = g.id AND c.user_id = @userId
        )
      ORDER BY g.created_at DESC
    `,
    params: { userId },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r: any) => ({
    id: r.id,
    type: r.type,
    itemId: r.item_id,
    creatureId: r.creature_id,
    quantity: r.quantity,
    message: r.message,
    createdAt: r.created_at,
  }));
}

/** Claims one admin-sent gift for this user: records the claim (idempotent — a MERGE that only
 * inserts if this user hasn't already claimed this gift, guarding against a double-click or retry
 * re-granting it) and, only if that claim row was newly inserted, actually grants the reward via
 * the same MERGE-based grant functions every other gift path uses. */
export async function claimAdminGift(
  giftId: string,
  userId: string
): Promise<{ ok: boolean; type?: "item" | "creature"; itemId?: string | null; creatureId?: string | null; quantity?: number }> {
  const [rows] = await bq().query({
    query: `
      SELECT id, type, item_id, creature_id, quantity
      FROM ${table("admin_gifts")}
      WHERE id = @giftId AND (target_user_id = @userId OR target_user_id IS NULL)
      LIMIT 1
    `,
    params: { giftId, userId },
  });
  if (rows.length === 0) return { ok: false };
  const gift = rows[0];

  const [job] = await bq().createQueryJob({
    query: `
      MERGE ${table("admin_gift_claims")} AS target
      USING (SELECT @giftId AS gift_id, @userId AS user_id) AS source
      ON target.gift_id = source.gift_id AND target.user_id = source.user_id
      WHEN NOT MATCHED THEN
        INSERT (gift_id, user_id, claimed_at) VALUES (@giftId, @userId, CURRENT_TIMESTAMP())
    `,
    params: { giftId, userId },
  });
  await job.getQueryResults();
  const [metadata] = await job.getMetadata();
  const wasAlreadyClaimed = Number(metadata.statistics?.query?.numDmlAffectedRows ?? 0) === 0;
  if (wasAlreadyClaimed) return { ok: false };

  if (gift.type === "item" && gift.item_id) {
    await grantItemToUser(userId, gift.item_id, gift.quantity);
  } else if (gift.type === "creature" && gift.creature_id) {
    await grantCreatureToUser(userId, gift.creature_id, gift.quantity);
  }
  return { ok: true, type: gift.type, itemId: gift.item_id, creatureId: gift.creature_id, quantity: gift.quantity };
}

/** Unlocks one achievement for a user — no-op (returns false) if already unlocked. Unlike
 * claimAdminGift's MERGE-into-a-claims-table approach (built for potentially-concurrent claims of
 * a shared broadcast gift), this is a plain read-then-write against a single JSON array column:
 * achievement unlocks are rare, one-shot, per-user events with no cross-user contention to guard
 * against, so the extra MERGE machinery isn't worth it here — see lib/gameData.ts's ACHIEVEMENTS
 * catalog and the "why a JSON blob column, not a table" reasoning in the plan this followed. */
export async function unlockAchievement(userId: string, achievementId: string): Promise<{ isNew: boolean }> {
  const [rows] = await bq().query({
    query: `SELECT achievements FROM ${table("users")} WHERE id = @userId LIMIT 1`,
    params: { userId },
  });
  const current: string[] = rows[0]?.achievements ? JSON.parse(rows[0].achievements) : [];
  if (current.includes(achievementId)) return { isNew: false };

  await bq().query({
    query: `UPDATE ${table("users")} SET achievements = @achievements, updated_at = CURRENT_TIMESTAMP() WHERE id = @userId`,
    params: { userId, achievements: JSON.stringify([...current, achievementId]) },
  });
  return { isNew: true };
}
