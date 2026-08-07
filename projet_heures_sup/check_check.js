const { Client } = require('pg');
async function test() {
  const c = new Client({ connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires' });
  await c.connect();
  const res = await c.query("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE conname = 'saisies_heures_jours_jour_check'");
  console.log(res.rows[0]);
  await c.end();
}
test();
