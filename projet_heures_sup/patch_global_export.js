const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');

const startIdx = s.indexOf("app.get('/api/export/excel'");
const endIdx = s.indexOf("app.patch('/api/enseignant/:ppr'");

if (startIdx !== -1 && endIdx !== -1) {
  let innerEndIdx = s.lastIndexOf('//', endIdx - 10);
  if (innerEndIdx === -1) innerEndIdx = endIdx;

  const newRoute = `app.get('/api/export/excel', requireAuth, async (req, res) => {
  const user = req.session.user;
  const { mois, cycle, liste_no } = req.query;

  try {
    let query = \\\`
      SELECT
        sh.id,
        sh.ppr_enseignant as ppr,
        sh.nombre_heures,
        sh.taux_horaire,
        sh.montant_brut,
        sh.taux_ir,
        sh.prelevement_ir,
        sh.montant_net,
        sh.rib,
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
      WHERE 1=1
    \\\`;
    const params = [];
    let idx = 1;

    if (user.role === 'directeur') {
      query += \\\` AND sh.code_etablissement = $\\\${idx++}\\\`;
      params.push(user.code_etablissement);
    }
    if (mois) {
      query += \\\` AND sh.mois = $\\\${idx++}\\\`;
      params.push(mois);
    }
    const reqCycle = cycle || user.cycle;
    if (reqCycle && reqCycle !== '') {
      query += \\\` AND UPPER(e.cycle) = UPPER($\\\${idx++})\\\`;
      params.push(reqCycle);
    }

    query += \\\` ORDER BY sh.date_saisie ASC\\\`;

    const result = await pool.query(query, params);
    const rows = result.rows;
    if (rows.length === 0) return res.status(404).json({ error: 'Aucune donnée trouvée pour cet export' });

    let targetCycle = reqCycle ? reqCycle.toUpperCase() : (rows[0].cycle || '').toUpperCase();
    if (!targetCycle) targetCycle = 'PRIMAIRE';
    if(targetCycle.includes('PRI')) targetCycle = 'PRI';
    else if(targetCycle.includes('COL')) targetCycle = 'COLLEGE';
    else if(targetCycle.includes('LYC')) targetCycle = 'LYCEE';
    else targetCycle = 'PRI';
    
    const path = require('path');
    let modelFile = path.join(__dirname, '1+2+3+4 PRI.xlsx');
    if (targetCycle === 'LYCEE') modelFile = path.join(__dirname, '1+2+3+4 LYCEE.xlsx');
    else if (targetCycle === 'COLLEGE') modelFile = path.join(__dirname, '1+2+3+4 COLLEGE.xlsx');

    const fsModule = require('fs');
    if (!fsModule.existsSync(modelFile)) return res.status(500).json({ error: 'Fichier modèle introuvable' });

    const XlsxPopulate = require('xlsx-populate');
    const workbook = await XlsxPopulate.fromFileAsync(modelFile);

    const wsListe = workbook.sheet('Liste de suivi');
    if (!wsListe) return res.status(500).json({ error: 'Feuille Liste de suivi introuvable' });

    // Clear "Liste de suivi" rows 14 to 35
    for (let r = 14; r <= 35; r++) {
      for (let c = 1; c <= 14; c++) {
         wsListe.row(r).cell(c).value(undefined);
      }
    }

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

    const tCount = Math.min(rows.length, 22);
    const allIds = rows.slice(0, tCount).map(r => r.id);
    const daysQuery = \\\`SELECT saisie_id, jour, heures FROM saisies_heures_jours WHERE saisie_id = ANY($1)\\\`;
    const daysRes = await pool.query(daysQuery, [allIds]);

    const monthCols = {
      'Janvier': 2, 'Février': 3, 'Mars': 4, 'Avril': 5,
      'Mai': 6, 'Juin': 7, 'Juillet': 8, 'Août': 9, 'Septembre': 10, 'Octobre': 11, 'Novembre': 12, 'Décembre': 13
    };
    
    const rowJours = {
      'LUNDI': 24, 'MARDI': 25, 'MERCREDI': 26,
      'JEUDI': 27, 'VENDREDI': 28, 'SAMEDI': 29
    };

    const firstDbMois = (rows[0].mois || '').split(' ')[0];
    let colMois = monthCols[firstDbMois] || 2;

    for (let i = 0; i < tCount; i++) {
       const rowNum = 14 + i;
       const s = rows[i];
       
       wsListe.row(rowNum).cell(1).value(i + 1); // N°
       wsListe.row(rowNum).cell(2).value(s.nom || '');
       wsListe.row(rowNum).cell(3).value(s.grade || '');
       wsListe.row(rowNum).cell(4).value(s.ppr || '');
       wsListe.row(rowNum).cell(5).value(''); // Ech
       wsListe.row(rowNum).cell(6).value(Number(s.nombre_heures));
       wsListe.row(rowNum).cell(7).value(Number(s.taux_horaire));
       wsListe.row(rowNum).cell(8).value(Number(s.montant_brut));
       wsListe.row(rowNum).cell(9).value(s.affectation_personnel || s.nom_etablissement || '');
       wsListe.row(rowNum).cell(10).value(s.cin || '');
       wsListe.row(rowNum).cell(11).value(Number(s.taux_ir)/100);
       wsListe.row(rowNum).cell(12).value(Number(s.prelevement_ir));
       wsListe.row(rowNum).cell(13).value(Number(s.montant_net));
       wsListe.row(rowNum).cell(14).value(s.rib || '');

       // Fiche individuelle logic
       const sheetNameRaw = '(' + (i + 1) + ')';
       let sheetName = sheetNameRaw;
       let wsIndiv = workbook.sheet(sheetNameRaw);
       
       // S'il n'y a pas d'onglet nommé (5) par exemple, mais qu'il y en a un nommé juste "5" ou qu'on doit cloner :
       if (!wsIndiv) {
          if (workbook.sheet((i+1).toString())) {
              sheetName = (i+1).toString();
              wsIndiv = workbook.sheet(sheetName);
          } else {
             // Clone template sheet (1)
             const templateSheet = workbook.sheet('(1)');
             if(templateSheet) {
                 workbook.cloneSheet(templateSheet, sheetNameRaw);
                 sheetName = sheetNameRaw;
                 wsIndiv = workbook.sheet(sheetName);
             }
          }
       }

       if (wsIndiv) {
           const fill = (row, col, value) => {
             wsIndiv.row(row).cell(col).value(value);
           };

           fill(1, 9, \\\`N° \\\${s.id}\\\`);
           fill(14, 3, s.nom || '');
           fill(14, 9, s.ppr || '');
           fill(16, 2, s.grade || '');
           fill(18, 2, s.nom_etablissement || s.affectation_personnel || '');
           fill(18, 9, s.cin || '');

           // Explicitement nettoyer la grille des mois
           Object.keys(rowJours).forEach(jour => {
             Object.values(monthCols).forEach(col => {
               wsIndiv.row(rowJours[jour]).cell(col).value(undefined);
             });
           });

           // Get jours for this specific teacher
           const sDays = daysRes.rows.filter(d => d.saisie_id === s.id);
           const jDict = {};
           sDays.forEach(r => jDict[r.jour.toUpperCase()] = Number(r.heures));

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
       }
    }

    const filename = \\\`Liste_\\\${liste_no || 1}_\\\${targetCycle}_\\\${(mois || 'Tous').replace(/\\\\s/g, '_')}.xlsx\\\`;
    
    // We should probably delete extraneous clone/unused sheets?
    // It's optional, but keeping it identical to what exists is mostly fine.
    
    const buffer = await workbook.outputAsync();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', \\\`attachment; filename="\\\${filename}"\\\`);
    res.send(buffer);

  } catch (err) {
    console.error('Export Excel complet error:', err);
    return res.status(500).json({ error: 'Erreur lors de la génération du fichier global: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
`;

  const finalStr = s.substring(0, startIdx) + newRoute + s.substring(innerEndIdx);
  fs.writeFileSync('server.js', finalStr, 'utf8');
  console.log('Successfully patched server.js GET /api/export/excel');
} else {
  console.log('Error patching export script');
}
