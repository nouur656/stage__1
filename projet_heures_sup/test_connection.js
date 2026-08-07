const { Client } = require('pg');

async function main() {
  const connectionString = 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires';
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to PostgreSQL database...');
    await client.connect();
    console.log('Connection successful!\n');

    // 1. Check personnel table
    try {
      const resPersonnel = await client.query('SELECT COUNT(*) FROM personnel');
      console.log(`Table personnel: Found ${resPersonnel.rows[0].count} rows.`);

      // List columns
      const colsPersonnel = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'personnel'
      `);
      console.log('Columns in personnel table:');
      colsPersonnel.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
      console.log();
    } catch (err) {
      console.error('Error querying personnel table:', err.message);
    }

    // 2. Check etablissements table
    try {
      const resEtab = await client.query('SELECT COUNT(*) FROM etablissements');
      console.log(`Table etablissements: Found ${resEtab.rows[0].count} rows.`);

      // List columns
      const colsEtab = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'etablissements'
      `);
      console.log('Columns in etablissements table:');
      colsEtab.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
      console.log();
    } catch (err) {
      console.error('Error querying etablissements table:', err.message);
    }

    // 3. Check / Create saisies_heures table
    console.log('Checking saisies_heures table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'saisies_heures'
      )
    `);

    const tableExists = tableCheck.rows[0].exists;
    if (tableExists) {
      console.log('Table saisies_heures already exists.');
      const resSaisies = await client.query('SELECT COUNT(*) FROM saisies_heures');
      console.log(`Table saisies_heures: Found ${resSaisies.rows[0].count} rows.`);
    } else {
      console.log('Table saisies_heures does not exist. Creating it now...');
      await client.query(`
        CREATE TABLE saisies_heures (
            id SERIAL PRIMARY KEY,
            code_etablissement VARCHAR(20) NOT NULL,
            ppr_enseignant VARCHAR(20) NOT NULL,
            mois VARCHAR(20) NOT NULL,
            nombre_heures NUMERIC(6,2) NOT NULL,
            taux_ir NUMERIC(4,2) NOT NULL,              -- 30, 34 ou 37
            rib VARCHAR(30),
            taux_horaire NUMERIC(8,2) NOT NULL,          -- 159 (primaire/college) ou 218 (lycee)
            montant_brut NUMERIC(10,2) GENERATED ALWAYS AS (nombre_heures * taux_horaire) STORED,
            prelevement_ir NUMERIC(10,2) GENERATED ALWAYS AS (nombre_heures * taux_horaire * taux_ir / 100) STORED,
            montant_net NUMERIC(10,2) GENERATED ALWAYS AS (nombre_heures * taux_horaire * (1 - taux_ir / 100)) STORED,
            date_saisie TIMESTAMP DEFAULT NOW(),
            valide_par_direction BOOLEAN DEFAULT FALSE
        );
      `);
      console.log('Table saisies_heures created successfully!');
    }

  } catch (err) {
    console.error('Fatal database connection error:', err.message);
  } finally {
    await client.end();
    console.log('\nDisconnected.');
  }
}

main();
