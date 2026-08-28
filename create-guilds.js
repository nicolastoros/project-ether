const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');

async function createGuildTables() {
  const projectId = process.env.BIGQUERY_PROJECT_ID || 'project-scrappy-intelic';
  const datasetId = process.env.BIGQUERY_DATASET || 'project_ether';
  
  let client;
  if (fs.existsSync('./project-scrappy-intelic-a7055d2d24a2.json')) {
    client = new BigQuery({ projectId, keyFilename: './project-scrappy-intelic-a7055d2d24a2.json' });
  } else {
    client = new BigQuery({ projectId });
  }

  const queries = [
    `
    CREATE TABLE IF NOT EXISTS \`${projectId}.${datasetId}.guilds\` (
      id           STRING DEFAULT GENERATE_UUID(),
      name         STRING NOT NULL,
      level        INT64 DEFAULT 1,
      exp          INT64 DEFAULT 0,
      exp_to_next_level INT64 DEFAULT 1000,
      member_cap   INT64 DEFAULT 10,
      description  STRING,
      avatar_key   STRING DEFAULT 'guild-default',
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
      PRIMARY KEY (id) NOT ENFORCED
    );
    `,
    `
    CREATE TABLE IF NOT EXISTS \`${projectId}.${datasetId}.guild_members\` (
      guild_id             STRING NOT NULL,
      user_id              STRING NOT NULL,
      role                 STRING DEFAULT 'Member',
      total_contribution   INT64 DEFAULT 0,
      joined_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
      PRIMARY KEY (guild_id, user_id) NOT ENFORCED,
      FOREIGN KEY (guild_id) REFERENCES \`${projectId}.${datasetId}.guilds\`(id) NOT ENFORCED,
      FOREIGN KEY (user_id) REFERENCES \`${projectId}.${datasetId}.users\`(id) NOT ENFORCED
    );
    `
  ];

  for (const q of queries) {
    try {
      console.log('Running query:', q.trim().split('\n')[0]);
      await client.query({ query: q });
      console.log('Query executed successfully.');
    } catch (err) {
      console.error('Error executing query:', err.message);
    }
  }
}

createGuildTables().catch(console.error);
