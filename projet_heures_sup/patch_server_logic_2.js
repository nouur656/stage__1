const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const oldCheck = `    const check = await pool.query(
      'SELECT "PPR" FROM personnel WHERE "PPR"::text = $1',
      [ppr_enseignant.trim()]
    );`;

const newCheck = `    const check = await pool.query(
      \`SELECT 1 FROM personnel WHERE "PPR"::text = $1
       UNION
       SELECT 1 FROM personnel_manuel WHERE ppr = $1\`,
      [ppr_enseignant.trim()]
    );`;

s = s.replace(oldCheck, newCheck);
fs.writeFileSync('server.js', s);
console.log('Patched POST /api/saisies');
