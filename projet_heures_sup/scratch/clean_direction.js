const fs = require('fs');

let html = fs.readFileSync('public/direction.html', 'utf8');

// The single exportGID function we want to keep
const pureExportGid = `
  // ── GID Export ────────────────────────────────────────────────────────────
  function exportGID() {
    const mois = document.getElementById('f-mois').value;
    const filterCycle = document.getElementById('f-cycle').value;
    const etab = document.getElementById('f-etab').value;
    
    let url = \`/api/export/gid?liste_no=1\`;
    if (isActiveFilter(filterCycle)) url += \`&cycle=\${encodeURIComponent(filterCycle.trim())}\`;
    if (isActiveFilter(mois)) url += \`&mois=\${encodeURIComponent(mois.trim())}\`;
    if (isActiveFilter(etab)) url += \`&etablissement=\${encodeURIComponent(etab.trim())}\`;
    window.location.href = url;
  }
`;

// Replace all GID script logic
const gidScriptRegex = /\/\/ ── GID Export & Settings ──────────────────────────────────────────────────[\s\S]*?(?=\/\/ ── Logout ────────────────────────────────────────────────────────────────)/g;

html = html.replace(gidScriptRegex, pureExportGid + '\n  ');

// Remove all Modal html at the bottom
const modalRegex = /<!-- Modal Paramètres GID -->[\s\S]*?(?=<\/body>)/g;
html = html.replace(modalRegex, '');

fs.writeFileSync('public/direction.html', html, 'utf8');
console.log('direction.html cleaned');
