// One-off patch: adds daily_event_attempts_date to users, so Hidden Training's per-element
// daily attempts (daily_event_attempts) actually reset once a day — previously there was no
// date stored alongside the counts, so "N attempts a day" silently behaved as "N attempts ever"
// once used. See lib/store.ts's ensureFreshEventAttempts.
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
  console.log("Adding daily_event_attempts_date column to users...");
  await client.query(`ALTER TABLE \`${PROJECT_ID}.${DATASET}.users\` ADD COLUMN IF NOT EXISTS daily_event_attempts_date STRING;`);
  console.log("Done.");
}

run().catch((err) => {
  console.error("Error patching users:", err.message);
  process.exit(1);
});
