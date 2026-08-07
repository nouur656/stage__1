const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');

// 1. Fix fetchExportRows
s = s.replace(
`      COALESCE(p."NOM_ETABL", pm.affectation) as affectation_personnel,
      e."اسم المؤسسة" as nom_etablissement,
      e.cycle
    FROM saisies_heures sh
    LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
    LEFT JOIN personnel_manuel pm ON pm.ppr = sh.ppr_enseignant
    LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement`,
`      COALESCE(p."NOM_ETABL", pm.affectation) as affectation_personnel,
      e."اسم المؤسسة" as nom_etablissement,
      COALESCE(e_affectation.cycle, e.cycle) as cycle
    FROM saisies_heures sh
    LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
    LEFT JOIN personnel_manuel pm ON pm.ppr = sh.ppr_enseignant
    LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
    LEFT JOIN etablissements e_affectation ON e_affectation."رمز المؤسسة" = p."CD_ETAB"`);

s = s.replace(
`    if (filterCycle) {
      query += \` AND UPPER(e.cycle) = $\${idx++}\`;
      params.push(filterCycle);
    }`,
`    if (filterCycle) {
      query += \` AND UPPER(COALESCE(e_affectation.cycle, e.cycle)) = $\${idx++}\`;
      params.push(filterCycle);
    }`);

s = s.replace(
`query += \` ORDER BY e.cycle, sh.code_etablissement, sh.date_saisie ASC\`;`,
`query += \` ORDER BY COALESCE(e_affectation.cycle, e.cycle), sh.code_etablissement, sh.date_saisie ASC\`;`);


// 2. Fix /api/direction/saisies
s = s.replace(
`        sh.mois,
        sh.date_saisie,
        sh.valide_par_direction
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      WHERE 1=1`,
`        sh.mois,
        sh.date_saisie,
        sh.valide_par_direction,
        COALESCE(e_affectation.cycle, e.cycle) as cycle
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      LEFT JOIN etablissements e_affectation ON e_affectation."رمز المؤسسة" = p."CD_ETAB"
      WHERE 1=1`);

s = s.replace(
`    if (filterCycle) {
      query += \` AND UPPER(e.cycle) = $\${idx++}\`;
      params.push(filterCycle);
    }`,
`    if (filterCycle) {
      query += \` AND UPPER(COALESCE(e_affectation.cycle, e.cycle)) = $\${idx++}\`;
      params.push(filterCycle);
    }`);

s = s.replace(
`query += \` ORDER BY e.cycle, sh.code_etablissement, sh.date_saisie DESC\`;`,
`query += \` ORDER BY COALESCE(e_affectation.cycle, e.cycle), sh.code_etablissement, sh.date_saisie DESC\`;`);

fs.writeFileSync('server.js', s);
console.log('SQL patches applied for teacher cycle classification!');
