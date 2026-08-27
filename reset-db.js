const { BigQuery } = require('@google-cloud/bigquery');
const credentials = require('./project-scrappy-intelic-a7055d2d24a2.json');

const bq = new BigQuery({ credentials, projectId: credentials.project_id });

async function run() {
  console.log("Resetting all users' digimons to level 1...");
  await bq.query({
    query: `
      UPDATE \`project-scrappy-intelic.project_ether.user_creatures\`
      SET level = 1, exp = 0, exp_to_next_level = 100
      WHERE true
    `
  });
  console.log("Creatures reset successfully.");

  console.log("Resetting all users' campaign progress...");
  await bq.query({
    query: `
      UPDATE \`project-scrappy-intelic.project_ether.user_dungeon_state\`
      SET highest_stage_cleared = 0
      WHERE true
    `
  });
  console.log("Campaign progress reset successfully.");

  console.log("Adding perfect_stages column to user_dungeon_state...");
  try {
    await bq.query({
      query: `
        ALTER TABLE \`project-scrappy-intelic.project_ether.user_dungeon_state\`
        ADD COLUMN perfect_stages ARRAY<STRING>
      `
    });
    console.log("perfect_stages column added successfully.");
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log("perfect_stages column already exists.");
    } else {
      console.error("Error adding perfect_stages column:", err.message);
    }
  }
}

run().catch(console.error);
