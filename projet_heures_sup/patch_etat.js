const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');

const startIdx = s.indexOf("app.get('/api/saisies/:id/etat'");
const endIdx = s.indexOf("app.get('/api/export/excel'");

if (startIdx !== -1 && endIdx !== -1) {
  let innerEndIdx = s.lastIndexOf('//', endIdx - 10);
  if (innerEndIdx === -1) innerEndIdx = endIdx;

  const newRoute = `app.get('/api/saisies/:id/etat', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  try {
    let query = \`
      SELECT
        sh.id,
        sh.ppr_enseignant as ppr,
        sh.nombre_heures,
        sh.taux_horaire,
        sh.montant_brut,
        sh.taux_ir,
        sh.prelevement_ir,
        sh.montant_net,
        sh.mois,
        sh.code_etablissement,
        p."NOML" as nom,
        p."LL_GRADE" as grade,
        p."CIN" as cin,
        p."NOM_ETABL" as affectation_personnel,
        e."اسم المؤسسة" as nom_etablissement,
        e.cycle
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      WHERE sh.id = $1
    \`;
    const params = [id];
    if (user.role === 'directeur') {
      query += \` AND sh.code_etablissement = $2\`;
      params.push(user.code_etablissement);
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Saisie introuvable' });
    const s = result.rows[0];

    // Fetch jours
    const daysQuery = \`SELECT jour, heures FROM saisies_heures_jours WHERE saisie_id = $1\`;
    const daysRes = await pool.query(daysQuery, [id]);
    const jDict = {};
    daysRes.rows.forEach(r => jDict[r.jour.toUpperCase()] = Number(r.heures));

    const cycle = (s.cycle || '').toUpperCase();
    const path = require('path');
    let modelFile = path.join(__dirname, '1+2+3+4 PRI.xlsx');
    if (cycle === 'LYCEE') modelFile = path.join(__dirname, '1+2+3+4 LYCEE.xlsx');
    else if (cycle === 'COLLEGE') modelFile = path.join(__dirname, '1+2+3+4 COLLEGE.xlsx');

    const fsModule = require('fs');
    if (!fsModule.existsSync(modelFile)) return res.status(500).json({ error: 'Fichier modèle introuvable' });

    const XlsxPopulate = require('xlsx-populate');
    const workbook = await XlsxPopulate.fromFileAsync(modelFile);

    function nombreEnLettres(n) {
      const units = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
      const tens  = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
      function below100(x) {
        if(x<20) return units[x];
        const t=Math.floor(x/10), u=x%10;
        if(t===7) return tens[t]+(u===1?'-et-':'-')+units[10+u];
        if(t===9) return tens[t]+(u>0?'-'+units[10+u]:'s');
        return tens[t]+(u===1&&t!==8?'-et-un':u>0?'-'+units[u]:(t===8?'s':''));
      }
      function below1000(x) {
        if(x<100) return below100(x);
        const h=Math.floor(x/100), r=x%100;
        return (h===1?'cent':units[h]+' cent')+(r>0?'-'+below100(r):(h>1?'s':''));
      }
      const num = Math.round(n);
      const cents = Math.round((n-num)*100);
      if(num===0) return 'Zéro dirham';
      let str='';
      if(num>=1000) { const k=Math.floor(num/1000); str+=(k===1?'mille':below1000(k)+' mille')+' '; }
      const rem=num%1000;
      if(rem>0) str+=below1000(rem);
      str=str.trim()+' dirham'+(num>1?'s':'');
      if(cents>0) str+=' et '+below100(cents)+' centime'+(cents>1?'s':'');
      return str.charAt(0).toUpperCase()+str.slice(1);
    }

    const monthCols = {
      'Janvier': 2, 'Février': 3, 'Mars': 4, 'Avril': 5,
      'Mai': 6, 'Juin': 7, 'Juillet': 8, 'Août': 9, 'Septembre': 10, 'Octobre': 11, 'Novembre': 12, 'Décembre': 13
    };
    const dbMois = s.mois.split(' ')[0];
    let colMois = monthCols[dbMois] || 2;
    
    const rowJours = {
      'LUNDI': 24, 'MARDI': 25, 'MERCREDI': 26,
      'JEUDI': 27, 'VENDREDI': 28, 'SAMEDI': 29
    };

    const sheetsToFill = ['(1)', '(2)', '(3)', '(4)'];
    sheetsToFill.forEach(sheetName => {
      const wsSheet = workbook.sheet(sheetName);
      if (!wsSheet) return;

      const fill = (row, col, value) => {
        wsSheet.row(row).cell(col).value(value);
      };

      fill(1, 9, \`N° \${s.id}\`);
      fill(14, 3, s.nom || '');
      fill(14, 9, s.ppr || '');
      fill(16, 2, s.grade || '');
      fill(18, 2, s.nom_etablissement || s.affectation_personnel || '');
      fill(18, 9, s.cin || '');
      
      // Inject Jours
      Object.keys(rowJours).forEach(jour => {
        if (jDict[jour]) fill(rowJours[jour], colMois, jDict[jour]);
      });

      fill(32, 4, Number(s.nombre_heures));
      fill(32, 6, Number(s.taux_horaire));
      fill(32, 8, Number(s.montant_brut));
      fill(32, 9, Number(s.montant_brut));
      fill(34, 4, nombreEnLettres(Number(s.montant_brut)));
      fill(45, 2, Number(s.montant_brut));
      fill(45, 3, Number(s.montant_brut));
      fill(47, 2, Number(s.taux_ir)/100);
      fill(47, 5, Number(s.prelevement_ir));
      fill(47, 6, Number(s.prelevement_ir));
      fill(47, 8, Number(s.montant_net));
      fill(47, 9, Number(s.montant_net));
      fill(49, 5, nombreEnLettres(Number(s.montant_net)));
    });

    const nomSafe = (s.nom || 'enseignant').replace(/[^\\w\\u00C0-\\u024F]/g, '_').substring(0, 30);
    const filename = \`etat_\${s.ppr}_\${nomSafe}_\${(s.mois || '').replace(/\\s/g, '_')}.xlsx\`;

    const buffer = await workbook.outputAsync();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', \`attachment; filename="\${filename}"\`);
    res.send(buffer);

  } catch (err) {
    console.error('Etat individuel error:', err);
    return res.status(500).json({ error: 'Erreur lors de la génération du document' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
`;
  
  const finalStr = s.substring(0, startIdx) + newRoute + s.substring(innerEndIdx);
  fs.writeFileSync('server.js', finalStr, 'utf8');
  console.log('Successfully patched server.js GET /api/saisies/:id/etat');
} else {
  console.log('Error patching etat getter config');
}
