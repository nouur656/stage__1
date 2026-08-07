const { Pool } = require('pg'); 
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'Postgres2026Secure', port: 5432, host: 'localhost' }); 

// Check if rib_enseignants table exists and has data
pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'rib_enseignants';`)
  .then(res => { 
    console.log('rib_enseignants columns:', res.rows);
    return pool.query(`SELECT * FROM rib_enseignants LIMIT 5;`);
  })
  .then(res => {
    console.log('rib_enseignants data:', res.rows);
    // Check what RIBs are stored in saisies_heures
    return pool.query(`SELECT sh.id, sh.ppr_enseignant, sh.rib FROM saisies_heures sh LIMIT 10;`);
  })
  .then(res => {
    console.log('saisies RIBs:', res.rows);
    // Check if parametres_gid table exists
    return pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%param%';`);
  })
  .then(res => {
    console.log('param tables:', res.rows);
    pool.end();
  }).catch(err => { 
    console.error(err); 
    pool.end(); 
  });
