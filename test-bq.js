const { BigQuery } = require("@google-cloud/bigquery");

const bq = new BigQuery();
const dataset = 'project_ether';

async function main() {
  const [rows] = await bq.query({
    query: `
      SELECT id as user_id, username, display_name, title,
      (SELECT COUNT(*) FROM \`project-scrappy-intelic.project_ether.user_creatures\` uc WHERE uc.user_id = u.id) as creature_count,
      level
      FROM \`project-scrappy-intelic.project_ether.users\` u
      LIMIT 5
    `
  });
  console.log("Results:");
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(console.error);
