const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');
const startIdx = s.indexOf("app.get('/api/export/excel'");
const endIdx = s.indexOf("app.patch('/api/enseignant/:ppr'");

if (startIdx !== -1) {
  // We'll replace until the end of the export route. Wait, where does export end? 
  // Let's find the `});` of export.
}
