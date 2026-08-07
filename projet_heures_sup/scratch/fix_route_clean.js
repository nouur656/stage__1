const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// Find the line index of "// GET /api/enseignant/:ppr" and "// POST /api/enseignant/manuel"
const lines = s.split(/\r?\n/);

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('GET /api/enseignant/:ppr')) {
    startIdx = i;
  }
  if (lines[i].includes('POST /api/enseignant/manuel') && startIdx !== -1) {
    endIdx = i;
    break;
  }
}

console.log('Start line:', startIdx + 1, 'End line:', endIdx + 1);

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find boundaries!');
  process.exit(1);
}

// Replace everything from startIdx to endIdx-1 (exclusive of the POST route line)
const newRouteLines = [
  "// GET /api/enseignant/:ppr -- lookup teacher by PPR (personnel + personnel_manuel + rib)",
  "app.get('/api/enseignant/:ppr', requireAuth, requireDirecteur, async (req, res) => {",
  "  const { ppr } = req.params;",
  "  try {",
  "    // 1. Check official table first",
  "    let result = await pool.query(",
  "      'SELECT \"PPR\"::text as ppr, \"NOML\" as nom, \"LL_GRADE\" as grade, \"CIN\" as cin, \"NOM_ETABL\" as affectation, \"CD_ETAB\" as cd_etab FROM personnel WHERE \"PPR\"::text = $1',",
  "      [ppr.trim()]",
  "    );",
  "",
  "    // 2. If not found, check manual table",
  "    if (result.rows.length === 0) {",
  "      result = await pool.query(",
  "        'SELECT ppr, nom_prenom as nom, grade, cin, affectation FROM personnel_manuel WHERE ppr = $1',",
  "        [ppr.trim()]",
  "      );",
  "    }",
  "",
  "    if (result.rows.length === 0) {",
  "      return res.status(404).json({ error: 'Aucun enseignant trouv\\u00e9 avec ce num\\u00e9ro S.O.M' });",
  "    }",
  "",
  "    const teacher = result.rows[0];",
  "",
  "    // 3. Fetch saved RIB if exists",
  "    const ribResult = await pool.query(",
  "      'SELECT rib FROM rib_enseignants WHERE ppr = $1',",
  "      [ppr.trim()]",
  "    );",
  "    if (ribResult.rows.length > 0) {",
  "      teacher.rib = ribResult.rows[0].rib;",
  "    }",
  "",
  "    return res.json(teacher);",
  "  } catch (err) {",
  "    console.error('Lookup enseignant error:', err);",
  "    return res.status(500).json({ error: 'Erreur serveur' });",
  "  }",
  "});",
  ""
];

const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx);

const finalLines = [...before, ...newRouteLines, ...after];
fs.writeFileSync('server.js', finalLines.join('\n'));
console.log('Route replaced cleanly. Total lines:', finalLines.length);
