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
  console.log("Starting DB patch...");
  
  try {
    console.log("Creating user_formations table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET}.user_formations\` (
        id STRING NOT NULL,
        user_id STRING NOT NULL,
        name STRING NOT NULL,
        creature_ids STRING NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
      );
    `);
    console.log("user_formations table created successfully.");
  } catch (err) {
    console.error("Error creating user_formations table:", err.message);
  }

  try {
    console.log("Creating raid_bosses table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET}.raid_bosses\` (
        id STRING NOT NULL,
        name STRING NOT NULL,
        level INT64 NOT NULL,
        difficulty STRING NOT NULL,
        hp INT64 NOT NULL,
        atk INT64 NOT NULL,
        def INT64 NOT NULL,
        spd INT64 NOT NULL,
        attacks STRING NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
      );
    `);
    console.log("raid_bosses table created successfully.");
  } catch (err) {
    console.error("Error creating raid_bosses table:", err.message);
  }

  try {
    console.log("Adding potential_nodes to user_creatures...");
    await client.query(`ALTER TABLE \`${PROJECT_ID}.${DATASET}.user_creatures\` ADD COLUMN IF NOT EXISTS potential_nodes STRING;`);
    console.log("potential_nodes added successfully.");
  } catch (err) {
    console.error("Error adding potential_nodes:", err.message);
  }
}

run();
