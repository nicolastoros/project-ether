const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');

async function run() {
  const projectId = 'project-scrappy-intelic';
  const datasetId = 'project_ether';
  const client = fs.existsSync('./project-scrappy-intelic-a7055d2d24a2.json') 
    ? new BigQuery({ projectId, keyFilename: './project-scrappy-intelic-a7055d2d24a2.json' })
    : new BigQuery({ projectId });

  const dataset = client.dataset(datasetId);

  // 1. Add require_approval to guilds
  try {
    await client.query({ query: `ALTER TABLE \`${projectId}.${datasetId}.guilds\` ADD COLUMN IF NOT EXISTS require_approval BOOLEAN;` });
    console.log('Added require_approval to guilds');
  } catch (e) {
    console.error('Error adding column:', e.message);
  }

  // 2. Update existing rows
  try {
    await client.query({ query: `UPDATE \`${projectId}.${datasetId}.guilds\` SET require_approval = false WHERE require_approval IS NULL;` });
    await client.query({ query: `UPDATE \`${projectId}.${datasetId}.guild_members\` SET role = 'Master' WHERE role = 'Leader';` });
    console.log('Updated existing roles and settings');
  } catch (e) {
    console.error('Error updating existing rows:', e.message);
  }

  // 3. Create new tables
  const createTable = async (tableName, schema) => {
    try {
      const [exists] = await dataset.table(tableName).exists();
      if (!exists) {
        await dataset.createTable(tableName, { schema });
        console.log(`Created table ${tableName}`);
      } else {
        console.log(`Table ${tableName} already exists`);
      }
    } catch (e) {
      console.error(`Error creating table ${tableName}:`, e.message);
    }
  };

  await createTable('guild_invites', [
    { name: 'id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'guild_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'inviter_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'invitee_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'status', type: 'STRING', mode: 'REQUIRED' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
  ]);

  await createTable('guild_requests', [
    { name: 'id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'guild_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'user_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'status', type: 'STRING', mode: 'REQUIRED' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
  ]);

  await createTable('guild_logs', [
    { name: 'id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'guild_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'type', type: 'STRING', mode: 'REQUIRED' },
    { name: 'message', type: 'STRING', mode: 'REQUIRED' },
    { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
  ]);
}

run();
