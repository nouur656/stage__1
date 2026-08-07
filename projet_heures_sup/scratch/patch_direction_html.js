const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'public', 'direction.html');
let html = fs.readFileSync(targetPath, 'utf8');

// 1. Add settings modal CSS
const modalCSS = `
    /* GID Settings Modal */
    .modal-overlay {
      display: none;
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1000;
      align-items: center; justify-content: center;
    }
    .modal-overlay.active { display: flex; }
    .modal-content {
      background: #fff; border-radius: 12px;
      padding: 24px; width: 400px; max-width: 90%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { margin: 0; font-size: 1.2rem; color: var(--navy); }
    .modal-close { cursor: pointer; border: none; background: none; font-size: 1.2rem; color: var(--muted); }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 600; font-size: 0.85rem; color: var(--navy); }
    .form-group input { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .btn-outline { padding: 8px 16px; border: 1px solid var(--border); background: #fff; border-radius: 6px; cursor: pointer; }
    .btn-save { padding: 8px 16px; background: var(--green); color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
    
    .btn-export-purple { background: #8e44ad; color: #fff; border: none; }
    .btn-export-purple:hover { background: #732d91; }
    .btn-settings { background: none; border: 1px solid var(--border); border-radius: 6px; cursor: pointer; padding: 6px 10px; font-size: 1.1rem; }
    .btn-settings:hover { background: var(--hover); }
`;
html = html.replace('</style>', modalCSS + '\n  </style>');

// 2. Add Export GID button and Settings button
const exportGroup = `
        <button class="btn-export btn-export-blue" onclick="exportExcel('PRIMAIRE')">⬇ Excel — Primaire</button>
        <button class="btn-export btn-export-blue" onclick="exportExcel('COLLEGE')">⬇ Excel — Collège</button>
        <button class="btn-export btn-export-blue" onclick="exportExcel('LYCEE')">⬇ Excel — Lycée</button>
        <button class="btn-export" onclick="exportExcel('TOUS')">⬇ Excel — Tous</button>
        <button class="btn-export btn-export-purple" style="margin-left:8px;" onclick="exportGID()">⬇ Format GID</button>
        <button class="btn-settings" onclick="openGIDSettings()" title="Paramètres GID">⚙️</button>
`;
html = html.replace(/<button class="btn-export btn-export-blue" onclick="exportExcel\('PRIMAIRE'\)">.*<\/button>[\s\S]*?<button class="btn-export" onclick="exportExcel\('TOUS'\)">⬇ Excel — Tous<\/button>/, exportGroup.trim());

// 3. Add Modal HTML before </body>
const modalHTML = `
<!-- Modal Paramètres GID -->
<div class="modal-overlay" id="gidModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Paramètres Export GID</h3>
      <button class="modal-close" onclick="closeGIDSettings()">✖</button>
    </div>
    <div class="form-group">
      <label for="gidNom">Nom Signataire</label>
      <input type="text" id="gidNom" placeholder="Ex: RACHID">
    </div>
    <div class="form-group">
      <label for="gidPrenom">Prénom Signataire</label>
      <input type="text" id="gidPrenom" placeholder="Ex: RIANE">
    </div>
    <div class="form-group">
      <label for="gidRubrique">N° Rubrique</label>
      <input type="text" id="gidRubrique" placeholder="Ex: 5212011001912013321">
    </div>
    <div class="form-group">
      <label for="gidListe">Numéro de Liste Courant</label>
      <input type="number" id="gidListe" min="1">
      <small style="color:var(--muted); font-size:0.75rem; display:block; margin-top:4px;">Il s'incrémente automatiquement après chaque export.</small>
    </div>
    <div class="modal-actions">
      <button class="btn-outline" onclick="closeGIDSettings()">Annuler</button>
      <button class="btn-save" onclick="saveGIDSettings()">Enregistrer</button>
    </div>
  </div>
</div>
`;
html = html.replace('</body>', modalHTML + '\n</body>');

// 4. Add JS functions
const jsFunctions = `
  // ── GID Export & Settings ──────────────────────────────────────────────────
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

  async function openGIDSettings() {
    try {
      const res = await fetch('/api/direction/gid-params');
      if (res.ok) {
        const p = await res.json();
        document.getElementById('gidNom').value = p.nom_signataire || 'RACHID';
        document.getElementById('gidPrenom').value = p.prenom_signataire || 'RIANE';
        document.getElementById('gidRubrique').value = p.rubrique || '5212011001912013321';
        document.getElementById('gidListe').value = p.liste_courante || 1;
      }
      document.getElementById('gidModal').classList.add('active');
    } catch(err) {
      showToast('Erreur chargement paramètres', 'error');
    }
  }

  function closeGIDSettings() {
    document.getElementById('gidModal').classList.remove('active');
  }

  async function saveGIDSettings() {
    const p = {
      nom_signataire: document.getElementById('gidNom').value.trim(),
      prenom_signataire: document.getElementById('gidPrenom').value.trim(),
      rubrique: document.getElementById('gidRubrique').value.trim(),
      liste_courante: parseInt(document.getElementById('gidListe').value, 10) || 1
    };
    try {
      const res = await fetch('/api/direction/gid-params', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      if (res.ok) {
        showToast('Paramètres GID enregistrés', 'success');
        closeGIDSettings();
      } else {
        showToast('Erreur lors de la sauvegarde', 'error');
      }
    } catch (err) {
      showToast('Erreur de connexion', 'error');
    }
  }
`;
html = html.replace('// ── Logout ────────────────────────────────────────────────────────────────', jsFunctions + '\n  // ── Logout ────────────────────────────────────────────────────────────────');

fs.writeFileSync(targetPath, html, 'utf8');
console.log('direction.html patched successfully.');
