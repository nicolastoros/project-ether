const { BigQuery } = require('@google-cloud/bigquery');
const credentials = require('./project-scrappy-intelic-a7055d2d24a2.json');

const bq = new BigQuery({ credentials, projectId: credentials.project_id });

async function run() {
  const [rows] = await bq.query({
    query: `
      SELECT user_id, creature_id, level, exp
      FROM \`project-scrappy-intelic.project_ether.user_creatures\`
      WHERE level > 1
      LIMIT 10
    `
  });
  console.log("Creatures with level > 1:");
  console.table(rows);
}

run().catch(console.error);
