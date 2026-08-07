const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires',
});

function isActiveFilter(value) {
  if (value == null) return false;
  const v = String(value).trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  if (lower === 'tous' || lower === 'all') return false;
  if (lower.startsWith('tous les') || lower.startsWith('toutes les')) return false;
  return true;
}

(async () => {
  const stats = await pool.query('SELECT COUNT(*) as total FROM saisies_heures');
  console.log('Total saisies:', stats.rows[0].total);

  const q = `
    SELECT
      sh.id,
      sh.code_etablissement,
      e."اسم المؤسسة" as nom_etablissement,
      e.cycle,
      sh.mois
    FROM saisies_heures sh
    LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
    LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
    WHERE 1=1
    ORDER BY e.cycle, sh.code_etablissement, sh.date_saisie DESC
  `;
  try {
    const r = await pool.query(q);
    console.log('Query rows (no filter):', r.rows.length);
    console.log(JSON.stringify(r.rows, null, 2));
  } catch (e) {
    console.error('Query error:', e.message);
  }

  const mois = await pool.query('SELECT DISTINCT mois FROM saisies_heures');
  console.log('Distinct mois:', mois.rows.map(r => r.mois));

  const cycles = await pool.query('SELECT DISTINCT cycle FROM etablissements');
  console.log('Distinct cycles:', cycles.rows.map(r => r.cycle));

  console.log('isActiveFilter tests:');
  ['', 'tous', 'Tous les mois', 'Tous les cycles', 'PRIMAIRE', 'Janvier 2026'].forEach(v => {
    console.log(`  "${v}" => ${isActiveFilter(v)}`);
  });

  await pool.end();
})();
