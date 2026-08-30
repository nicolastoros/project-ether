// require('dotenv').config({ path: '.env.local' });
const { BigQuery } = require('@google-cloud/bigquery');

function getCredentials() {
  const encoded = process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) return undefined;
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

const credentials = getCredentials();
const projectId = process.env.BIGQUERY_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT_ID ?? "project-scrappy-intelic";

const bq = new BigQuery({
  projectId,
  ...(credentials && { credentials })
});

const datasetId = process.env.BIGQUERY_DATASET ?? process.env.GOOGLE_CLOUD_DATASET ?? "project_ether";
const projectIdForTable = projectId;

async function run() {
  const query = `
    CREATE TABLE IF NOT EXISTS \`${projectIdForTable}.${datasetId}.user_formations\` (
      id STRING NOT NULL,
      user_id STRING NOT NULL,
      name STRING NOT NULL,
      creature_ids STRING NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
    );
  `;
  try {
    const [job] = await bq.createQueryJob({ query });
    console.log(`Job ${job.id} started.`);
    await job.getQueryResults();
    console.log("Table created.");
  } catch (err) {
    console.error(err);
  }
}

run();
