const { BigQuery } = require("@google-cloud/bigquery");
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
  try {
    const [rows] = await client.query(`SELECT u.username, c.creature_id, c.level, c.hp, c.copies FROM \`${PROJECT_ID}.${DATASET}.users\` u JOIN \`${PROJECT_ID}.${DATASET}.user_creatures\` c ON u.id = c.user_id WHERE u.username != 'nicoadmin'`);
    console.log(rows);
  } catch(e) { console.error(e) }
}
run();
