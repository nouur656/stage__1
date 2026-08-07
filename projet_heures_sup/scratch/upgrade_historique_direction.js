const fs = require('fs');

function modifyDirection() {
  let html = fs.readFileSync('public/direction.html', 'utf8');

  // Add styles
  const styleAppend = `
    .nav-tabs { display: flex; gap: 10px; margin-left: 30px; }
    .nav-tab { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color:white; padding:8px 16px; border-radius:8px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:6px; transition:all 0.2s;}
    .nav-tab.active { background: white; color: var(--navy); border-color:white; }
    .nav-tab:hover:not(.active) { background: rgba(255,255,255,0.2); }
    .historique-table-container { margin-bottom: 30px; background:white; border-radius:12px; border:1px solid var(--border); box-shadow: 0 4px 10px rgba(0,0,0,0.03); overflow:hidden;}
    .historique-table-header { background: #f8fafc; padding:12px 20px; border-bottom:1px solid var(--border); font-weight:700; color:var(--navy); font-size:1.05rem; display:flex; justify-content:space-between; align-items:center; }
    .historique-table-header span { font-size: 0.85rem; color: var(--muted); font-weight: normal; }
    .filter-group { display: flex; flex-direction: column; gap:4px; margin-right: 15px;}
  `;
  html = html.replace('</style>', styleAppend + '</style>');

  // Modify Navbar
  const navAdd = `
    <div class="nav-tabs">
      <button id="tab-saisie" class="nav-tab active" onclick="switchPage('saisie')">📊 Consolidation actuelle</button>
      <button id="tab-historique" class="nav-tab" onclick="switchPage('historique')">📚 Historique global</button>
    </div>
  `;
  html = html.replace('<div class="navbar-right">', navAdd + '\n    <div class="navbar-right">');

  // Wrap main layout
  html = html.replace('<div class="main-wrap">', '<div id="page-saisie" style="display:block;">\n<div class="main-wrap">');
  // Find the end before </div> <!-- END of page-saisie -->
  // There is a <div class="toast" id="toast"></div> at the end, so I can wrap before it.
  html = html.replace('<!-- Toast -->', '</div>\n<!-- Toast -->');

  // Historique Page HTML
  const histPageHTML = `
  <!-- ── PAGE HISTORIQUE ── -->
  <div id="page-historique" style="display:none; padding:20px; max-width:1400px; margin:0 auto;">
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header">
        <div class="card-header-left">
          <span class="icon">🔍</span>
          <h2>Filtres d'historique (Toutes écoles)</h2>
        </div>
        <div>
          <button class="btn-export" style="background:#f0f4f9; color:var(--navy); border:1px solid var(--border);" onclick="resetHistFilters()">🔄 Réinitialiser</button>
        </div>
      </div>
      <div class="card-body" style="display:flex; flex-wrap:wrap; gap:20px; align-items:flex-end;">
        <div class="filter-group">
          <label style="font-size:0.8rem; font-weight:600; color:var(--navy);">Mois visé (Les heures travaillées)</label>
          <select id="hist-mois" style="padding:8px 12px; border:1px solid var(--border); border-radius:8px; outline:none; background:#f8fafc;" onchange="loadHistoriquePage()">
            <option value="">Tous les mois</option>
            <option>Janvier 2026</option>
            <option>Février 2026</option>
            <option>Mars 2026</option>
            <option>Avril 2026</option>
            <option>Mai 2026</option>
            <option>Juin 2026</option>
            <option>Juillet 2026</option>
            <option>Août 2026</option>
            <option>Septembre 2026</option>
            <option>Octobre 2026</option>
            <option>Novembre 2026</option>
            <option>Décembre 2026</option>
          </select>
        </div>
        <div class="filter-group">
          <label style="font-size:0.8rem; font-weight:600; color:var(--navy);">Date de saisie (Date d'enregistrement)</label>
          <input type="date" id="hist-date" style="padding:8px 12px; border:1px solid var(--border); border-radius:8px; outline:none; background:#f8fafc;" onchange="loadHistoriquePage()" title="Trouver les saisies effectuées exactement à cette date" />
        </div>
      </div>
    </div>

    <div id="historique-tables-container">
      <div class="empty-state"><p>Chargement...</p></div>
    </div>
  </div>
  `;
  html = html.replace('<!-- Toast -->', histPageHTML + '\n<!-- Toast -->');

  // Remove the old 'Historique mensuel' chart from the main page
  html = html.replace(/<!-- ── HISTORIQUE MENSUEL ── -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, '');

  const histJS = `
    const fmtN = n => Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function switchPage(page) {
      document.getElementById('page-saisie').style.display = page === 'saisie' ? 'block' : 'none';
      document.getElementById('page-historique').style.display = page === 'historique' ? 'block' : 'none';
      document.getElementById('tab-saisie').classList.toggle('active', page === 'saisie');
      document.getElementById('tab-historique').classList.toggle('active', page === 'historique');
      if (page === 'historique') {
        loadHistoriquePage();
      }
    }

    function resetHistFilters() {
      document.getElementById('hist-mois').value = '';
      document.getElementById('hist-date').value = '';
      loadHistoriquePage();
    }

    async function loadHistoriquePage() {
      const container = document.getElementById('historique-tables-container');
      container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--muted);"><span class="loading-spinner-inline"></span> Chargement des données...</div>';
      
      try {
        let url = '/api/direction/saisies';
        const res = await fetch(url);
        let data = await res.json();
        
        // Frontend filters
        const filterMois = document.getElementById('hist-mois').value.trim();
        const filterDate = document.getElementById('hist-date').value;
        
        if (filterMois) {
          data = data.filter(r => (r.mois || '').trim() === filterMois);
        }
        if (filterDate) {
          data = data.filter(r => {
            if (!r.date_saisie) return false;
            const d = new Date(r.date_saisie);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return \`\${yyyy}-\${mm}-\${dd}\` === filterDate;
          });
        }

        if (data.length === 0) {
          container.innerHTML = '<div class="empty-state"><div class="icon">📁</div><p>Aucune saisie trouvée pour ces critères.</p></div>';
          return;
        }

        const grouped = {};
        data.forEach(r => {
          const m = r.mois || 'Non défini';
          if (!grouped[m]) grouped[m] = [];
          grouped[m].push(r);
        });

        const monthKeys = Object.keys(grouped).reverse();
        
        let htmlContent = '';
        
        monthKeys.forEach(m => {
          const rows = grouped[m];
          const totalNet = rows.reduce((a, r) => a + Number(r.montant_net), 0);
          
          htmlContent += \`
          <div class="historique-table-container">
            <div class="historique-table-header">
              <div>🗓️ \${m}</div>
              <span>\${rows.length} saisie(s) | Total Net: <strong style="color:var(--green);">\${fmtN(totalNet)} DH</strong></span>
            </div>
            <div class="table-wrap" style="padding:0; box-shadow:none; border:none; border-radius:0;">
            <table style="width:100%; border-collapse:collapse; margin:0;" id="saisies-table">
              <thead>
                <tr>
                  <th style="width: 30px;">N°</th>
                  <th style="width: 70px;">Cycle</th>
                  <th style="width: 140px;">Établissement</th>
                  <th style="width: 130px;">Nom & Prénom</th>
                  <th style="width: 120px;">Grade</th>
                  <th>S.O.M</th>
                  <th>Nbre H</th>
                  <th>Taux</th>
                  <th class="th-fin">Montant Brut</th>
                  <th class="th-fin">Taux IR</th>
                  <th class="th-fin">Prélèv. IR</th>
                  <th class="th-fin">Montant Net</th>
                  <th style="width: 110px;">Affectation</th>
                  <th>C.I.N</th>
                  <th style="width: 100px;">RIB</th>
                  <th style="width: 70px;">Statut</th>
                </tr>
              </thead>
              <tbody>
          \`;
          
          rows.forEach((r, i) => {
            const cycleCls = (r.cycle || '').toUpperCase();
            htmlContent += \`
              <tr>
                <td data-label="N°">\${i + 1}</td>
                <td data-label="Cycle"><span class="cycle-badge \${cycleCls}">\${r.cycle || '—'}</span></td>
                <td data-label="Établissement" style="text-align:left; font-size:0.72rem">\${r.nom_etablissement || r.code_etablissement || '—'}</td>
                <td data-label="Nom & Prénom" style="text-align:left;"><span class="truncate-nom" title="\${r.nom || ''}">\${r.nom || '—'}</span></td>
                <td data-label="Grade" style="text-align:left;"><span class="truncate-grade" title="\${r.grade || ''}">\${r.grade || '—'}</span></td>
                <td data-label="S.O.M">\${r.ppr || '—'}</td>
                <td data-label="Nbre Heures"><strong>\${r.nombre_heures}</strong></td>
                <td data-label="Taux Hor.">\${r.taux_horaire} DH</td>
                <td data-label="Montant Brut" class="col-fin"><strong>\${fmtN(r.montant_brut)} DH</strong></td>
                <td data-label="Taux IR" class="col-fin">\${r.taux_ir} %</td>
                <td data-label="Prélèvement" class="col-fin" style="color:var(--error)">\${fmtN(r.prelevement_ir)} DH</td>
                <td data-label="Montant Net" class="col-fin" style="color:var(--green); font-weight:700">\${fmtN(r.montant_net)} DH</td>
                <td data-label="Affectation" style="text-align:left; font-size:0.72rem">\${r.affectation || '—'}</td>
                <td data-label="C.I.N">\${r.cin || '—'}</td>
                <td data-label="RIB"><span class="truncate-rib" title="\${r.rib || ''}">\${r.rib || '—'}</span></td>
                <td data-label="Statut"><span class="badge-validated \${r.valide_par_direction ? 'yes' : 'no'}">\${r.valide_par_direction ? '✓ Validé' : 'En attente'}</span></td>
              </tr>
            \`;
          });
          
          htmlContent += \`</tbody></table></div></div>\`;
        });
        
        container.innerHTML = htmlContent;
      } catch (err) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--error);">Erreur lors du chargement.</div>';
      }
    }
  `;

  html = html.replace('// ── Historique Mensuel ────────────────────────────────────────────────────', histJS + '\n// ── Historique Mensuel OBSOLETE ────────────────────────────────────────────────────');

  // Remove the old chargerHistorique function entirely
  html = html.replace(/async function chargerHistorique\(\) \{[\s\S]*?\}\s*\n/g, ''); 
  html = html.replace('chargerHistorique();', ''); 

  fs.writeFileSync('public/direction.html', html, 'utf8');
}

modifyDirection();
console.log('direction modified successfully');
