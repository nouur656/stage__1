const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires',
});

async function migratePasswords() {
  try {
    console.log('Altering table column...');
    await pool.query('ALTER TABLE etablissements ALTER COLUMN mot_de_passe TYPE VARCHAR(255);');
    
    console.log('Fetching etablissements...');
    const result = await pool.query('SELECT "رمز المؤسسة" as code, mot_de_passe FROM etablissements');
    
    for (const etab of result.rows) {
      if (etab.mot_de_passe && !etab.mot_de_passe.startsWith('$2b$')) {
        const hashedPassword = await bcrypt.hash(etab.mot_de_passe, 10);
        await pool.query('UPDATE etablissements SET mot_de_passe = $1 WHERE "رمز المؤسسة" = $2', [hashedPassword, etab.code]);
        console.log(`Updated password for ${etab.code}`);
      }
    }
    
    console.log('Migration complete!');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await pool.end();
  }
}

migratePasswords();
