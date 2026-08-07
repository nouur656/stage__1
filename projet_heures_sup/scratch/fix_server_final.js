const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// Fix 1: Restore the corrupted login/directeur route
const corruptedBlock = `      \`SELECT "\u0631\u0645\u0632 \u0627\u0644\u0645\u0624\u0633\u0633\u0629" as code, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0624\u0633\u0633\u0629" as nom, "\u0627\u0644\u0645\u062f\u064a\u0631" as directeur, cycle
       FROM etablissements
  const { username, password } = req.body;`;

const fixedBlock = `      \`SELECT "\u0631\u0645\u0632 \u0627\u0644\u0645\u0624\u0633\u0633\u0629" as code, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0624\u0633\u0633\u0629" as nom, "\u0627\u0644\u0645\u062f\u064a\u0631" as directeur, cycle
       FROM etablissements
       WHERE UPPER(TRIM("\u0631\u0645\u0632 \u0627\u0644\u0645\u0624\u0633\u0633\u0629")) = UPPER(TRIM($1))\`,
      [code_etablissement]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Code \u00e9tablissement introuvable. V\u00e9rifiez et r\u00e9essayez.' });
    }

    const etab = result.rows[0];
    req.session.user = {
      role: 'directeur',
      code_etablissement: etab.code,
      nom_etablissement: etab.nom,
      directeur: etab.directeur,
      cycle: etab.cycle,
      taux_horaire: getTauxHoraire(etab.cycle),
    };

    return res.json({
      success: true,
      code: etab.code,
      nom: etab.nom,
      directeur: etab.directeur,
      cycle: etab.cycle,
    });
  } catch (err) {
    console.error('Login directeur error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/login/direction
app.post('/api/login/direction', (req, res) => {
  const { username, password } = req.body;`;

if (s.includes(corruptedBlock)) {
  s = s.replace(corruptedBlock, fixedBlock);
  console.log('Fix 1: Restored login/directeur route');
} else {
  console.log('Fix 1: Corrupted block not found (may already be fixed)');
}

// Fix 2: Update GET /api/enseignant/:ppr to search both tables
const oldLookup = `    const result = await pool.query(
      \`SELECT "PPR"::text as ppr, "NOML" as nom, "LL_GRADE" as grade, "CIN" as cin, "NOM_ETABL" as affectation, "CD_ETAB" as cd_etab
       FROM personnel
       WHERE "PPR"::text = $1\`,
      [ppr.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aucun enseignant trouv\u00e9 avec ce num\u00e9ro S.O.M' });
    }
    return res.json(result.rows[0]);`;

const newLookup = `    // 1. Check official table first
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

    return res.json(teacher);`;

if (s.includes(oldLookup)) {
  s = s.replace(oldLookup, newLookup);
  console.log('Fix 2: Updated GET /api/enseignant/:ppr to search both tables + RIB');
} else {
  console.log('Fix 2: Old lookup not found (check manually)');
}

fs.writeFileSync('server.js', s);
console.log('All fixes applied to server.js');
