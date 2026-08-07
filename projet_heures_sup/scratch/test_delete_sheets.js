const XlsxPopulate = require('xlsx-populate');
const path = require('path');

async function test() {
  try {
    const model = path.join(__dirname, '..', 'GID_MODELE.xlsx');
    const wb = await XlsxPopulate.fromFileAsync(model);
    
    // Test deleting extra sheets
    const sheetsToKeep = ['liate5'];
    
    // We cannot iterate and delete simultaneously safely sometimes, let's collect names
    const sheetNames = wb.sheets().map(s => s.name());
    for(const name of sheetNames) {
       if(!sheetsToKeep.includes(name)) {
           console.log("Deleting sheet: " + name);
           wb.deleteSheet(name);
       }
    }
    
    console.log("Remaining sheets:", wb.sheets().map(s => s.name()));
  } catch (err) {
    console.error("Test failed:", err);
  }
}
test();
