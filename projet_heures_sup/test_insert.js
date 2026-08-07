const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires' });
  await client.connect();
  try {
    const check = await client.query('SELECT * FROM personnel LIMIT 1');
    const ppr = check.rows[0].PPR;
    
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO saisies_heures
         (code_etablissement, ppr_enseignant, mois, nombre_heures, taux_ir, rib, taux_horaire)
       VALUES ($1, $2, $3, 0, $4, $5, $6)
       RETURNING id`,
      ['0000', ppr, 'Juillet 2026', 30, '0001', 159]
    );
    const saisieId = result.rows[0].id;

    await client.query(
      'INSERT INTO saisies_heures_jours (saisie_id, jour, heures) VALUES ($1, $2, $3)',
      [saisieId, 'Lundi', 2]
    );

    await client.query('COMMIT');
    console.log("SUCCESS!");
  } catch(e) {
    console.error("DB ERROR:", e);
    await client.query('ROLLBACK');
  }
  await client.end();
}
test();
