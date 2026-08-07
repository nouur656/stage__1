const { Pool } = require('pg'); 
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' }); 

pool.query(`SELECT p."CD_ETAB", p."NOM_ETABL", e."رمز المؤسسة", e.cycle 
FROM personnel p 
LEFT JOIN etablissements e ON e."رمز المؤسسة" = p."CD_ETAB" 
WHERE p."PPR"::text = '54931';`)
  .then(res => { 
    console.log(res.rows);
    pool.end();
  }).catch(err => { 
    console.error(err); 
    pool.end(); 
  });
