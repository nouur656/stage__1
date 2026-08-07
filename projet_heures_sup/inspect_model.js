const ExcelJS = require('exceljs');

async function inspectDeep(file, sheetName) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  
  let ws;
  if (sheetName) {
    ws = wb.getWorksheet(sheetName);
  } else {
    // Get first non-empty sheet
    wb.eachSheet((s) => { if (!ws && s.rowCount > 0) ws = s; });
  }
  
  console.log(`\n=== SHEET: "${ws.name}" | rows=${ws.rowCount} cols=${ws.columnCount} ===`);
  
  // Column widths
  console.log('\n--- COLUMN WIDTHS ---');
  for (let c = 1; c <= ws.columnCount + 2; c++) {
    const col = ws.getColumn(c);
    if (col.width) console.log(`  Col ${c} (${String.fromCharCode(64+c)}): width=${col.width}`);
  }
  
  // Row heights
  console.log('\n--- ROW HEIGHTS & CONTENT ---');
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    let cells = [];
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      let v = cell.value;
      if (v === null || v === undefined || v === '') return;
      
      if (typeof v === 'object' && v.formula) {
        v = `[formula="${v.formula}" => ${JSON.stringify(v.result)}]`;
      }
      
      const style = [];
      if (cell.font) {
        if (cell.font.bold) style.push('BOLD');
        if (cell.font.size) style.push(`sz=${cell.font.size}`);
        if (cell.font.name) style.push(`font=${cell.font.name}`);
        if (cell.font.color && cell.font.color.argb) style.push(`color=${cell.font.color.argb}`);
      }
      if (cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb) {
        style.push(`bg=${cell.fill.fgColor.argb}`);
      }
      if (cell.alignment) {
        if (cell.alignment.horizontal) style.push(`align=${cell.alignment.horizontal}`);
      }
      if (cell.border) {
        const b = cell.border;
        if (b.top || b.bottom || b.left || b.right) style.push('border');
      }
      
      cells.push(`C${col}="${String(v).substring(0,60)}" [${style.join(',')}]`);
    });
    
    if (cells.length || row.height) {
      const h = row.height ? `h=${row.height}` : '';
      console.log(`  R${r}(${h}): ${cells.join(' | ')}`);
    }
  }
  
  // Merges
  console.log('\n--- MERGES ---');
  if (ws._merges) {
    Object.keys(ws._merges).forEach(k => console.log(`  ${k}`));
  }
}

// Inspect the (1) sheet of the LYCEE file
const wb2 = new ExcelJS.Workbook();
async function main() {
  await wb2.xlsx.readFile('1+2+3+4 LYCEE.xlsx');
  console.log('Sheets:', wb2.worksheets.map(s => s.name).join(', '));
  
  // Sheet named "(1)"
  const ws1 = wb2.getWorksheet('(1)');
  if (ws1) {
    await inspectDeep('1+2+3+4 LYCEE.xlsx', '(1)');
  } else {
    // try first sheet
    const first = wb2.worksheets[0];
    console.log('Using first sheet:', first.name);
    await inspectDeep('1+2+3+4 LYCEE.xlsx', first.name);
  }
}
main().catch(console.error);
