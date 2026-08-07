const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' });
(async () => {
  // Check if teachers exist in personnel_manuel
  const r = await p.query('SELECT * FROM personnel_manuel');
  console.log('=== personnel_manuel ===');
  console.log(r.rows);
  
  // Check rib_enseignants
  const r2 = await p.query('SELECT * FROM rib_enseignants');
  console.log('\n=== rib_enseignants ===');
  console.log(r2.rows);
  
  p.end();
})();
