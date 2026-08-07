const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' });

(async () => {
    try {
        let query = `
          SELECT
            sh.id,
            sh.ppr_enseignant as ppr,
            sh.nombre_heures,
            sh.taux_horaire,
            sh.montant_brut,
            sh.taux_ir,
            sh.prelevement_ir,
            sh.montant_net,
            sh.mois,
            sh.code_etablissement,
            p."NOML" as nom,
            p."LL_GRADE" as grade,
            p."CIN" as cin,
            p."NOM_ETABL" as affectation_personnel,
            e."اسم المؤسسة" as nom_etablissement,
            e.cycle
          FROM saisies_heures sh
          LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
          LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
          WHERE sh.id = $1
        `;
        const result = await pool.query(query, [20]); // wait, I don't know if id 20 is the exact id, maybe in the user's DB. But I'll assume they have it.
        console.log(result.rows[0]);
    } catch(err) {
        console.error(err);
    } finally {
        pool.end();
    }
})();
