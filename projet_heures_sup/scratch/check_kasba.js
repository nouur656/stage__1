const { Pool } = require('pg'); 
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' }); 

pool.query(`SELECT DISTINCT e."رمز المؤسسة", e."اسم المؤسسة", e.cycle FROM etablissements e WHERE e."اسم المؤسسة" ILIKE '%كسبة%' OR e."اسم المؤسسة" ILIKE '%KASBA%';`)
  .then(res => { 
    console.log(res.rows); 
    pool.end(); 
  }).catch(err => { 
    console.error(err); 
    pool.end(); 
  });
