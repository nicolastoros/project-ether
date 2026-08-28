const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');

async function run() {
  const projectId = 'project-scrappy-intelic';
  const datasetId = 'project_ether';
  const client = fs.existsSync('./project-scrappy-intelic-a7055d2d24a2.json') 
    ? new BigQuery({ projectId, keyFilename: './project-scrappy-intelic-a7055d2d24a2.json' })
    : new BigQuery({ projectId });

  const queries = [
    `ALTER TABLE \`${projectId}.${datasetId}.guilds\` ADD COLUMN IF NOT EXISTS exp INT64;`,
    `ALTER TABLE \`${projectId}.${datasetId}.guilds\` ADD COLUMN IF NOT EXISTS exp_to_next_level INT64;`,
    `ALTER TABLE \`${projectId}.${datasetId}.guilds\` ADD COLUMN IF NOT EXISTS avatar_key STRING;`,
    `ALTER TABLE \`${projectId}.${datasetId}.guild_members\` ADD COLUMN IF NOT EXISTS total_contribution INT64;`
  ];

  for (const query of queries) {
    try {
      await client.query({ query });
      console.log('Success:', query);
    } catch(e) { 
      console.error('Error:', e.message); 
    }
  }

  // Update existing rows that have null
  try {
    await client.query({ query: `UPDATE \`${projectId}.${datasetId}.guilds\` SET exp = 0 WHERE exp IS NULL` });
    await client.query({ query: `UPDATE \`${projectId}.${datasetId}.guilds\` SET exp_to_next_level = 1000 WHERE exp_to_next_level IS NULL` });
    await client.query({ query: `UPDATE \`${projectId}.${datasetId}.guilds\` SET avatar_key = 'guild-default' WHERE avatar_key IS NULL` });
    await client.query({ query: `UPDATE \`${projectId}.${datasetId}.guild_members\` SET total_contribution = 0 WHERE total_contribution IS NULL` });
    console.log('Updated null values');
  } catch(e) {
    console.error('Update error:', e.message);
  }
}
run();
