// Idempotent — safe to run multiple times. Adds the columns backing ShopListing.weeklyLimit (Orbs:
// max 10/week) — see ensureFreshWeeklyShopPurchases in lib/store.ts and syncPlayerProgress in
// lib/db/bigquery.ts. Mirrors the existing daily_shop_purchases / daily_shop_purchases_date pair
// (see patch_shop_purchases.js), just reset weekly instead of daily.
const { BigQuery } = require("@google-cloud/bigquery");

const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID;
const DATASET = process.env.BIGQUERY_DATASET;

async function main() {
  const bq = new BigQuery({ projectId: PROJECT_ID });
  await bq.query({
    query: `ALTER TABLE \`${PROJECT_ID}.${DATASET}.users\`
            ADD COLUMN IF NOT EXISTS weekly_shop_purchases STRING,
            ADD COLUMN IF NOT EXISTS weekly_shop_purchases_date STRING;`,
  });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
