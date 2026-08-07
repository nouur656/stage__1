const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// Fix GET /api/enseignant/:ppr
s = s.replace(/COALESCE\(p\."NOML", pm\.nom\) as nom/g, 'COALESCE(p."NOML", pm.nom_prenom) as nom');

// Fix POST /api/enseignant/manuel
const oldPost = `      \`INSERT INTO personnel_manuel (ppr, nom, grade, cin, ajoute_par_etablissement)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ppr) DO UPDATE 
       SET nom = EXCLUDED.nom, grade = EXCLUDED.grade, cin = EXCLUDED.cin, ajoute_par_etablissement = EXCLUDED.ajoute_par_etablissement, date_ajout = NOW()\`,
      [ppr.trim(), nom.trim(), grade?.trim() || null, cin?.trim() || null, code_etablissement]`;

const newPost = `      \`INSERT INTO personnel_manuel (ppr, nom_prenom, grade, cin, ajoute_par_etablissement)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ppr) DO UPDATE 
       SET nom_prenom = EXCLUDED.nom_prenom, grade = EXCLUDED.grade, cin = EXCLUDED.cin, ajoute_par_etablissement = EXCLUDED.ajoute_par_etablissement, date_ajout = NOW()\`,
      [ppr.trim(), nom.trim(), grade?.trim() || null, cin?.trim() || null, code_etablissement]`;

s = s.replace(oldPost, newPost);
fs.writeFileSync('server.js', s);
console.log('Fixed server.js DB column mapping');
