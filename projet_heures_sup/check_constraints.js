const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires' });
  await client.connect();
  const res = await client.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'saisies_heures'::regclass");
  console.log(res.rows);
  await client.end();
}
test().catch(console.error);
