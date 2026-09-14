// Idempotent — safe to run multiple times. See docs/gcp-database-schema.md conventions.
// Sets up everything Overclock (the weekly ranked boss) needs: Lacrima's first real DB column,
// plus the 3 new tables backing the weekly leaderboard (see lib/db/bigquery.ts's Overclock
// section for how each is used).
const { BigQuery } = require("@google-cloud/bigquery");

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID;
const DATASET = process.env.BIGQUERY_DATASET;

async function main() {
  const bq = new BigQuery({ projectId: PROJECT_ID });

  // BigQuery doesn't support ADD COLUMN ... DEFAULT in one statement — 3 separate statements
  // instead (add, set default for future rows, backfill existing rows), per the exact fix
  // BigQuery's own error message suggests.
  await bq.query({
    query: `ALTER TABLE \`${PROJECT_ID}.${DATASET}.user_currencies\` ADD COLUMN IF NOT EXISTS lacrima INT64;`,
  });
  await bq.query({
    query: `ALTER TABLE \`${PROJECT_ID}.${DATASET}.user_currencies\` ALTER COLUMN lacrima SET DEFAULT 0;`,
  });
  await bq.query({
    query: `UPDATE \`${PROJECT_ID}.${DATASET}.user_currencies\` SET lacrima = 0 WHERE lacrima IS NULL;`,
  });

  // One row per user per week — their best single-run damage that week. Also the "previous weeks"
  // history source (query by user_id, all weeks).
  await bq.query({
    query: `CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET}.overclock_scores\` (
      user_id STRING NOT NULL,
      week_id STRING NOT NULL,
      boss_id STRING NOT NULL,
      best_damage INT64 NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );`,
  });

  // The last-computed top-N for a week, refreshed lazily (at most every 2 hours) — see
  // getOverclockLeaderboard.
  await bq.query({
    query: `CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET}.overclock_leaderboard_snapshot\` (
      week_id STRING NOT NULL,
      rank INT64 NOT NULL,
      user_id STRING NOT NULL,
      username STRING NOT NULL,
      display_name STRING NOT NULL,
      damage INT64 NOT NULL,
      computed_at TIMESTAMP NOT NULL
    );`,
  });

  // Idempotency guard for the top-3 reward payout — a closed week's top 3 only ever get paid once.
  await bq.query({
    query: `CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET}.overclock_rewards_granted\` (
      week_id STRING NOT NULL,
      user_id STRING NOT NULL,
      rank INT64 NOT NULL,
      granted_at TIMESTAMP NOT NULL
    );`,
  });

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
