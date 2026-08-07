const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
const start = s.indexOf("app.get('/api/export/excel'");
if(start !== -1) {
  let sub = s.substring(start);
  sub = sub.replace(/\\\`/g, '`');
  sub = sub.replace(/\\\$\{/g, '${');
  s = s.substring(0, start) + sub;
  fs.writeFileSync('server.js', s);
  console.log('Fixed syntax escapes');
}
