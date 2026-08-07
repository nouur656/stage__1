const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const pgOptions = { connectionString: 'postgresql://postgres:Postgres2026Secure@localhost:5432/heures_supplementaires' };

function generateRandomPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  
  let pwd = 'DP';
  for (let i = 0; i < 4; i++) {
    pwd += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  for (let i = 0; i < 2; i++) {
    pwd += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return pwd;
}

async function run() {
  const pool = new Pool(pgOptions);
  
  try {
    const res = await pool.query('SELECT "رمز المؤسسة" as gresa, "اسم المؤسسة" as nom FROM etablissements ORDER BY "رمز المؤسسة" ASC');
    const updateQuery = 'UPDATE etablissements SET mot_de_passe = $1 WHERE "رمز المؤسسة" = $2';
    
    let mdContent = "# Mots de passe générés pour chaque Établissement (Code GRESA)\n\n";
    mdContent += "| Code GRESA | Établissement | Mot de passe sécurisé |\n";
    mdContent += "| --- | --- | --- |\n";

    for (const r of res.rows) {
      if (!r.gresa) continue;
      
      const password = generateRandomPassword();
      await pool.query(updateQuery, [password, r.gresa]);
      
      mdContent += `| **${r.gresa}** | ${r.nom} | \`${password}\` |\n`;
    }
    
    fs.writeFileSync(path.join(__dirname, 'passwords_gresa.md'), mdContent, 'utf8');
    console.log('Successfully generated passwords and written to passwords_gresa.md');

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
