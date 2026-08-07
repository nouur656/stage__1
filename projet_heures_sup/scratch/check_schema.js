const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires' });

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'etablissements'
    `);
    console.log("COLUMNS etablissements:", res.rows);

    // Let's also check if there is a 'users' table or similar?
    const res2 = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `);
    console.log("TABLES:", res2.rows.map(r => r.table_name));
    
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
checkSchema();
