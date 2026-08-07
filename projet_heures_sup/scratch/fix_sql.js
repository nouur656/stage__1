const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// The missing JOIN in the first block for /api/saisies/:id/etat
const erroredQuery = `      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      WHERE sh.id = $1`;
      
const fixedQuery = `      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN personnel_manuel pm ON pm.ppr = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      WHERE sh.id = $1`;

s = s.replaceAll(erroredQuery, fixedQuery);

// Add pm join for the second query without COALESCE (if it exists)
const erroredQuery2 = `        p."NOML" as nom,
        p."LL_GRADE" as grade,
        p."CIN" as cin,
        p."NOM_ETABL" as affectation_personnel,
        e."اسم المؤسسة" as nom_etablissement,
        e.cycle
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      WHERE sh.id = $1`;

const fixedQuery2 = `        COALESCE(p."NOML", pm.nom_prenom) as nom,
        COALESCE(p."LL_GRADE", pm.grade) as grade,
        COALESCE(p."CIN", pm.cin) as cin,
        COALESCE(p."NOM_ETABL", pm.affectation) as affectation_personnel,
        e."اسم المؤسسة" as nom_etablissement,
        e.cycle
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN personnel_manuel pm ON pm.ppr = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      WHERE sh.id = $1`;

s = s.replaceAll(erroredQuery2, fixedQuery2);

fs.writeFileSync('server.js', s);
console.log('Fixed SQL syntax error missing table pm');
