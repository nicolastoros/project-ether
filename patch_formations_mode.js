// One-off patch: adds a `mode` column to user_formations so a saved formation can be tagged
// "campaign" (1-2 slots) or "raid" (1-4 slots) — see app/(game)/formations/teams/page.tsx.
// BigQuery rejects ADD COLUMN with an inline DEFAULT, so this is split into three statements
// (same pattern as this project's other patch scripts): add the column, set its default for
// future inserts, then backfill existing rows (all of which predate this field and were built
// with the old 2-slot Campaign-only UI, so 'campaign' is the correct backfill value).
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID ?? "project-scrappy-intelic";
const DATASET = process.env.BIGQUERY_DATASET ?? "project_ether";

function getCredentials() {
  const encoded = process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) return undefined;
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

const credentials = getCredentials();
const client = new BigQuery({ projectId: PROJECT_ID, ...(credentials && { credentials }) });

async function run() {
  console.log("Adding mode column to user_formations...");
  await client.query(`ALTER TABLE \`${PROJECT_ID}.${DATASET}.user_formations\` ADD COLUMN IF NOT EXISTS mode STRING;`);
  await client.query(`ALTER TABLE \`${PROJECT_ID}.${DATASET}.user_formations\` ALTER COLUMN mode SET DEFAULT 'campaign';`);
  await client.query(`UPDATE \`${PROJECT_ID}.${DATASET}.user_formations\` SET mode = 'campaign' WHERE mode IS NULL;`);
  console.log("Done.");
}

run().catch((err) => {
  console.error("Error patching user_formations:", err.message);
  process.exit(1);
});
