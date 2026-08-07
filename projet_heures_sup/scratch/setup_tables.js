const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'heures_supplementaires', password: 'root', port: 5432 });

async function setupDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rib_enseignants (
        ppr VARCHAR(50) PRIMARY KEY,
        rib VARCHAR(50),
        date_maj TIMESTAMP DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS personnel_manuel (
        ppr VARCHAR(50) PRIMARY KEY,
        nom VARCHAR(150),
        grade VARCHAR(100),
        cin VARCHAR(50),
        ajoute_par_etablissement VARCHAR(50),
        date_ajout TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Tables rib_enseignants and personnel_manuel verified/created.');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

setupDb();
