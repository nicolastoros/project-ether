// Idempotent — safe to run multiple times. Adds the columns backing ShopListing.dailyLimit (e.g.
// Chicken: max 6/day) — see ensureFreshShopPurchases in lib/store.ts and syncPlayerProgress in
// lib/db/bigquery.ts. Mirrors the existing daily_event_attempts / daily_event_attempts_date pair.
const { BigQuery } = require("@google-cloud/bigquery");

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID;
const DATASET = process.env.BIGQUERY_DATASET;

async function main() {
  const bq = new BigQuery({ projectId: PROJECT_ID });
  await bq.query({
    query: `ALTER TABLE \`${PROJECT_ID}.${DATASET}.users\`
            ADD COLUMN IF NOT EXISTS daily_shop_purchases STRING,
            ADD COLUMN IF NOT EXISTS daily_shop_purchases_date STRING;`,
  });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
