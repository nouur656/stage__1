// Inspect the GID .xls file structure
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'GID_MODELE.xls');
const workbook = XLSX.readFile(filePath);

console.log('=== Sheet Names ===');
console.log(workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n=== Sheet: "${sheetName}" ===`);
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  console.log(`Range: ${sheet['!ref']}`);
  console.log(`Rows: ${range.s.r + 1} to ${range.e.r + 1}, Cols: ${range.s.c + 1} to ${range.e.c + 1}`);
  
  // Print first 10 rows
  const maxRows = Math.min(range.e.r + 1, 10);
  for (let r = range.s.r; r < maxRows; r++) {
    const rowData = [];
    for (let c = range.s.c; c <= Math.min(range.e.c, 25); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      rowData.push(cell ? cell.v : '');
    }
    console.log(`Row ${r + 1}: ${JSON.stringify(rowData)}`);
  }
});
