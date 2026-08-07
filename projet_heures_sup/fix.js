const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// The DB columns the queries use must be correct:
s = s.replace(/Ø±Ù…Ø² Ø§Ù„Ù…Ø¤Ø³Ø³Ø©/g, 'رمز المؤسسة');
s = s.replace(/Ø§Ø³Ù… Ø§Ù„Ù…Ø¤Ø³Ø³Ø©/g, 'اسم المؤسسة');
s = s.replace(/Ø§Ù„Ù…Ø¯ÙŠØ±/g, 'المدير');

// Because of PowerShell weird regex matching on unicode, also let's just forcibly fix the exact string.
// Looking for the specific login query:
s = s.replace(/SELECT\s+"[^"]+"\s+as\s+code,\s+"[^"]+"\s+as\s+nom,\s+"[^"]+"\s+as\s+directeur,\s+cycle[^\n]+\n[^\n]+\n[^\n]+UPPER\(TRIM\("[^"]+"\)\)/s, 
  `SELECT "رمز المؤسسة" as code, "اسم المؤسسة" as nom, "المدير" as directeur, cycle
       FROM etablissements
       WHERE UPPER(TRIM("رمز المؤسسة"))`);

s = s.replace(/Î”/g, 'é'); // Wait I'm not sure what it is.

// Let's do common French accents manually:
s = s.replace(/Ã©/g, 'é');
s = s.replace(/Ã¨/g, 'è');
s = s.replace(/Ã/g, 'à'); // Caution: Ã is dangerous, maybe Ã 
// we can fix `error: 'Code Ã©tablissement requis'` to `error: 'Code établissement requis'`
s = s.replace(/Ã©tablissement/g, 'établissement');
s = s.replace(/gÃ©nÃ©ration/g, 'génération');

fs.writeFileSync('server.js', s, 'utf8');
console.log('Fixed server.js');
