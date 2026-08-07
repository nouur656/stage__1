const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// Modifying normalizeCycleFilter to preserve 'TOUS'
s = s.replace(
`function normalizeCycleFilter(cycle) {
  if (!isActiveFilter(cycle)) return null;
  const upper = String(cycle).trim().toUpperCase();
  if (upper.includes('PRI')) return 'PRIMAIRE';
  if (upper.includes('COL')) return 'COLLEGE';
  if (upper.includes('LYC')) return 'LYCEE';
  return upper;
}`,
`function normalizeCycleFilter(cycle) {
  if (String(cycle).trim().toUpperCase() === 'TOUS') return 'TOUS'; // Enable TOUS globally
  if (!isActiveFilter(cycle)) return null;
  const upper = String(cycle).trim().toUpperCase();
  if (upper.includes('PRI')) return 'PRIMAIRE';
  if (upper.includes('COL')) return 'COLLEGE';
  if (upper.includes('LYC')) return 'LYCEE';
  return upper;
}`);

// Modifying resolveModelCycleKey to permit 'TOUS'
s = s.replace(
`function resolveModelCycleKey(cycle) {
  const normalized = normalizeCycleFilter(cycle) || 'PRIMAIRE';
  if (normalized.includes('PRI')) return 'PRI';
  if (normalized.includes('COL')) return 'COLLEGE';
  if (normalized.includes('LYC')) return 'LYCEE';
  return 'PRI';
}`,
`function resolveModelCycleKey(cycle) {
  const normalized = normalizeCycleFilter(cycle) || 'PRIMAIRE';
  if (normalized === 'TOUS') return 'TOUS';
  if (normalized.includes('PRI')) return 'PRI';
  if (normalized.includes('COL')) return 'COLLEGE';
  if (normalized.includes('LYC')) return 'LYCEE';
  return 'PRI';
}`);

// Modifying getOfficialModelPath to handle 'TOUS'
s = s.replace(
`function getOfficialModelPath(modelCycleKey) {
  if (modelCycleKey === 'LYCEE') return path.join(__dirname, '1+2+3+4 LYCEE.xlsx');
  if (modelCycleKey === 'COLLEGE') return path.join(__dirname, '1+2+3+4 COLLEGE.xlsx');
  return path.join(__dirname, '1+2+3+4 PRI.xlsx');
}`,
`function getOfficialModelPath(modelCycleKey) {
  // Use PRI template for TOUS as a structural base as requested
  if (modelCycleKey === 'TOUS')  return path.join(__dirname, '1+2+3+4 PRI.xlsx');
  if (modelCycleKey === 'LYCEE') return path.join(__dirname, '1+2+3+4 LYCEE.xlsx');
  if (modelCycleKey === 'COLLEGE') return path.join(__dirname, '1+2+3+4 COLLEGE.xlsx');
  return path.join(__dirname, '1+2+3+4 PRI.xlsx');
}`);

// Modifying fetchExportRows to handle 'TOUS' (ignoring filterCycle in SQL if it equals 'TOUS')
s = s.replace(
`    if (filterCycle) {
      query += \` AND UPPER(COALESCE(e_affectation.cycle, e.cycle)) = $\${idx++}\`;
      params.push(filterCycle);
    }`,
`    if (filterCycle && filterCycle !== 'TOUS') {
      query += \` AND UPPER(COALESCE(e_affectation.cycle, e.cycle)) = $\${idx++}\`;
      params.push(filterCycle);
    }`);

// Modifying buildOfficialExportBuffer to add the cycle column
s = s.replace(
`    wsListe.row(rowNum).cell(14).value(s.rib || '');

    const sheetNameRaw = '(' + (i + 1) + ')';`,
`    wsListe.row(rowNum).cell(14).value(s.rib || '');
    
    // Add Cycle to column 15 to differentiate teachers visually in the consolidated list
    if (s.cycle) {
      wsListe.row(13).cell(15).value('CYCLE');
      wsListe.row(13).cell(15).style('bold', true);
      wsListe.row(rowNum).cell(15).value(s.cycle);
    }

    const sheetNameRaw = '(' + (i + 1) + ')';`);

// Modifying /api/export/excel to bypass the 400 error if explicitCycle is 'TOUS' (already handled since normalizeCycleFilter returns 'TOUS' implicitly making it truthy)

fs.writeFileSync('server.js', s);
console.log('Done repairing script');
