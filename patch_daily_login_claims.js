// Idempotent — safe to run multiple times.
const { BigQuery } = require("@google-cloud/bigquery");

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID;
const DATASET = process.env.BIGQUERY_DATASET;

async function main() {
  const bq = new BigQuery({ projectId: PROJECT_ID });
  // One row per (user, calendar day) actually claimed — the MERGE-into-this-table pattern (see
  // claimDailyLoginForUser) is what makes a claim atomic, same as starter_gift_claims/
  // admin_gift_claims. claim_date is "YYYY-MM-DD", always computed server-side.
  await bq.query({
    query: `CREATE TABLE IF NOT EXISTS \`${PROJECT_ID}.${DATASET}.daily_login_claims\` (
      user_id STRING NOT NULL,
      claim_date STRING NOT NULL,
      claimed_at TIMESTAMP NOT NULL
    );`,
  });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
