const fs = require('fs');

let src = fs.readFileSync('server.js', 'utf8');

// Find the end of the newly correctly patched `/api/export/gid` route:
const endOfGoodGid = src.indexOf("    res.status(500).json({ error: 'Erreur lors de la génération du fichier GID' });\n  }\n});");
const goodGidLen = "    res.status(500).json({ error: 'Erreur lors de la génération du fichier GID' });\n  }\n});".length;

const startOfJunk = endOfGoodGid + goodGidLen;

// Find the start of the next route
const endOfJunk = src.indexOf("\n\n// ─────────────────────────────────────────────────────────────────────────────\n// ─────────────────────────────────────────────────────────────────────────────\n\napp.get('/api/export/excel', requireAuth, async (req, res) => {");

if (startOfJunk > 0 && endOfJunk > startOfJunk) {
    src = src.substring(0, startOfJunk) + src.substring(endOfJunk);
    fs.writeFileSync('server.js', src, 'utf8');
    console.log('Fixed server.js junk!');
} else {
    console.log('Could not find junk bounds', {startOfJunk, endOfJunk});
}
