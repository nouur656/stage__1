const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');

const startStr = "const workbook = new ExcelJS.Workbook();";
const endStr = "await workbook.xlsx.write(res);";

const startIdx = s.indexOf(startStr);
const endIdx = s.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `const XlsxPopulate = require('xlsx-populate');
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
    res.send(buffer);`;

  const finalStr = s.substring(0, startIdx) + replacement + s.substring(endIdx + endStr.length);
  fs.writeFileSync('server.js', finalStr, 'utf8');
  console.log('Successfully switched to xlsx-populate!');
} else {
  console.log('Indices not found!');
  console.log('startIdx:', startIdx);
  console.log('endIdx:', endIdx);
}
