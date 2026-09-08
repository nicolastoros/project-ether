// Idempotent — safe to run multiple times. See docs/gcp-database-schema.md conventions.
const { BigQuery } = require("@google-cloud/bigquery");

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID;
const DATASET = process.env.BIGQUERY_DATASET;

async function main() {
  const bq = new BigQuery({ projectId: PROJECT_ID });
  await bq.query({ query: `ALTER TABLE \`${PROJECT_ID}.${DATASET}.users\` ADD COLUMN IF NOT EXISTS has_received_starter_gifts BOOL;` });
  // The real idempotency guard (see claimStarterGiftsForUser) — a MERGE's WHEN NOT MATCHED THEN
  // INSERT here is atomic in a way a plain "SELECT then UPDATE" on the users column above isn't;
  // the boolean column is only for cheap hydration reads, this table is the source of truth.
  await bq.query({
    query: `CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET}.starter_gift_claims\` (
      user_id STRING NOT NULL,
      claimed_at TIMESTAMP NOT NULL
    );`,
  });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
