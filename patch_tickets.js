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
  console.log("Adding 40 of each ticket to all users...");
  try {
    await client.query(`
      MERGE \`${PROJECT_ID}.${DATASET}.user_items\` AS target
      USING (
        SELECT id as user_id, 'it-mythic-ticket' as item_id FROM \`${PROJECT_ID}.${DATASET}.users\`
        UNION ALL
        SELECT id as user_id, 'it-legendary-ticket' as item_id FROM \`${PROJECT_ID}.${DATASET}.users\`
      ) AS source
      ON target.user_id = source.user_id AND target.item_id = source.item_id
      WHEN MATCHED THEN
        UPDATE SET quantity = target.quantity + 40
      WHEN NOT MATCHED THEN
        INSERT (user_id, item_id, quantity)
        VALUES (source.user_id, source.item_id, 40)
    `);
    console.log("Tickets distributed successfully!");
  } catch(e) { console.error(e); }
}
run();
