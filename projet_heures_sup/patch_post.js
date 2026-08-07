const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

const startIdx = s.indexOf("app.post('/api/saisies', requireAuth, requireDirecteur");
const endIdx = s.indexOf("app.get('/api/saisies', requireAuth, requireDirecteur");

if (startIdx !== -1 && endIdx !== -1) {
  const newRoute = `app.post('/api/saisies', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr_enseignant, mois, jours, taux_ir, rib } = req.body;
  const { code_etablissement, taux_horaire } = req.session.user;

  // Validate taux_ir
  const tauxAllowed = [30, 34, 37];
  if (!tauxAllowed.includes(Number(taux_ir))) {
    return res.status(400).json({ error: 'Taux IR doit être 30, 34 ou 37' });
  }

  const joursValides = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  let totalHeures = 0;
  if (!jours || typeof jours !== 'object') {
    return res.status(400).json({ error: 'Jours manquants' });
  }
  for (const j of joursValides) {
    if (jours[j]) totalHeures += Number(jours[j]);
  }
  if (totalHeures <= 0) {
    return res.status(400).json({ error: 'Veuillez saisir au moins des heures' });
  }

  // Verify the PPR exists in personnel
  try {
    const check = await pool.query(
      'SELECT "PPR" FROM personnel WHERE "PPR"::text = $1',
      [ppr_enseignant.trim()]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Enseignant (PPR) introuvable dans la base' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erreur vérification enseignant' });
  }

  try {
    await pool.query('BEGIN');
    const result = await pool.query(
      \`INSERT INTO saisies_heures
         (code_etablissement, ppr_enseignant, mois, nombre_heures, taux_ir, rib, taux_horaire)
       VALUES ($1, $2, $3, 0, $4, $5, $6)
       RETURNING id\`,
      [code_etablissement, ppr_enseignant.trim(), mois, taux_ir, rib || null, taux_horaire]
    );
    const saisieId = result.rows[0].id;

    for (const j of joursValides) {
      if (jours[j] && Number(jours[j]) > 0) {
        await pool.query(
          'INSERT INTO saisies_heures_jours (saisie_id, jour, heures) VALUES ($1, $2, $3)',
          [saisieId, j, Number(jours[j])]
        );
      }
    }

    await pool.query('COMMIT');
    
    // Retrieve data to return
    const sel = await pool.query('SELECT id, montant_brut, prelevement_ir, montant_net FROM saisies_heures WHERE id=$1',[saisieId]);

    return res.json({ success: true, data: sel.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Insert saisie error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\\'enregistrement' });
  }
});

// GET /api/saisies — get saisies for the logged-in directeur, with optional month filter
// `;
  
  const endIdxWithComment = s.lastIndexOf('//', endIdx);
  const finalStr = s.substring(0, startIdx) + newRoute + s.substring(endIdx);
  fs.writeFileSync('server.js', finalStr, 'utf8');
  console.log('Successfully patched server.js POST /api/saisies');
} else {
  console.log('Error patching POST config');
}
