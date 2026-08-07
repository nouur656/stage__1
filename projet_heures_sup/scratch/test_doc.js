const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', database: 'heures_supplementaires', password: 'root', port: 5432, host: 'localhost' });
const path = require('path');
const fsModule = require('fs');
const XlsxPopulate = require('xlsx-populate');

(async () => {
    try {
        let query = `
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
        `;
        const result = await pool.query(query, [20]); 
        const s = result.rows[0];

        const daysQuery = `SELECT jour, heures FROM saisies_heures_jours WHERE saisie_id = $1`;
        const daysRes = await pool.query(daysQuery, [20]);
        const jDict = {};
        daysRes.rows.forEach(r => jDict[r.jour.toUpperCase()] = Number(r.heures));

        const cycle = (s.cycle || '').toUpperCase();
        
        let modelFile = path.join(process.cwd(), '1+2+3+4 PRI.xlsx');
        if (cycle === 'LYCEE') modelFile = path.join(process.cwd(), '1+2+3+4 LYCEE.xlsx');
        else if (cycle === 'COLLEGE') modelFile = path.join(process.cwd(), '1+2+3+4 COLLEGE.xlsx');

        if (!fsModule.existsSync(modelFile)) throw new Error('Model file not found: ' + modelFile);

        const workbook = await XlsxPopulate.fromFileAsync(modelFile);

        function nombreEnLettres(n) { return 'test'; }

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
        let hasError = false;
        sheetsToFill.forEach(sheetName => {
          const wsSheet = workbook.sheet(sheetName);
          if (!wsSheet) return;

          const fill = (row, col, value) => {
            try {
              wsSheet.row(row).cell(col).value(value);
            } catch(e) {
               console.log('Error writing', row, col, value, e.message);
               hasError = true;
            }
          };

          fill(1, 9, `N° ${s.id}`);
          fill(14, 3, s.nom || '');
          fill(14, 9, s.ppr || '');
          fill(16, 2, s.grade || '');
          fill(18, 2, s.nom_etablissement || s.affectation_personnel || '');
          fill(18, 9, s.cin || '');
          
          Object.keys(rowJours).forEach(jour => {
            Object.values(monthCols).forEach(col => {
              wsSheet.row(rowJours[jour]).cell(col).value(undefined);
            });
          });
          
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
        if(hasError) return;

        const buffer = await workbook.outputAsync();
        console.log('SUCCESS, bytes generated:', buffer.length);
    } catch(err) {
        console.error('ERROR HERE:', err);
    } finally {
        pool.end();
    }
})();
