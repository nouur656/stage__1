const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' });
(async () => {
  try {
    await p.query(`INSERT INTO personnel_manuel (ppr, nom, grade, cin, ajoute_par_etablissement)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ppr) DO UPDATE 
       SET nom = EXCLUDED.nom, grade = EXCLUDED.grade, cin = EXCLUDED.cin, ajoute_par_etablissement = EXCLUDED.ajoute_par_etablissement, date_ajout = NOW()`,
       ['25672', 'abd', 'PROF. DE L\'ENS. PRIMAIRE 1ER GR.', 'K 23456', 'TEST']);
    console.log('Success SQL!');
  } catch (err) {
    console.log('DB error:', err.message);
  } finally {
    p.end();
  }
})();
