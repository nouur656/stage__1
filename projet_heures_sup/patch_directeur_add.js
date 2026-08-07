const fs = require('fs');
let html = fs.readFileSync('public/directeur.html', 'utf8');

// 1. Add modal HTML
const modalAjoutHtml = `
<!-- ── Modal Ajout Enseignant ── -->
<div class="modal-overlay" id="modal-ajout" onclick="fermerModaleAjout(event)">
  <div class="modal-box">
    <div class="modal-head" style="background: linear-gradient(135deg, #0D5C2E, #16a34a);">
      <div>
        <h3>➕ Ajouter un professeur</h3>
        <p>Cet enseignant sera enregistré localement</p>
      </div>
      <button class="btn-modal-close" onclick="fermerModaleAjout()">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-field">
        <label>S.O.M (PPR) *</label>
        <input type="text" id="add-ppr" readonly style="background:#f5f5f5;" />
      </div>
      <div class="modal-field">
        <label>Nom &amp; Prénom *</label>
        <input type="text" id="add-nom" placeholder="Nom complet de l'enseignant" />
      </div>
      <div class="modal-field">
        <label>Grade (Optionnel)</label>
        <input type="text" id="add-grade" placeholder="Grade" />
      </div>
      <div class="modal-field">
        <label>C.I.N (Optionnel)</label>
        <input type="text" id="add-cin" placeholder="Numéro CIN" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-modal-cancel" onclick="fermerModaleAjout()">Annuler</button>
      <button class="btn-modal-save" style="background:#0D5C2E; color:white; border:none;" id="btn-modal-add" onclick="sauvegarderAjout()">
        ✅ Valider l'ajout
      </button>
    </div>
  </div>
</div>
`;

if (!html.includes('id="modal-ajout"')) {
  html = html.replace('<!-- Toast -->', modalAjoutHtml + '\n<!-- Toast -->');
}

// 2. Modify JS (Rechercher)
const oldRechercher = `    try {
      const res = await fetch(\`/api/enseignant/\${encodeURIComponent(ppr)}\`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Enseignant introuvable', 'error');
        return;
      }
      currentPPR = data.ppr;
      document.getElementById('t-nom').textContent = data.nom || '—';
      document.getElementById('t-grade').textContent = data.grade || '—';
      document.getElementById('t-cin').textContent = data.cin || '—';
      document.getElementById('t-affectation').textContent = data.affectation || '—';
      infoDiv.classList.add('show');

      // Préremplir la modale avec les données récupérées
      document.getElementById('edit-nom').value = data.nom || '';
      document.getElementById('edit-grade').value = data.grade || '';
      document.getElementById('edit-cin').value = data.cin || '';
      document.getElementById('edit-affectation').value = data.affectation || '';
    } catch {`;

const newRechercher = `    try {
      const res = await fetch(\`/api/enseignant/\${encodeURIComponent(ppr)}\`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          ouvrirModaleAjout(ppr);
        } else {
          showToast(data.error || 'Enseignant introuvable', 'error');
        }
        return;
      }
      currentPPR = data.ppr;
      document.getElementById('t-nom').textContent = data.nom || '—';
      document.getElementById('t-grade').textContent = data.grade || '—';
      document.getElementById('t-cin').textContent = data.cin || '—';
      document.getElementById('t-affectation').textContent = data.affectation || '—';
      infoDiv.classList.add('show');
      
      if (data.rib) {
        document.getElementById('rib-input').value = data.rib;
      } else {
        document.getElementById('rib-input').value = '';
      }

      // Préremplir la modale avec les données récupérées
      document.getElementById('edit-nom').value = data.nom || '';
      document.getElementById('edit-grade').value = data.grade || '';
      document.getElementById('edit-cin').value = data.cin || '';
      document.getElementById('edit-affectation').value = data.affectation || '';
    } catch {`;

html = html.replace(oldRechercher, newRechercher);

// 3. Add modal script functions
const modalScripts = `
  // ── Modal Ajout Enseignant ──
  function ouvrirModaleAjout(ppr) {
    document.getElementById('add-ppr').value = ppr.trim();
    document.getElementById('add-nom').value = '';
    document.getElementById('add-grade').value = '';
    document.getElementById('add-cin').value = '';
    document.getElementById('modal-ajout').classList.add('open');
  }
  function fermerModaleAjout(event) {
    if (event && event.target !== document.getElementById('modal-ajout')) return;
    document.getElementById('modal-ajout').classList.remove('open');
  }
  async function sauvegarderAjout() {
    const ppr = document.getElementById('add-ppr').value.trim();
    const nom = document.getElementById('add-nom').value.trim();
    const grade = document.getElementById('add-grade').value.trim();
    const cin = document.getElementById('add-cin').value.trim();
    
    if (!nom) return showToast('Nom obligatoire', 'error');
    
    document.getElementById('btn-modal-add').disabled = true;
    try {
      const res = await fetch('/api/enseignant/manuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ppr, nom, grade, cin })
      });
      if (res.ok) {
        fermerModaleAjout();
        showToast('Enseignant ajouté avec succès', 'success');
        rechercherEnseignant(); // Relancer la recherche pour afficher ses infos
      } else {
        const d = await res.json();
        showToast(d.error || 'Erreur', 'error');
      }
    } catch(err) {
      showToast('Erreur réseau', 'error');
    } finally {
      document.getElementById('btn-modal-add').disabled = false;
    }
  }

  // ── Édition Enseignant ──`;

html = html.replace('  // ── Édition Enseignant ──', modalScripts);

fs.writeFileSync('public/directeur.html', html);
console.log('Patched directeur.html frontend logic successfully');
