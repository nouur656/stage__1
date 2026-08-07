const ExcelJS = require('exceljs');
async function inspect(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  console.log('\n=== FILE:', file, '===');
  console.log('Total sheets:', wb.worksheets.length);
  wb.eachSheet((ws, id) => {
    console.log('\n--- Sheet id=' + id + ' name=' + ws.name + ' rows=' + ws.rowCount + ' ---');
    for (let r = 1; r <= Math.min(ws.rowCount, 56); r++) {
      const row = ws.getRow(r);
      let cells = [];
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        let v = cell.value;
        if (v !== null && v !== undefined && v !== '') {
          if (typeof v === 'object' && v.result !== undefined) {
            v = '[formula result=' + String(v.result).substring(0, 40) + ']';
          }
          const str = String(v).substring(0, 70);
          cells.push('C' + col + '=' + str);
        }
      });
      if (cells.length) console.log('  R' + r + ': ' + cells.join(' | '));
    }
  });
}
inspect('1+2+3+4 LYCEE.xlsx').catch(console.error);
