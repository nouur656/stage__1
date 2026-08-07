const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');
const insertPoint = content.indexOf('// DELETE /api/direction/saisies/vider');

const newRoutes = `
// GET /api/direction/historique — monthly aggregated stats for Direction
app.get('/api/direction/historique', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query(\`
      SELECT
        mois,
        COUNT(*) as nb_saisies,
        SUM(montant_brut)::numeric as total_brut,
        SUM(montant_net)::numeric as total_net,
        SUM(nombre_heures)::numeric as total_heures,
        SUM(CASE WHEN valide_par_direction THEN 1 ELSE 0 END) as nb_validees
      FROM saisies_heures
      GROUP BY mois
      ORDER BY mois
    \`);
    return res.json(result.rows);
  } catch (err) {
    console.error('Historique direction error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/saisies/historique — monthly aggregated stats for a Directeur
app.get('/api/saisies/historique', requireAuth, requireDirecteur, async (req, res) => {
  const { code_etablissement } = req.session.user;
  try {
    const result = await pool.query(\`
      SELECT
        mois,
        COUNT(*) as nb_saisies,
        SUM(montant_brut)::numeric as total_brut,
        SUM(montant_net)::numeric as total_net,
        SUM(nombre_heures)::numeric as total_heures,
        SUM(CASE WHEN valide_par_direction THEN 1 ELSE 0 END) as nb_validees
      FROM saisies_heures
      WHERE code_etablissement = $1
      GROUP BY mois
      ORDER BY mois
    \`, [code_etablissement]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Historique directeur error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

`;

const updated = content.substring(0, insertPoint) + newRoutes + content.substring(insertPoint);
fs.writeFileSync('server.js', updated, 'utf8');
console.log('Historique routes inserted successfully at position', insertPoint);
