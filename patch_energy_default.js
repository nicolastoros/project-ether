// Idempotent — safe to run multiple times. Fixes the root schema bug: user_currencies.energy
// defaulted to 0 while energy_max correctly defaulted to 240, so every account whose row was
// inserted without explicitly specifying energy (the registration path, before this fix) started
// completely unable to play until hours of passive regen caught up. The registration code itself
// now always specifies energy=240 explicitly (see createUser in lib/db/bigquery.ts) — this ALTER
// is defense-in-depth so the column default itself is no longer a live footgun either.
const { BigQuery } = require("@google-cloud/bigquery");

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID;
const DATASET = process.env.BIGQUERY_DATASET;

async function main() {
  const bq = new BigQuery({ projectId: PROJECT_ID });
  await bq.query({
    query: `ALTER TABLE \`${PROJECT_ID}.${DATASET}.user_currencies\` ALTER COLUMN energy SET DEFAULT 240;`,
  });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
