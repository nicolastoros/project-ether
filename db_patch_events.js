require('@next/env').loadEnvConfig('./');
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
  console.log("Starting DB patch for event attempts...");
  
  try {
    console.log("Adding daily_event_attempts to users table...");
    await client.query(`
      ALTER TABLE \`${PROJECT_ID}.${DATASET}.users\`
      ADD COLUMN IF NOT EXISTS daily_event_attempts STRING;
    `);
    console.log("Column daily_event_attempts added successfully.");
  } catch (err) {
    console.error("Error patching table:", err.message);
  }
}

run();
