const fs = require('fs');

let html = fs.readFileSync('public/directeur.html', 'utf8');

// 1. Add CSS rules
const cssToAdd = `
    /* ── Table Improvements ── */
    thead th {
      background: var(--navy);
      color: white;
      padding: 12px 6px;
      text-align: center;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .th-fin { background: #2A4560 !important; color: #E7EEF8 !important; border-bottom: 2px solid #5DA271; }
    .col-fin { background: #FAFBFC; }
    
    .truncate-rib {
      max-width: 90px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
      vertical-align: middle;
      font-family: monospace;
    }
    .truncate-grade {
      max-width: 110px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      white-space: normal;
      font-size: 0.7rem;
    }
    .truncate-nom {
      max-width: 130px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-block;
      vertical-align: middle;
      font-weight: 600;
    }

    @media (max-width: 1100px) {
      #saisies-table, #saisies-table thead, #saisies-table tbody, #saisies-table th, #saisies-table td, #saisies-table tr {
        display: block;
        width: 100%;
      }
      #saisies-table thead { display: none; }
      #saisies-table tr {
        margin-bottom: 16px;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 6px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.03);
      }
      #saisies-table td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f0f4f9;
        padding: 8px 10px;
        text-align: right !important;
        font-size: 0.85rem;
      }
      #saisies-table td:last-child {
        border-bottom: none;
        justify-content: center;
        background: #f8fafc;
        border-radius: 8px;
        margin-top: 5px;
      }
      #saisies-table td::before {
        content: attr(data-label);
        font-weight: 600;
        color: var(--muted);
        font-size: 0.75rem;
        text-align: left;
        margin-right: 12px;
        text-transform: uppercase;
      }
      .col-fin { background: transparent; }
      .truncate-rib, .truncate-grade, .truncate-nom {
        max-width: none;
        white-space: normal;
        display: block;
      }
    }
`;

// Replace `thead th {` ... `}` block in css
html = html.replace(/thead th \{[\s\S]*?position: sticky;\s*top: 0;\s*\}/, cssToAdd);

// 2. Modify TH headers
const thOld = `                <th>N°</th>
                <th>Nom & Prénom</th>
                <th>Grade</th>
                <th>S.O.M</th>
                <th>Nbre H</th>
                <th>Taux</th>
                <th>Montant Brut</th>
                <th>Affectation</th>
                <th>C.I.N</th>
                <th>Taux IR %</th>
                <th>Prélèv. IR</th>
                <th>Montant Net</th>
                <th>RIB</th>
                <th>Mois</th>
                <th>Validé</th>
                <th>Action</th>`;

const thNew = `                <th style="width: 30px;">N°</th>
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
                <th style="width: 80px;">Mois</th>
                <th style="width: 70px;">Statut</th>
                <th style="width: 140px;">Action</th>`;

html = html.replace(thOld, thNew);

// 3. Modify JS row generation
const rowOld = `        <tr>
          <td>\${i + 1}</td>
          <td style="text-align:left; font-weight:500">\${r.nom || '—'}</td>
          <td style="text-align:left; font-size:0.72rem">\${r.grade || '—'}</td>
          <td>\${r.ppr || '—'}</td>
          <td><strong>\${r.nombre_heures}</strong></td>
          <td>\${r.taux_horaire} DH</td>
          <td><strong>\${fmt(r.montant_brut)} DH</strong></td>
          <td style="text-align:left; font-size:0.75rem">\${r.affectation || '—'}</td>
          <td>\${r.cin || '—'}</td>
          <td>\${r.taux_ir} %</td>
          <td style="color:var(--error)">\${fmt(r.prelevement_ir)} DH</td>
          <td style="color:var(--green); font-weight:700">\${fmt(r.montant_net)} DH</td>
          <td style="font-size:0.72rem; font-family:monospace">\${r.rib || '—'}</td>
          <td style="font-size:0.75rem">\${r.mois || '—'}</td>
          <td><span class="badge-validated \${r.valide_par_direction ? 'yes' : 'no'}">\${r.valide_par_direction ? '✓ Validé' : 'En attente'}</span></td>
          <td style="white-space:nowrap; text-align:center;">
            <button style="background:none; border:1px solid #F0CECE; color:#D32F2F; border-radius:6px; cursor:pointer; padding:3px 8px; font-size:0.75rem; margin-right:4px;" onclick="supprimerSaisie(\${r.id})">Suppr.</button>
            <button style="background:none; border:1px solid #B4D3FF; color:#1B4F8A; border-radius:6px; cursor:pointer; padding:3px 8px; font-size:0.75rem;" onclick="telechargerEtat(\${r.id})" title="Télécharger l'état individuel">📄 Document</button>
          </td>
        </tr>`;

const rowNew = `        <tr>
          <td data-label="N°">\${i + 1}</td>
          <td data-label="Nom & Prénom" style="text-align:left;"><span class="truncate-nom" title="\${r.nom || ''}">\${r.nom || '—'}</span></td>
          <td data-label="Grade" style="text-align:left;"><span class="truncate-grade" title="\${r.grade || ''}">\${r.grade || '—'}</span></td>
          <td data-label="S.O.M">\${r.ppr || '—'}</td>
          <td data-label="Nbre Heures"><strong>\${r.nombre_heures}</strong></td>
          <td data-label="Taux Hor.">\${r.taux_horaire} DH</td>
          <td data-label="Montant Brut" class="col-fin"><strong>\${fmt(r.montant_brut)} DH</strong></td>
          <td data-label="Taux IR" class="col-fin">\${r.taux_ir} %</td>
          <td data-label="Prélèvement" class="col-fin" style="color:var(--error)">\${fmt(r.prelevement_ir)} DH</td>
          <td data-label="Montant Net" class="col-fin" style="color:var(--green); font-weight:700">\${fmt(r.montant_net)} DH</td>
          <td data-label="Affectation" style="text-align:left; font-size:0.72rem">\${r.affectation || '—'}</td>
          <td data-label="C.I.N">\${r.cin || '—'}</td>
          <td data-label="RIB"><span class="truncate-rib" title="\${r.rib || ''}">\${r.rib || '—'}</span></td>
          <td data-label="Mois" style="font-size:0.75rem">\${r.mois || '—'}</td>
          <td data-label="Statut"><span class="badge-validated \${r.valide_par_direction ? 'yes' : 'no'}">\${r.valide_par_direction ? '✓ Validé' : 'En attente'}</span></td>
          <td data-label="Action" style="white-space:nowrap; text-align:center;">
            <button style="background:none; border:1px solid #F0CECE; color:#D32F2F; border-radius:6px; cursor:pointer; padding:3px 8px; font-size:0.75rem; margin-right:4px;" onclick="supprimerSaisie(\${r.id})">Suppr.</button>
            <button style="background:none; border:1px solid #B4D3FF; color:#1B4F8A; border-radius:6px; cursor:pointer; padding:3px 8px; font-size:0.75rem;" onclick="telechargerEtat(\${r.id})" title="Télécharger l'état individuel">📄 Document</button>
          </td>
        </tr>`;

html = html.replace(rowOld, rowNew);

fs.writeFileSync('public/directeur.html', html);
console.log('Patched directeur.html successfully!');
