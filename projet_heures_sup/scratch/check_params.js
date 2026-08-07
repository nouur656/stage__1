const { Pool } = require('pg'); 
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'Postgres2026Secure', port: 5432, host: 'localhost' }); 

pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'parametres_gid';`)
  .then(res => { 
    console.log('parametres_gid columns:', res.rows);
    return pool.query(`SELECT * FROM parametres_gid;`);
  })
  .then(res => {
    console.log('parametres_gid data:', res.rows);
    pool.end();
  }).catch(err => { 
    console.error(err); 
    pool.end(); 
  });
