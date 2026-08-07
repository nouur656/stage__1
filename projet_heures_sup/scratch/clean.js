const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');

const sEtat1 = `// GET /api/saisies/:id/etat â€” generate individual "à‰tat des sommes dues" Excel doc`;
const lines = s.split('\n');
let modifiedArgs = [];
let toRemoveStart = -1;

// Remove duplicate etat route
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// GET /api/saisies/:id/etat')) {
     if (toRemoveStart === -1) {
       toRemoveStart = i; // This is the first one (around 664)
     } else {
       // This is the second one (around 1146)!
       let braces = 0;
       let j = i + 1;
       let started = false;
       for (; j < lines.length; j++) {
         if (lines[j].includes('{')) { started = true; braces += (lines[j].match(/{/g) || []).length; }
         if (lines[j].includes('}')) { braces -= (lines[j].match(/}/g) || []).length; }
         if (started && braces === 0) break;
       }
       lines.splice(i, j - i + 1);
       console.log('Removed duplicate etat block from line', i, 'to', j);
       break;
     }
  }
}

// Remove duplicate generic export route
let exportCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(`app.get('/api/export/excel'`)) {
    exportCount++;
    if (exportCount === 2) {
       let braces = 0;
       let j = i;
       let started = false;
       for (; j < lines.length; j++) {
         if (lines[j].includes('{')) { started = true; braces += (lines[j].match(/{/g) || []).length; }
         if (lines[j].includes('}')) { braces -= (lines[j].match(/}/g) || []).length; }
         if (started && braces <= 0) break;
       }
       lines.splice(i, j - i + 1);
       console.log('Removed duplicate generic export block from line', i, 'to', j);
       break;
    }
  }
}

fs.writeFileSync('server.js', lines.join('\n'));
console.log('Done cleaning duplicates.');
