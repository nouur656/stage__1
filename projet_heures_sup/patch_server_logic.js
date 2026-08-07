const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');

const sOld = `    const result = await pool.query(
      \`SELECT "PPR"::text as ppr, "NOML" as nom, "LL_GRADE" as grade, "CIN" as cin, "NOM_ETABL" as affectation, "CD_ETAB" as cd_etab
       FROM personnel
       WHERE "PPR"::text = $1\`,
      [ppr.trim()]
    );`;

const sNew = `    const result = await pool.query(
      \`SELECT 
         COALESCE(p."PPR"::text, pm.ppr) as ppr,
         COALESCE(p."NOML", pm.nom) as nom,
         COALESCE(p."LL_GRADE", pm.grade) as grade,
         COALESCE(p."CIN", pm.cin) as cin,
         COALESCE(p."NOM_ETABL", e."اسم المؤسسة") as affectation,
         r.rib as rib,
         p."CD_ETAB" as cd_etab
       FROM (SELECT $1::text as ppr_param) tmp
       LEFT JOIN personnel p ON p."PPR"::text = tmp.ppr_param
       LEFT JOIN personnel_manuel pm ON pm.ppr = tmp.ppr_param
       LEFT JOIN etablissements e ON e."الرمز" = pm.ajoute_par_etablissement
       LEFT JOIN rib_enseignants r ON r.ppr = tmp.ppr_param
       WHERE (p."PPR" IS NOT NULL OR pm.ppr IS NOT NULL)\`,
      [ppr.trim()]
    );`;

s = s.replace(sOld, sNew);

const rOld = `// PATCH /api/enseignant/:ppr â€” correct teacher data (nom, grade, cin, affectation)`;
const rNew = `// POST /api/enseignant/manuel â€” add teacher to manual database
app.post('/api/enseignant/manuel', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr, nom, grade, cin } = req.body;
  const { code_etablissement } = req.session.user;

  if (!ppr || !nom) return res.status(400).json({ error: 'S.O.M et Nom requis' });

  try {
    await pool.query(
      \`INSERT INTO personnel_manuel (ppr, nom, grade, cin, ajoute_par_etablissement)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ppr) DO UPDATE 
       SET nom = EXCLUDED.nom, grade = EXCLUDED.grade, cin = EXCLUDED.cin, ajoute_par_etablissement = EXCLUDED.ajoute_par_etablissement, date_ajout = NOW()\`,
      [ppr.trim(), nom.trim(), grade?.trim() || null, cin?.trim() || null, code_etablissement]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Insert personnel_manuel error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\\'ajout' });
  }
});

// PATCH /api/enseignant/:ppr â€” correct teacher data (nom, grade, cin, affectation)`;

s = s.replace(rOld, rNew);

fs.writeFileSync('server.js', s);
console.log('Patched server.js manually!');
