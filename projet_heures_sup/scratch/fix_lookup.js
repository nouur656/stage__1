const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// Replace the entire GET /api/enseignant/:ppr route
// Use a regex to find it precisely
const routeRegex = /\/\/ GET \/api\/enseignant\/:ppr[^\n]*\r?\napp\.get\('\/api\/enseignant\/:ppr'[\s\S]*?\}\);(\r?\n)/;

const match = s.match(routeRegex);
if (match) {
  const newRoute = `// GET /api/enseignant/:ppr \u2014 lookup teacher by PPR (personnel + personnel_manuel + rib)
app.get('/api/enseignant/:ppr', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr } = req.params;
  try {
    // 1. Check official table first
    let result = await pool.query(
      \`SELECT "PPR"::text as ppr, "NOML" as nom, "LL_GRADE" as grade, "CIN" as cin, "NOM_ETABL" as affectation, "CD_ETAB" as cd_etab
       FROM personnel
       WHERE "PPR"::text = $1\`,
      [ppr.trim()]
    );

    // 2. If not found, check manual table
    if (result.rows.length === 0) {
      result = await pool.query(
        \`SELECT ppr, nom_prenom as nom, grade, cin, affectation
         FROM personnel_manuel
         WHERE ppr = $1\`,
        [ppr.trim()]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aucun enseignant trouv\u00e9 avec ce num\u00e9ro S.O.M' });
    }

    const teacher = result.rows[0];

    // 3. Fetch saved RIB if exists
    const ribResult = await pool.query(
      \`SELECT rib FROM rib_enseignants WHERE ppr = $1\`,
      [ppr.trim()]
    );
    if (ribResult.rows.length > 0) {
      teacher.rib = ribResult.rows[0].rib;
    }

    return res.json(teacher);
  } catch (err) {
    console.error('Lookup enseignant error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});
`;

  s = s.replace(routeRegex, newRoute);
  console.log('Successfully replaced GET /api/enseignant/:ppr route');
} else {
  console.log('ERROR: Could not find the route with regex');
}

fs.writeFileSync('server.js', s);
console.log('Done.');
