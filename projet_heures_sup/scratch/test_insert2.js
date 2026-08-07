const { Pool } = require('pg');
const p = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' });
(async () => {
  try {
    await p.query(`INSERT INTO personnel_manuel (ppr, nom_prenom, grade, cin, ajoute_par_etablissement)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ppr) DO UPDATE 
       SET nom_prenom = EXCLUDED.nom_prenom, grade = EXCLUDED.grade, cin = EXCLUDED.cin, ajoute_par_etablissement = EXCLUDED.ajoute_par_etablissement, date_ajout = NOW()`,
       ['34657', 'abd fatah', 'PROF. DE L\'ENS. PRIMAIRE 1ER GR.', 'k 23456', 'TEST']);
    console.log('Success SQL!');
  } catch (err) {
    console.log('DB error:', err.message);
  } finally {
    p.end();
  }
})();
