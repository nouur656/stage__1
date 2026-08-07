const fs = require('fs');
const path = require('path');

let s = fs.readFileSync('server.js', 'utf8');

const startStr = '// â”€â”€ 1. Fetch data';
const fallbackStartStr = '// ── 1. Fetch data';

let startIdx = s.indexOf(startStr);
if (startIdx === -1) startIdx = s.indexOf(fallbackStartStr);

if (startIdx === -1) {
  // Try finding app.get
  startIdx = s.indexOf("app.get('/api/saisies/:id/etat'");
} else {
  // go backwards to app.get
  startIdx = s.lastIndexOf("app.get('/api/saisies/:id/etat'", startIdx);
}


const endIdxStr = 'app.get(\'/api/export/excel\'';
let endIdx = s.indexOf(endIdxStr);

if (startIdx !== -1 && endIdx !== -1) {
    // go backward to previous line
    endIdx = s.lastIndexOf('\n', endIdx - 5);

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

    const cycle = (s.cycle || '').toUpperCase();
    let modelFile = path.join(__dirname, '1+2+3+4 PRI.xlsx');
    if (cycle === 'LYCEE') modelFile = path.join(__dirname, '1+2+3+4 LYCEE.xlsx');
    else if (cycle === 'COLLEGE') modelFile = path.join(__dirname, '1+2+3+4 COLLEGE.xlsx');

    const fsModule = require('fs');
    if (!fsModule.existsSync(modelFile)) return res.status(500).json({ error: 'Fichier modèle introuvable' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(modelFile);

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

    const sheetsToFill = ['(1)', '(2)', '(3)', '(4)'];
    sheetsToFill.forEach(sheetName => {
      const wsSheet = workbook.getWorksheet(sheetName);
      if (!wsSheet) return;

      const fill = (row, col, value) => {
        const cell = wsSheet.getRow(row).getCell(col);
        cell.value = value;
      };

      fill(1, 9, \`N° \${s.id}\`);
      fill(14, 3, s.nom || '');
      fill(14, 9, s.ppr || '');
      fill(16, 2, s.grade || '');
      fill(18, 2, s.nom_etablissement || s.affectation_personnel || '');
      fill(18, 9, s.cin || '');
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', \`attachment; filename="\${filename}"\`);
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Etat individuel error:', err);
    return res.status(500).json({ error: 'Erreur lors de la génération du document' });
  }
});
`;

    const finalStr = s.substring(0, startIdx) + newRoute + s.substring(endIdx);
    fs.writeFileSync('server.js', finalStr, 'utf8');
    console.log('Successfully patched server.js route!');
} else {
    console.log('Error finding replacement bounds!');
}
