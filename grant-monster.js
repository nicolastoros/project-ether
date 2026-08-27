const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');

async function run() {
  const credentials = require('./project-scrappy-intelic-a7055d2d24a2.json');
  const bq = new BigQuery({ credentials, projectId: credentials.project_id });

  const [users] = await bq.query({
    query: `SELECT id FROM \`project-scrappy-intelic.project_ether.users\` WHERE username = 'lcardoza' LIMIT 1`
  });
  
  if (users.length === 0) {
    console.log("User lcardoza not found!");
    return;
  }
  
  const userId = users[0].id;
  const creatureId = 'cr-crimson-guardian';
  console.log("Found user ID:", userId);
  
  const [existing] = await bq.query({
    query: `SELECT * FROM \`project-scrappy-intelic.project_ether.user_creatures\` WHERE user_id = @userId AND creature_id = @creatureId`,
    params: { userId, creatureId }
  });
  
  if (existing.length > 0) {
    console.log("User already has it, adding a copy...");
    await bq.query({
      query: `UPDATE \`project-scrappy-intelic.project_ether.user_creatures\` SET copies = copies + 1 WHERE user_id = @userId AND creature_id = @creatureId`,
      params: { userId, creatureId }
    });
    console.log("Done.");
  } else {
    console.log("Fetching base stats from catalog...");
    const [catalog] = await bq.query({
      query: `SELECT * FROM \`project-scrappy-intelic.project_ether.creatures_catalog\` WHERE id = @creatureId`,
      params: { creatureId }
    });
    
    if (catalog.length === 0) {
        console.log("Creature cr-crimson-guardian not found in catalog!");
        return;
    }
    
    const base = catalog[0];
    
    console.log("Inserting new creature into roster...");
    await bq.query({
      query: `
        INSERT INTO \`project-scrappy-intelic.project_ether.user_creatures\`
          (id, user_id, creature_id, level, exp, exp_to_next_level, hp, atk, def, spd, is_in_hub_team, copies)
        VALUES (GENERATE_UUID(), @userId, @creatureId, 1, 0, 100, @hp, @atk, @def, @spd, false, 1)
      `,
      params: {
        userId,
        creatureId,
        hp: base.base_hp,
        atk: base.base_atk,
        def: base.base_def,
        spd: base.base_spd
      }
    });
    console.log("Successfully granted crimsonguardian to lcardoza!");
  }
}

run().catch(console.error);
