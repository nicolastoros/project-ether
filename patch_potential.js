// require('dotenv').config({ path: '.env.local' });
process.env.GOOGLE_APPLICATION_CREDENTIALS = './project-scrappy-intelic-a7055d2d24a2.json';
const { BigQuery } = require('@google-cloud/bigquery');

const bq = new BigQuery({ projectId: "project-scrappy-intelic" });

async function patch() {
  const dataset = "project_ether";
  console.log("Applying DB patches for Hidden Potential...");

  try {
    await bq.query({ query: `ALTER TABLE \`${dataset}.user_creatures\` ADD COLUMN IF NOT EXISTS super_attack_level INT64;` });
    await bq.query({ query: `ALTER TABLE \`${dataset}.user_creatures\` ALTER COLUMN super_attack_level SET DEFAULT 1;` });
    await bq.query({ query: `UPDATE \`${dataset}.user_creatures\` SET super_attack_level = 1 WHERE super_attack_level IS NULL;` });
    console.log("Added super_attack_level column.");
  } catch (err) {
    console.log("super_attack_level column might already exist or error:", err.message);
  }

  try {
    await bq.query({
      query: `ALTER TABLE \`${dataset}.user_creatures\` ADD COLUMN IF NOT EXISTS potential_nodes STRING;`,
    });
    console.log("Added potential_nodes column.");
  } catch (err) {
    console.log("potential_nodes column might already exist or error:", err.message);
  }
}

patch().then(() => console.log("Done")).catch(console.error);
