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
  
  // 1. Reset all creatures to level 1
  try {
    console.log("Resetting all creatures to Level 1...");
    await client.query(`
      UPDATE \`${PROJECT_ID}.${DATASET}.user_creatures\`
      SET level = 1, exp = 0, exp_to_next_level = 100
      WHERE level > 0
    `);
    console.log("Creatures reset successfully.");
  } catch (err) {
    console.error("Error resetting creatures:", err.message);
  }

  // 2. Add secret_question and secret_answer to users
  try {
    console.log("Adding secret_question and secret_answer to users...");
    await client.query(`
      ALTER TABLE \`${PROJECT_ID}.${DATASET}.users\`
      ADD COLUMN IF NOT EXISTS secret_question STRING,
      ADD COLUMN IF NOT EXISTS secret_answer STRING
    `);
    
    await client.query(`
      UPDATE \`${PROJECT_ID}.${DATASET}.users\`
      SET secret_question = '¿Cuál es el código de administrador?',
          secret_answer = 'admin123'
      WHERE secret_question IS NULL
    `);
    console.log("Users table updated successfully.");
  } catch (err) {
    console.error("Error updating users table:", err.message);
  }
}

run();
