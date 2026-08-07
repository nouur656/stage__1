const { Pool } = require('pg'); 
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' }); 

pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'personnel';`)
  .then(res => { 
    console.log(res.rows);
    pool.end();
  }).catch(err => { 
    console.error(err); 
    pool.end(); 
  });
