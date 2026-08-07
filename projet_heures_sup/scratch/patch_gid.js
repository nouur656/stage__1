const fs = require('fs');
const path = require('path');

let script = fs.readFileSync('server.js', 'utf8');

const regex = /\/api\/export\/gid.*?}\);/s;

const newRoute = `/api/export/gid', requireAuth, requireDirection, async (req, res) => {
  const { mois, cycle, etablissement } = req.query;

  try {
    const { rows } = await fetchExportRows(req.session.user, { mois, cycle, etablissement });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Aucune donnée trouvée pour cet export GID' });
    }

    const pRes = await pool.query('SELECT * FROM parametres_gid LIMIT 1');
    const p = pRes.rows[0] || {};
    const listeId = p.liste_courante || 1;

    const ribRes = await pool.query('SELECT ppr, rib FROM rib_enseignants');
    const ribMap = {};
    ribRes.rows.forEach(r => { ribMap[r.ppr] = r.rib; });

    const XlsxPopulate = require('xlsx-populate');
    const modelPath = path.join(__dirname, 'GID_MODELE.xlsx');
    if (!fs.existsSync(modelPath)) {
      return res.status(500).json({ error: 'Fichier modèle GID introuvable (GID_MODELE.xlsx)' });
    }
    const workbook = await XlsxPopulate.fromFileAsync(modelPath);
    const ws = workbook.sheet('liate5');
    if (!ws) {
      return res.status(500).json({ error: 'Feuille "liate5" introuvable dans le modèle GID' });
    }

    const totalNet = rows.reduce((s, r) => s + Number(r.montant_net), 0);
    const currYear = new Date().getFullYear();

    // Fill header (Row 2, 1-indexed for xlsx-populate)
    ws.row(2).cell(1).value('0113');
    ws.row(2).cell(2).value('SALIND');
    ws.row(2).cell(3).value('IND_SUPP');
    ws.row(2).cell(4).value(currYear);
    ws.row(2).cell(5).value(\`INDEMNITE HORAIRE POUR TRAVAUX SUPPLEMENTAIRES - SOUTIEN SCOLAIRE Liste N°=\${listeId}\`);
    ws.row(2).cell(6).value(p.nom_signataire || 'RACHID');
    ws.row(2).cell(7).value(p.prenom_signataire || 'RIANE');
    ws.row(2).cell(8).value('');
    ws.row(2).cell(9).value(totalNet);
    ws.row(2).cell(10).value('PED_GLOBAL');
    ws.row(2).cell(11).value(p.rubrique || '5212011001912013321');

    // Helper functions
    const formatRIB = (ribStr) => {
      const s = String(ribStr || '').replace(/\\D/g, '');
      if (s.length === 24) {
        return { rib: s, bq: s.substring(0,3), ville: s.substring(3,6), cpte: s.substring(6,22), cle: s.substring(22,24) };
      }
      return { rib: s || '', bq: '', ville: '', cpte: '', cle: '' };
    };

    const getDateEnds = (moisLabel) => {
      const parts = (moisLabel || '').split(' ');
      if (parts.length < 2) return { start: '', end: '' };
      const mStr = parts[0].toLowerCase();
      const year = parseInt(parts[1]) || currYear;
      const map = {
        'janvier':1, 'février':2, 'fevrier':2, 'mars':3, 'avril':4, 'mai':5,
        'juin':6, 'juillet':7, 'août':8, 'aout':8, 'septembre':9, 'octobre':10,
        'novembre':11, 'décembre':12, 'decembre':12
      };
      const mn = map[mStr] || 1;
      const lastDay = new Date(year, mn, 0).getDate();
      return {
        start: \`01/\${String(mn).padStart(2,'0')}/\${year}\`,
        end: \`\${lastDay}/\${String(mn).padStart(2,'0')}/\${year}\`
      };
    };

    // Fill data rows (starting at row 7)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rNum = 7 + i;
      const dates = getDateEnds(r.mois || '');
      const nomComplet = (r.nom || '').trim();
      const parts = nomComplet.split(/\\s+/);
      const nomFirst = parts.shift() || '';
      const prenomRest = parts.join(' ');
      const ribRaw = r.rib || ribMap[r.ppr] || '';
      const rr = formatRIB(ribRaw);

      ws.row(rNum).cell(1).value(r.grade || '');
      ws.row(rNum).cell(2).value(dates.start);
      ws.row(rNum).cell(3).value(dates.end);
      ws.row(rNum).cell(4).value(Number(r.nombre_heures));
      ws.row(rNum).cell(5).value(Number(r.taux_horaire));
      ws.row(rNum).cell(6).value(Number(r.montant_brut));
      ws.row(rNum).cell(7).value(Number(r.prelevement_ir));
      ws.row(rNum).cell(8).value(Number(r.montant_net));
      ws.row(rNum).cell(9).value(r.cin || '');
      ws.row(rNum).cell(10).value(nomFirst);
      ws.row(rNum).cell(11).value(prenomRest);
      ws.row(rNum).cell(12).value(r.ppr || '');
      ws.row(rNum).cell(13).value('VIR');
      ws.row(rNum).cell(14).value('RIB');
      ws.row(rNum).cell(15).value(rr.rib);
      ws.row(rNum).cell(16).value(rr.bq);
      ws.row(rNum).cell(17).value(rr.ville);
      ws.row(rNum).cell(18).value(rr.cpte);
      ws.row(rNum).cell(19).value(rr.cle);
      ws.row(rNum).cell(20).value('IND_SUPP');
      ws.row(rNum).cell(21).value('IND_SUPP');
      ws.row(rNum).cell(22).value(nomComplet);
      
      // Setup borders manually since template only provided empty blanks for first records, but xlsx-populate applies styles nicely
      for (let c = 1; c <= 22; c++) {
         ws.row(rNum).cell(c).style("border", true);
      }
    }

    await pool.query('UPDATE parametres_gid SET liste_courante = liste_courante + 1');

    const buffer = await workbook.outputAsync();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', \`attachment; filename="Export_GID_Liste_\${listeId}.xlsx"\`);
    res.send(buffer);

  } catch (err) {
    console.error('GID export error:', err);
    res.status(500).json({ error: 'Erreur lors de la génération du fichier GID' });
  }
});`;

script = script.replace(/\/api\/export\/gid',.*?}\);/s, newRoute);
fs.writeFileSync('server.js', script, 'utf8');
console.log('GID export route patched in server.js');
