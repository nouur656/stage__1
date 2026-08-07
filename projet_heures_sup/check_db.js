const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires' });
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'saisies_heures_jours'");
  console.log('Columns:', res.rows);
  const t = await client.query("SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'saisies_heures_jours'");
  console.log('Triggers:', t.rows);
  await client.end();
}
test().catch(console.error);
