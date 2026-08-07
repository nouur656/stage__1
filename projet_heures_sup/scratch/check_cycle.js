const { Pool } = require('pg'); 
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' }); 

pool.query(`SELECT DISTINCT cycle FROM etablissements;`)
  .then(res => { 
    console.log(res.rows);
    return pool.query(`SELECT p."PPR", p."NOM_ETABL", p."LL_GRADE" FROM personnel p WHERE p."NOM_ETABL" ILIKE '%KASBA%';`);
  })
  .then(res => {
    console.log(res.rows);
    pool.end();
  }).catch(err => { 
    console.error(err); 
    pool.end(); 
  });
