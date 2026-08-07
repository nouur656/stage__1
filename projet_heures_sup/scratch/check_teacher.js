const { Pool } = require('pg'); 
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' }); 

pool.query(`SELECT sh.id, sh.code_etablissement, e."اسم المؤسسة", e.cycle, p."NOM_ETABL" as personnel_affectation, p."LL_GRADE"
FROM saisies_heures sh
JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
WHERE sh.ppr_enseignant = '54931';`)
  .then(res => { 
    console.log(res.rows); 
    pool.end(); 
  }).catch(err => { 
    console.error(err); 
    pool.end(); 
  });
