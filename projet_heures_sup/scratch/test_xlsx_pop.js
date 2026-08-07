const XlsxPopulate = require('xlsx-populate');
const path = require('path');

async function test() {
  try {
    const model = path.join(__dirname, '..', 'GID_MODELE.xlsx');
    const wb = await XlsxPopulate.fromFileAsync(model);
    console.log("Success reading with xlsx-populate!");
    const ws = wb.sheet('liate5');
    console.log("Found sheet:", !!ws);
  } catch (err) {
    console.error("Failed to read with xlsx-populate:", err);
  }
}
test();
