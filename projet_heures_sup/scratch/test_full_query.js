const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires',
});

(async () => {
  let query = `
    SELECT
      sh.id,
      sh.code_etablissement,
      e."اسم المؤسسة" as nom_etablissement,
      e.cycle,
      p."NOML" as nom,
      p."LL_GRADE" as grade,
      sh.ppr_enseignant as ppr,
      sh.nombre_heures,
      sh.taux_horaire,
      sh.montant_brut,
      p."NOM_ETABL" as affectation,
      p."CIN" as cin,
      sh.taux_ir,
      sh.prelevement_ir,
      sh.montant_net,
      sh.rib,
      sh.mois,
      sh.date_saisie,
      sh.valide_par_direction
    FROM saisies_heures sh
    LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
    LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
    WHERE 1=1
    ORDER BY e.cycle, sh.code_etablissement, sh.date_saisie DESC
  `;
  try {
    const r = await pool.query(query);
    console.log('Full query rows:', r.rows.length);
  } catch (e) {
    console.error('Full query error:', e.message);
  }
  await pool.end();
})();
