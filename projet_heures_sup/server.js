'use strict';

const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const XlsxPopulate = require('xlsx-populate');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Database Pool ──────────────────────────────────────────────
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'Postgres2026Secure',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'heures_supplementaires',
});

// â”€â”€â”€ Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'heures_sup_dpTangerAssilah_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 hours
}));

// â”€â”€â”€ Auth Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: 'Non authentifié' });
}

function requireDirecteur(req, res, next) {
  if (req.session?.user?.role === 'directeur') return next();
  return res.status(403).json({ error: 'Accès refusé' });
}

function requireDirection(req, res, next) {
  if (req.session?.user?.role === 'direction') return next();
  return res.status(403).json({ error: 'Accès refusé' });
}

// â”€â”€â”€ Helper: taux_horaire by cycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getTauxHoraire(cycle) {
  return cycle === 'LYCEE' ? 218 : 159;
}

// Ignore empty or "Tous …" sentinel values in dashboard/export filters
function isActiveFilter(value) {
  if (value == null) return false;
  const v = String(value).trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  if (lower === 'tous' || lower === 'all') return false;
  if (lower.startsWith('tous les') || lower.startsWith('toutes les')) return false;
  return true;
}

function normalizeCycleFilter(cycle) {
  if (String(cycle).trim().toUpperCase() === 'TOUS') return 'TOUS'; // Enable TOUS globally
  if (!isActiveFilter(cycle)) return null;
  const upper = String(cycle).trim().toUpperCase();
  if (upper.includes('PRI')) return 'PRIMAIRE';
  if (upper.includes('COL')) return 'COLLEGE';
  if (upper.includes('LYC')) return 'LYCEE';
  return upper;
}

function resolveModelCycleKey(cycle) {
  const normalized = normalizeCycleFilter(cycle) || 'PRIMAIRE';
  if (normalized === 'TOUS') return 'TOUS';
  if (normalized.includes('PRI')) return 'PRI';
  if (normalized.includes('COL')) return 'COLLEGE';
  if (normalized.includes('LYC')) return 'LYCEE';
  return 'PRI';
}

function getOfficialModelPath(modelCycleKey) {
  // Use PRI template for TOUS as a structural base as requested
  if (modelCycleKey === 'TOUS')  return path.join(__dirname, '1+2+3+4 PRI.xlsx');
  if (modelCycleKey === 'LYCEE') return path.join(__dirname, '1+2+3+4 LYCEE.xlsx');
  if (modelCycleKey === 'COLLEGE') return path.join(__dirname, '1+2+3+4 COLLEGE.xlsx');
  return path.join(__dirname, '1+2+3+4 PRI.xlsx');
}

function nombreEnLettres(n) {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  function below100(x) {
    if (x < 20) return units[x];
    const t = Math.floor(x / 10);
    const u = x % 10;
    if (t === 7) return tens[t] + (u === 1 ? '-et-' : '-') + units[10 + u];
    if (t === 9) return tens[t] + (u > 0 ? '-' + units[10 + u] : 's');
    return tens[t] + (u === 1 && t !== 8 ? '-et-un' : u > 0 ? '-' + units[u] : (t === 8 ? 's' : ''));
  }
  function below1000(x) {
    if (x < 100) return below100(x);
    const h = Math.floor(x / 100);
    const r = x % 100;
    return (h === 1 ? 'cent' : units[h] + ' cent') + (r > 0 ? '-' + below100(r) : (h > 1 ? 's' : ''));
  }
  const num = Math.round(n);
  const cents = Math.round((n - num) * 100);
  if (num === 0) return 'Zéro dirham';
  let str = '';
  if (num >= 1000) {
    const k = Math.floor(num / 1000);
    str += (k === 1 ? 'mille' : below1000(k) + ' mille') + ' ';
  }
  const rem = num % 1000;
  if (rem > 0) str += below1000(rem);
  str = str.trim() + ' dirham' + (num > 1 ? 's' : '');
  if (cents > 0) str += ' et ' + below100(cents) + ' centime' + (cents > 1 ? 's' : '');
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function fetchExportRows(user, { mois, cycle, etablissement }) {
  const filterMois = isActiveFilter(mois) ? String(mois).trim() : null;
  const filterEtab = isActiveFilter(etablissement) ? String(etablissement).trim() : null;
  const filterCycle = user.role === 'directeur'
    ? (normalizeCycleFilter(cycle) || normalizeCycleFilter(user.cycle))
    : normalizeCycleFilter(cycle);

  let query = `
    SELECT
      sh.id,
      sh.ppr_enseignant as ppr,
      sh.nombre_heures,
      sh.taux_horaire,
      sh.montant_brut,
      sh.taux_ir,
      sh.prelevement_ir,
      sh.montant_net,
      sh.rib,
      sh.mois,
      sh.code_etablissement,
      COALESCE(p."NOML", pm.nom_prenom) as nom,
      COALESCE(p."LL_GRADE", pm.grade) as grade,
      COALESCE(p."CIN", pm.cin) as cin,
      COALESCE(p."NOM_ETABL", pm.affectation) as affectation_personnel,
      e."اسم المؤسسة" as nom_etablissement,
      COALESCE(e_affectation.cycle, e.cycle) as cycle
    FROM saisies_heures sh
    LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
    LEFT JOIN personnel_manuel pm ON pm.ppr = sh.ppr_enseignant
    LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
    LEFT JOIN etablissements e_affectation ON e_affectation."رمز المؤسسة" = p."CD_ETAB"
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (user.role === 'directeur') {
    query += ` AND sh.code_etablissement = $${idx++}`;
    params.push(user.code_etablissement);
  }
  if (filterMois) {
    query += ` AND sh.mois = $${idx++}`;
    params.push(filterMois);
  }
  if (filterCycle && filterCycle !== 'TOUS') {
    if (user.role !== 'directeur') {
      // Direction provinciale filtering by Cycle -> filter by the cycle of the establishment where overtime occurred.
      query += ` AND UPPER(e.cycle) = $${idx++}`;
      params.push(filterCycle);
    }
  }
  if (filterEtab) {
    query += ` AND sh.code_etablissement = $${idx++}`;
    params.push(filterEtab);
  }

  query += ` ORDER BY COALESCE(e_affectation.cycle, e.cycle), sh.code_etablissement, sh.date_saisie ASC`;
  const result = await pool.query(query, params);
  return { rows: result.rows, filterCycle };
}

async function buildOfficialExportBuffer(rows, { modelCycleKey }) {
  const modelFile = getOfficialModelPath(modelCycleKey);
  if (!fs.existsSync(modelFile)) {
    throw new Error('Fichier modèle introuvable');
  }

  const workbook = await XlsxPopulate.fromFileAsync(modelFile);
  const wsListe = workbook.sheet('Liste de suivi');
  if (!wsListe) {
    throw new Error('Feuille Liste de suivi introuvable');
  }

  for (let r = 14; r <= 200; r++) {
    for (let c = 1; c <= 14; c++) {
      wsListe.row(r).cell(c).value(undefined);
    }
  }

  const tCount = rows.length;
  const allIds = rows.map(r => r.id);
  const daysRes = allIds.length
    ? await pool.query(
        `SELECT saisie_id, jour, heures FROM saisies_heures_jours WHERE saisie_id = ANY($1)`,
        [allIds]
      )
    : { rows: [] };

  const monthCols = {
    Janvier: 2, Février: 3, Mars: 4, Avril: 5,
    Mai: 6, Juin: 7, Juillet: 8, Août: 9, Septembre: 10, Octobre: 11, Novembre: 12, Décembre: 13,
  };
  const rowJours = {
    LUNDI: 24, MARDI: 25, MERCREDI: 26,
    JEUDI: 27, VENDREDI: 28, SAMEDI: 29,
  };

  for (let i = 0; i < tCount; i++) {
    const rowNum = 14 + i;
    const s = rows[i];

    // Compute the correct month column for THIS specific saisie
    const thisDbMois = (s.mois || '').split(' ')[0];
    const colMois = monthCols[thisDbMois] || 2;

    wsListe.row(rowNum).cell(1).value(i + 1);
    wsListe.row(rowNum).cell(2).value(s.nom || '');
    wsListe.row(rowNum).cell(3).value(s.grade || '');
    wsListe.row(rowNum).cell(4).value(s.ppr || '');
    wsListe.row(rowNum).cell(5).value('');
    wsListe.row(rowNum).cell(6).value(Number(s.nombre_heures));
    wsListe.row(rowNum).cell(7).value(Number(s.taux_horaire));
    wsListe.row(rowNum).cell(8).value(Number(s.montant_brut));
    wsListe.row(rowNum).cell(9).value(s.affectation_personnel || s.nom_etablissement || '');
    wsListe.row(rowNum).cell(10).value(s.cin || '');
    wsListe.row(rowNum).cell(11).value(Number(s.taux_ir) / 100);
    wsListe.row(rowNum).cell(12).value(Number(s.prelevement_ir));
    wsListe.row(rowNum).cell(13).value(Number(s.montant_net));
    wsListe.row(rowNum).cell(14).value(s.rib || '');
    
    // Add Cycle to column 15 to differentiate teachers visually in the consolidated list
    if (s.cycle) {
      wsListe.row(13).cell(15).value('CYCLE');
      wsListe.row(13).cell(15).style('bold', true);
      wsListe.row(rowNum).cell(15).value(s.cycle);
    }

    const sheetNameRaw = '(' + (i + 1) + ')';
    let wsIndiv = workbook.sheet(sheetNameRaw);
    if (!wsIndiv) {
      if (workbook.sheet((i + 1).toString())) {
        wsIndiv = workbook.sheet((i + 1).toString());
      } else {
        const templateSheet = workbook.sheet('(1)');
        if (templateSheet) {
          workbook.cloneSheet(templateSheet, sheetNameRaw);
          wsIndiv = workbook.sheet(sheetNameRaw);
        }
      }
    }

    if (wsIndiv) {
      const fill = (row, col, value) => {
        wsIndiv.row(row).cell(col).value(value);
      };

      fill(1, 9, `N° ${s.id}`);
      fill(14, 3, s.nom || '');
      fill(14, 9, s.ppr || '');
      fill(16, 2, s.grade || '');
      fill(18, 2, s.nom_etablissement || s.affectation_personnel || '');
      fill(18, 9, s.cin || '');

      Object.keys(rowJours).forEach(jour => {
        Object.values(monthCols).forEach(col => {
          wsIndiv.row(rowJours[jour]).cell(col).value(undefined);
        });
      });

      const sDays = daysRes.rows.filter(d => d.saisie_id === s.id);
      const jDict = {};
      sDays.forEach(r => { jDict[r.jour.toUpperCase()] = Number(r.heures); });

      Object.keys(rowJours).forEach(jour => {
        if (jDict[jour]) fill(rowJours[jour], colMois, jDict[jour]);
      });

      fill(32, 4, Number(s.nombre_heures));
      fill(32, 6, Number(s.taux_horaire));
      fill(32, 8, Number(s.montant_brut));
      fill(32, 9, Number(s.montant_brut));
      fill(34, 4, nombreEnLettres(Number(s.montant_brut)));
      fill(45, 2, Number(s.montant_brut));
      fill(45, 3, Number(s.montant_brut));
      fill(47, 2, Number(s.taux_ir) / 100);
      fill(47, 5, Number(s.prelevement_ir));
      fill(47, 6, Number(s.prelevement_ir));
      fill(47, 8, Number(s.montant_net));
      fill(47, 9, Number(s.montant_net));
      fill(49, 5, nombreEnLettres(Number(s.montant_net)));
    }
  }

  return workbook.outputAsync();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  AUTH ROUTES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// POST /api/login/directeur â€” authenticate using GRESA code
app.post('/api/login/directeur', async (req, res) => {
  const { code_etablissement, password } = req.body;
  if (!code_etablissement || !password) return res.status(400).json({ error: 'Code et mot de passe requis' });

  try {
    const result = await pool.query(
      `SELECT "رمز المؤسسة" as code, "اسم المؤسسة" as nom, "المدير" as directeur, cycle, mot_de_passe
       FROM etablissements
       WHERE UPPER(TRIM("رمز المؤسسة")) = UPPER(TRIM($1))`,
      [code_etablissement]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Code établissement introuvable.' });
    }
    
    // Check password using bcrypt
    const match = await bcrypt.compare(password, result.rows[0].mot_de_passe);
    if (!match) {
       return res.status(401).json({ error: 'Mot de passe incorrect.' });
    }

    const etab = result.rows[0];
    req.session.user = {
      role: 'directeur',
      code_etablissement: etab.code,
      nom_etablissement: etab.nom,
      directeur: etab.directeur,
      cycle: etab.cycle,
      taux_horaire: getTauxHoraire(etab.cycle),
    };

    return res.json({
      success: true,
      code: etab.code,
      nom: etab.nom,
      directeur: etab.directeur,
      cycle: etab.cycle,
    });
  } catch (err) {
    console.error('Login directeur error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/login/direction
app.post('/api/login/direction', (req, res) => {
  const { username, password } = req.body;
  // Credentials for the provincial direction (change these in production)
  const ADMIN_USER = 'direction_tanger';
  const ADMIN_PASS = 'DP@TangerAssilah2026';

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.user = { role: 'direction', username };
    return res.json({ success: true });
  }
  return res.status(401).json({ error: 'Identifiants incorrects' });
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/me â€” return current session info
app.get('/api/me', requireAuth, (req, res) => {
  res.json(req.session.user);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  DIRECTEUR ROUTES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/enseignant/:ppr -- lookup teacher by PPR (personnel + personnel_manuel + rib)
app.get('/api/enseignant/:ppr', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr } = req.params;
  try {
    // 1. Check official table first
    let result = await pool.query(
      'SELECT "PPR"::text as ppr, "NOML" as nom, "LL_GRADE" as grade, "CIN" as cin, "NOM_ETABL" as affectation, "CD_ETAB" as cd_etab FROM personnel WHERE "PPR"::text = $1',
      [ppr.trim()]
    );

    // 2. If not found, check manual table
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT ppr, nom_prenom as nom, grade, cin, affectation FROM personnel_manuel WHERE ppr = $1',
        [ppr.trim()]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aucun enseignant trouv\u00e9 avec ce num\u00e9ro S.O.M' });
    }

    const teacher = result.rows[0];

    // 3. Fetch saved RIB if exists
    const ribResult = await pool.query(
      'SELECT rib FROM rib_enseignants WHERE ppr = $1',
      [ppr.trim()]
    );
    if (ribResult.rows.length > 0) {
      teacher.rib = ribResult.rows[0].rib;
    }

    return res.json(teacher);
  } catch (err) {
    console.error('Lookup enseignant error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/enseignant/manuel â€” add teacher to manual database
app.post('/api/enseignant/manuel', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr, nom, grade, cin } = req.body;
  const { code_etablissement } = req.session.user;

  if (!ppr || !nom) return res.status(400).json({ error: 'S.O.M et Nom requis' });

  try {
    await pool.query(
      `INSERT INTO personnel_manuel (ppr, nom_prenom, grade, cin, affectation, ajoute_par_etablissement)
       VALUES ($1, $2, $3, $4, $5, $5)
       ON CONFLICT (ppr) DO UPDATE 
       SET nom_prenom = EXCLUDED.nom_prenom, grade = EXCLUDED.grade, cin = EXCLUDED.cin, affectation = EXCLUDED.affectation, ajoute_par_etablissement = EXCLUDED.ajoute_par_etablissement, date_ajout = NOW()`,
      [ppr.trim(), nom.trim(), grade?.trim() || null, cin?.trim() || null, code_etablissement]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Insert personnel_manuel error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\'ajout' });
  }
});

// PATCH /api/enseignant/:ppr â€” correct teacher data (nom, grade, cin, affectation)
app.patch('/api/enseignant/:ppr', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr } = req.params;
  const { nom, grade, cin, affectation } = req.body;

  if (!nom || !nom.trim()) {
    return res.status(400).json({ error: 'Le nom est obligatoire' });
  }

  try {
    const result = await pool.query(
      `UPDATE personnel
       SET "NOML" = $1, "LL_GRADE" = $2, "CIN" = $3, "NOM_ETABL" = $4
       WHERE "PPR"::text = $5
       RETURNING "PPR"::text as ppr`,
      [nom.trim(), grade?.trim() || null, cin?.trim() || null, affectation?.trim() || null, ppr.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enseignant introuvable' });
    }
    return res.json({ success: true, message: 'Informations mises à  jour avec succès' });
  } catch (err) {
    console.error('Update enseignant error:', err);
    return res.status(500).json({ error: 'Erreur lors de la mise à  jour' });
  }
});

// POST /api/saisies â€” insert a new entry
app.post('/api/saisies', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr_enseignant, mois, jours, taux_ir, rib } = req.body;
  const { code_etablissement, taux_horaire } = req.session.user;

  // Validate taux_ir
  const tauxAllowed = [30, 34, 37];
  if (!tauxAllowed.includes(Number(taux_ir))) {
    return res.status(400).json({ error: 'Taux IR doit être 30, 34 ou 37' });
  }

  const joursValides = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  let totalHeures = 0;
  if (!jours || typeof jours !== 'object') {
    return res.status(400).json({ error: 'Jours manquants' });
  }
  for (const j of joursValides) {
    if (jours[j]) totalHeures += Number(jours[j]);
  }
  if (totalHeures <= 0) {
    return res.status(400).json({ error: 'Veuillez saisir au moins des heures' });
  }

  // Verify the PPR exists in personnel
  try {
    const check = await pool.query(
      `SELECT 1 FROM personnel WHERE "PPR"::text = $1
       UNION
       SELECT 1 FROM personnel_manuel WHERE ppr = $1`,
      [ppr_enseignant.trim()]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Enseignant (PPR) introuvable dans la base' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erreur vérification enseignant' });
  }

  try {
    await pool.query('BEGIN');
    const result = await pool.query(
      `INSERT INTO saisies_heures
         (code_etablissement, ppr_enseignant, mois, nombre_heures, taux_ir, rib, taux_horaire)
       VALUES ($1, $2, $3, 0, $4, $5, $6)
       RETURNING id`,
      [code_etablissement, ppr_enseignant.trim(), mois, taux_ir, rib || null, taux_horaire]
    );
    const saisieId = result.rows[0].id;

    for (const j of joursValides) {
      if (jours[j] && Number(jours[j]) > 0) {
        await pool.query(
          'INSERT INTO saisies_heures_jours (saisie_id, jour, heures) VALUES ($1, $2, $3)',
          [saisieId, j.toUpperCase(), Number(jours[j])]
        );
      }
    }

    if (rib && rib.trim() !== '') {
      await pool.query(
        `INSERT INTO rib_enseignants (ppr, rib, date_maj)
         VALUES ($1, $2, NOW())
         ON CONFLICT (ppr) DO UPDATE SET rib = EXCLUDED.rib, date_maj = NOW()`,
        [ppr_enseignant.trim(), rib.trim()]
      );
    }

    await pool.query('COMMIT');
    
    // Retrieve data to return
    const sel = await pool.query('SELECT id, montant_brut, prelevement_ir, montant_net FROM saisies_heures WHERE id=$1',[saisieId]);

    return res.json({ success: true, data: sel.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Insert saisie error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

// GET /api/saisies — get saisies for the logged-in directeur, with optional month filter
app.get('/api/saisies', requireAuth, requireDirecteur, async (req, res) => {
  const { code_etablissement } = req.session.user;
  const { mois } = req.query;

  try {
    let query = `
      SELECT
        sh.id,
        p."NOML" as nom,
        p."LL_GRADE" as grade,
        sh.ppr_enseignant as ppr,
        sh.nombre_heures,
        sh.taux_horaire,
        sh.montant_brut,
        p."NOM_ETABL" as affectation,
        p."CIN" as cin,
        sh.taux_ir,
        sh.prelevement_ir,
        sh.montant_net,
        sh.rib,
        sh.mois,
        sh.date_saisie,
        sh.valide_par_direction
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      WHERE sh.code_etablissement = $1
    `;
    const params = [code_etablissement];

    if (mois) {
      query += ` AND sh.mois = $2`;
      params.push(mois);
    }
    query += ` ORDER BY sh.date_saisie DESC`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get saisies error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/saisies/:id â€” delete a saisie (only if belongs to the directeur's etab and not validated)
app.delete('/api/saisies/:id', requireAuth, requireDirecteur, async (req, res) => {
  const { id } = req.params;
  const { code_etablissement } = req.session.user;

  try {
    const result = await pool.query(
      `DELETE FROM saisies_heures
       WHERE id = $1 AND code_etablissement = $2 
       RETURNING id`,
      [id, code_etablissement]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saisie introuvable, déjà  validée, ou non autorisée' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete saisie error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  DIRECTION PROVINCIALE ROUTES
// GET /api/direction/stats â€” summary stats
app.get('/api/direction/stats', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_saisies,
        COUNT(DISTINCT code_etablissement) as total_etab,
        SUM(montant_brut) as total_brut,
        SUM(montant_net) as total_net,
        SUM(CASE WHEN valide_par_direction THEN 1 ELSE 0 END) as total_validees
      FROM saisies_heures
    `);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/direction/password â€” update an etablissement password
app.post('/api/direction/password', requireAuth, requireDirection, async (req, res) => {
  const { code_etablissement, new_password } = req.body;
  if (!code_etablissement || !new_password) {
    return res.status(400).json({ error: 'Code établissement et nouveau mot de passe requis' });
  }

  try {
    const hashedPassword = await bcrypt.hash(new_password, 10);
    const result = await pool.query(
      `UPDATE etablissements SET mot_de_passe = $1 WHERE "رمز المؤسسة" = $2 RETURNING "رمز المؤسسة" as code`,
      [hashedPassword, code_etablissement]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Établissement introuvable.' });
    }

    return res.json({ success: true, message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error('Update password error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/direction/etablissements â€” list all etablissements for filters
app.get('/api/direction/etablissements', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "رمز المؤسسة" as code, "اسم المؤسسة" as nom, cycle
       FROM etablissements
       ORDER BY cycle, nom`
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/direction/mois â€” distinct months that have entries
app.get('/api/direction/mois', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT mois FROM saisies_heures ORDER BY mois`
    );
    return res.json(result.rows.map(r => r.mois));
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});


// GET /api/direction/historique — monthly aggregated stats for Direction
app.get('/api/direction/historique', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        mois,
        COUNT(*) as nb_saisies,
        SUM(montant_brut)::numeric as total_brut,
        SUM(montant_net)::numeric as total_net,
        SUM(nombre_heures)::numeric as total_heures,
        SUM(CASE WHEN valide_par_direction THEN 1 ELSE 0 END) as nb_validees
      FROM saisies_heures
      GROUP BY mois
      ORDER BY mois
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error('Historique direction error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/saisies/historique — monthly aggregated stats for a Directeur
app.get('/api/saisies/historique', requireAuth, requireDirecteur, async (req, res) => {
  const { code_etablissement } = req.session.user;
  try {
    const result = await pool.query(`
      SELECT
        mois,
        COUNT(*) as nb_saisies,
        SUM(montant_brut)::numeric as total_brut,
        SUM(montant_net)::numeric as total_net,
        SUM(nombre_heures)::numeric as total_heures,
        SUM(CASE WHEN valide_par_direction THEN 1 ELSE 0 END) as nb_validees
      FROM saisies_heures
      WHERE code_etablissement = $1
      GROUP BY mois
      ORDER BY mois
    `, [code_etablissement]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Historique directeur error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/direction/saisies/vider â€” delete ALL saisies
app.delete('/api/direction/saisies/vider', requireAuth, requireDirection, async (req, res) => {
  try {
    await pool.query('BEGIN');
    // Ensure days are deleted first to avoid foreign key violations in case CASCADE is not set
    await pool.query('DELETE FROM saisies_heures_jours');
    await pool.query('DELETE FROM saisies_heures');
    await pool.query('COMMIT');
    return res.json({ success: true, message: 'Base de données vidée avec succès' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Erreur lors du vidage de la base:', err);
    return res.status(500).json({ error: 'Erreur serveur lors du vidage' });
  }
});

// DELETE /api/direction/saisies/vider-mois — delete saisies for a specific month
app.delete('/api/direction/saisies/vider-mois', requireAuth, requireDirection, async (req, res) => {
  const { mois } = req.query;
  if (!mois || !mois.trim()) {
    return res.status(400).json({ error: 'Le paramètre mois est requis' });
  }
  try {
    await pool.query('BEGIN');
    await pool.query(
      `DELETE FROM saisies_heures_jours WHERE saisie_id IN (SELECT id FROM saisies_heures WHERE mois = $1)`,
      [mois.trim()]
    );
    const result = await pool.query('DELETE FROM saisies_heures WHERE mois = $1', [mois.trim()]);
    await pool.query('COMMIT');
    return res.json({ success: true, deleted: result.rowCount, message: `${result.rowCount} saisie(s) supprimée(s) pour ${mois.trim()}` });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Erreur lors du vidage par mois:', err);
    return res.status(500).json({ error: 'Erreur serveur lors du vidage' });
  }
});


// PATCH /api/direction/saisies/:id/valider â€” mark a saisie as validated
app.patch('/api/direction/saisies/:id/valider', requireAuth, requireDirection, async (req, res) => {
  const { id } = req.params;
  const { valide } = req.body;
  try {
    await pool.query(
      `UPDATE saisies_heures SET valide_par_direction = $1 WHERE id = $2`,
      [!!valide, id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  à‰TAT INDIVIDUEL â€” "à‰tat des sommes dues" par saisie
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/saisies/:id/etat â€” generate individual "à‰tat des sommes dues" Excel doc
// Strategy: load the official model file, fill data into exact cells, send back
app.get('/api/saisies/:id/etat', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user = req.session.user;

  try {
    let query = `
      SELECT
        sh.id,
        sh.ppr_enseignant as ppr,
        sh.nombre_heures,
        sh.taux_horaire,
        sh.montant_brut,
        sh.taux_ir,
        sh.prelevement_ir,
        sh.montant_net,
        sh.mois,
        sh.code_etablissement,
        COALESCE(p."NOML", pm.nom_prenom) as nom,
        COALESCE(p."LL_GRADE", pm.grade) as grade,
        COALESCE(p."CIN", pm.cin) as cin,
        COALESCE(p."NOM_ETABL", pm.affectation) as affectation_personnel,
        e."اسم المؤسسة" as nom_etablissement,
        COALESCE(e_affectation.cycle, e.cycle) as cycle
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN personnel_manuel pm ON pm.ppr = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      LEFT JOIN etablissements e_affectation ON e_affectation."رمز المؤسسة" = p."CD_ETAB"
      WHERE sh.id = $1
    `;
    const params = [id];
    if (user.role === 'directeur') {
      query += ` AND sh.code_etablissement = $2`;
      params.push(user.code_etablissement);
    }
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Saisie introuvable' });
    const s = result.rows[0];

    // Fetch jours
    const daysQuery = `SELECT jour, heures FROM saisies_heures_jours WHERE saisie_id = $1`;
    const daysRes = await pool.query(daysQuery, [id]);
    const jDict = {};
    daysRes.rows.forEach(r => jDict[r.jour.toUpperCase()] = Number(r.heures));

    const cycle = (s.cycle || '').toUpperCase();
    const path = require('path');
    let modelFile = path.join(__dirname, '1+2+3+4 PRI.xlsx');
    if (cycle === 'LYCEE') modelFile = path.join(__dirname, '1+2+3+4 LYCEE.xlsx');
    else if (cycle === 'COLLEGE') modelFile = path.join(__dirname, '1+2+3+4 COLLEGE.xlsx');

    const fsModule = require('fs');
    if (!fsModule.existsSync(modelFile)) return res.status(500).json({ error: 'Fichier modèle introuvable' });

    const XlsxPopulate = require('xlsx-populate');
    const workbook = await XlsxPopulate.fromFileAsync(modelFile);

    function nombreEnLettres(n) {
      const units = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
      const tens  = ['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
      function below100(x) {
        if(x<20) return units[x];
        const t=Math.floor(x/10), u=x%10;
        if(t===7) return tens[t]+(u===1?'-et-':'-')+units[10+u];
        if(t===9) return tens[t]+(u>0?'-'+units[10+u]:'s');
        return tens[t]+(u===1&&t!==8?'-et-un':u>0?'-'+units[u]:(t===8?'s':''));
      }
      function below1000(x) {
        if(x<100) return below100(x);
        const h=Math.floor(x/100), r=x%100;
        return (h===1?'cent':units[h]+' cent')+(r>0?'-'+below100(r):(h>1?'s':''));
      }
      const num = Math.round(n);
      const cents = Math.round((n-num)*100);
      if(num===0) return 'Zéro dirham';
      let str='';
      if(num>=1000) { const k=Math.floor(num/1000); str+=(k===1?'mille':below1000(k)+' mille')+' '; }
      const rem=num%1000;
      if(rem>0) str+=below1000(rem);
      str=str.trim()+' dirham'+(num>1?'s':'');
      if(cents>0) str+=' et '+below100(cents)+' centime'+(cents>1?'s':'');
      return str.charAt(0).toUpperCase()+str.slice(1);
    }

    const monthCols = {
      'Janvier': 2, 'Février': 3, 'Mars': 4, 'Avril': 5,
      'Mai': 6, 'Juin': 7, 'Juillet': 8, 'Août': 9, 'Septembre': 10, 'Octobre': 11, 'Novembre': 12, 'Décembre': 13
    };
    const dbMois = s.mois.split(' ')[0];
    let colMois = monthCols[dbMois] || 2;
    
    const rowJours = {
      'LUNDI': 24, 'MARDI': 25, 'MERCREDI': 26,
      'JEUDI': 27, 'VENDREDI': 28, 'SAMEDI': 29
    };

    const sheetsToFill = ['(1)', '(2)', '(3)', '(4)'];
    sheetsToFill.forEach(sheetName => {
      const wsSheet = workbook.sheet(sheetName);
      if (!wsSheet) return;

      const fill = (row, col, value) => {
        wsSheet.row(row).cell(col).value(value);
      };

      fill(1, 9, `N° ${s.id}`);
      fill(14, 3, s.nom || '');
      fill(14, 9, s.ppr || '');
      fill(16, 2, s.grade || '');
      fill(18, 2, s.nom_etablissement || s.affectation_personnel || '');
      fill(18, 9, s.cin || '');
      
      // Clear out all sample data from the template for every day and every month
      Object.keys(rowJours).forEach(jour => {
        Object.values(monthCols).forEach(col => {
          wsSheet.row(rowJours[jour]).cell(col).value(undefined);
        });
      });
      
      // Inject the true Jours for the current month column
      Object.keys(rowJours).forEach(jour => {
        if (jDict[jour]) fill(rowJours[jour], colMois, jDict[jour]);
      });

      fill(32, 4, Number(s.nombre_heures));
      fill(32, 6, Number(s.taux_horaire));
      fill(32, 8, Number(s.montant_brut));
      fill(32, 9, Number(s.montant_brut));
      fill(34, 4, nombreEnLettres(Number(s.montant_brut)));
      fill(45, 2, Number(s.montant_brut));
      fill(45, 3, Number(s.montant_brut));
      fill(47, 2, Number(s.taux_ir)/100);
      fill(47, 5, Number(s.prelevement_ir));
      fill(47, 6, Number(s.prelevement_ir));
      fill(47, 8, Number(s.montant_net));
      fill(47, 9, Number(s.montant_net));
      fill(49, 5, nombreEnLettres(Number(s.montant_net)));
    });

    const nomSafe = (s.nom || 'enseignant').replace(/[^\w\u00C0-\u024F]/g, '_').substring(0, 30);
    const filename = `etat_${s.ppr}_${nomSafe}_${(s.mois || '').replace(/\s/g, '_')}.xlsx`;

    const buffer = await workbook.outputAsync();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (err) {
    console.error('Etat individuel error:', err);
    return res.status(500).json({ error: 'Erreur lors de la génération du document' });
  }
});


// ── GID SETTINGS ────────────────────────────────────────────────────────────
app.get('/api/direction/gid-params', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parametres_gid ORDER BY id LIMIT 1');
    if (result.rows.length === 0) return res.json({});
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/direction/gid-params', requireAuth, requireDirection, async (req, res) => {
  const { nom_signataire, prenom_signataire, rubrique, liste_courante } = req.body;
  try {
    await pool.query(
      `UPDATE parametres_gid 
       SET nom_signataire = $1, prenom_signataire = $2, rubrique = $3, liste_courante = $4`,
      [nom_signataire, prenom_signataire, rubrique, liste_courante]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GID EXPORT ────────────────────────────────────────────────────────────
app.get('/api/export/gid', requireAuth, requireDirection, async (req, res) => {
  const { mois, cycle, etablissement } = req.query;

  try {
    const { rows } = await fetchExportRows(req.session.user, { mois, cycle, etablissement });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Aucune donnée trouvée pour cet export GID' });
    }

    const pRes = await pool.query('SELECT * FROM parametres_gid LIMIT 1');
    const p = pRes.rows[0] || {};
    const listeId = p.liste_courante || 1;

    const ribRes = await pool.query('SELECT ppr, rib FROM rib_enseignants');
    const ribMap = {};
    ribRes.rows.forEach(r => { ribMap[r.ppr] = r.rib; });

    const XlsxPopulate = require('xlsx-populate');
    const path = require('path');
    const modelPath = path.join(__dirname, 'GID_MODELE.xlsx');
    if (!require('fs').existsSync(modelPath)) {
      return res.status(500).json({ error: 'Fichier modèle GID introuvable (GID_MODELE.xlsx)' });
    }
    const workbook = await XlsxPopulate.fromFileAsync(modelPath);
    const ws = workbook.sheet('liate5');
    if (!ws) {
      return res.status(500).json({ error: 'Feuille "liate5" introuvable dans le modèle GID' });
    }

    // Delete all extra sheets that the original model contained to avoid confusing the user
    const sheetNames = workbook.sheets().map(s => s.name());
    for (const name of sheetNames) {
      if (name !== 'liate5') {
        workbook.deleteSheet(name);
      }
    }

    const totalNet = rows.reduce((s, r) => s + Number(r.montant_net), 0);
    const currYear = new Date().getFullYear();

    // The user no longer wants dynamic settings injected, so we leave row 2
    // exactly as it exists in the GID_MODELE.xlsx template...
    // EXCEPT for the totalNet which is mathematically dependent on the current export.
    ws.row(2).cell(9).value(totalNet);


    // Helper functions
    const formatRIB = (ribStr) => {
      const s = String(ribStr || '').replace(/\D/g, '');
      if (s.length === 24) {
        return { rib: s, bq: s.substring(0,3), ville: s.substring(3,6), cpte: s.substring(6,22), cle: s.substring(22,24) };
      }
      return { rib: s || '', bq: '', ville: '', cpte: '', cle: '' };
    };

    const getDateEnds = (moisLabel) => {
      const parts = (moisLabel || '').split(' ');
      if (parts.length < 2) return { start: '', end: '' };
      const mStr = parts[0].toLowerCase();
      const year = parseInt(parts[1]) || currYear;
      const map = {
        'janvier':1, 'février':2, 'fevrier':2, 'mars':3, 'avril':4, 'mai':5,
        'juin':6, 'juillet':7, 'août':8, 'aout':8, 'septembre':9, 'octobre':10,
        'novembre':11, 'décembre':12, 'decembre':12
      };
      const mn = map[mStr] || 1;
      const lastDay = new Date(year, mn, 0).getDate();
      return {
        start: `01/${String(mn).padStart(2,'0')}/${year}`,
        end: `${lastDay}/${String(mn).padStart(2,'0')}/${year}`
      };
    };

    // Fill data rows (starting at row 7)
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rNum = 7 + i;
      const dates = getDateEnds(r.mois || '');
      const nomComplet = (r.nom || '').trim();
      const parts = nomComplet.split(/\s+/);
      const nomFirst = parts.shift() || '';
      const prenomRest = parts.join(' ');
      const ribRaw = r.rib || ribMap[r.ppr] || '';
      const rr = formatRIB(ribRaw);

      ws.row(rNum).cell(1).value(r.grade || '');
      ws.row(rNum).cell(2).value(dates.start);
      ws.row(rNum).cell(3).value(dates.end);
      ws.row(rNum).cell(4).value(Number(r.nombre_heures));
      ws.row(rNum).cell(5).value(Number(r.taux_horaire));
      ws.row(rNum).cell(6).value(Number(r.montant_brut));
      ws.row(rNum).cell(7).value(Number(r.prelevement_ir));
      ws.row(rNum).cell(8).value(Number(r.montant_net));
      ws.row(rNum).cell(9).value(r.cin || '');
      ws.row(rNum).cell(10).value(nomFirst);
      ws.row(rNum).cell(11).value(prenomRest);
      ws.row(rNum).cell(12).value(r.ppr || '');
      ws.row(rNum).cell(13).value('VIR');
      ws.row(rNum).cell(14).value('RIB');
      ws.row(rNum).cell(15).value(rr.rib);
      ws.row(rNum).cell(16).formula(`LEFT(O${rNum},3)`);
      ws.row(rNum).cell(17).formula(`RIGHT(LEFTB(O${rNum},6),3)`);
      ws.row(rNum).cell(18).formula(`RIGHT(LEFTB(O${rNum},22),16)`);
      ws.row(rNum).cell(19).formula(`RIGHT(O${rNum},2)`);
      ws.row(rNum).cell(20).value('IND_SUPP');
      ws.row(rNum).cell(21).value('IND_SUPP');
      ws.row(rNum).cell(22).value(nomComplet);
      
      // Setup borders manually since template only provided empty blanks for first records, but xlsx-populate applies styles nicely
      for (let c = 1; c <= 22; c++) {
         ws.row(rNum).cell(c).style("border", true);
      }
    }

    // Clear any excess fake data from the template that extends beyond our real data
    const maxDataRow = 7 + rows.length;
    for (let rNum = maxDataRow; rNum <= 200; rNum++) {
      for (let c = 1; c <= 22; c++) {
        ws.row(rNum).cell(c).value(undefined);
        ws.row(rNum).cell(c).style("border", false);
      }
    }

    await pool.query('UPDATE parametres_gid SET liste_courante = liste_courante + 1');

    const buffer = await workbook.outputAsync();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Export_GID_Liste_${listeId}.xlsx"`);
    res.send(buffer);

  } catch (err) {
    console.error('GID export error:', err);
    res.status(500).json({ error: 'Erreur lors de la génération du fichier GID: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/export/excel', requireAuth, async (req, res) => {
  const user = req.session.user;
  const { mois, cycle, liste_no, etablissement } = req.query;

  try {
    const { rows, filterCycle } = await fetchExportRows(user, { mois, cycle, etablissement });
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Aucune donnée trouvée pour cet export' });
    }

    let modelCycleKey;
    if (user.role === 'directeur') {
      modelCycleKey = resolveModelCycleKey(filterCycle || rows[0].cycle);
    } else {
      const explicitCycle = normalizeCycleFilter(cycle);
      if (!explicitCycle) {
        return res.status(400).json({ error: 'Cycle requis pour l\'export (PRIMAIRE, COLLEGE ou LYCEE)' });
      }
      modelCycleKey = resolveModelCycleKey(explicitCycle);
    }

    const moisLabel = isActiveFilter(mois) ? String(mois).trim() : 'Tous';
    let filenameSuffix = `${modelCycleKey}_${moisLabel.replace(/\s/g, '_')}`;
    if (req.query.nom_etab) {
       const safeName = req.query.nom_etab.replace(/[^a-zA-Z0-9_\u00C0-\u024F]/g, '_');
       filenameSuffix = `${safeName}_` + filenameSuffix;
    }
    const filename = `Rapport_${filenameSuffix}_2026.xlsx`;
    const buffer = await buildOfficialExportBuffer(rows, { modelCycleKey });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Export Excel complet error:', err);
    return res.status(500).json({ error: 'Erreur lors de la génération du fichier global: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/enseignant/:ppr â€” correct teacher data (nom, grade, cin, affectation)
app.patch('/api/enseignant/:ppr', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr } = req.params;
  const { nom, grade, cin, affectation } = req.body;

  if (!nom || !nom.trim()) {
    return res.status(400).json({ error: 'Le nom est obligatoire' });
  }

  try {
    const result = await pool.query(
      `UPDATE personnel
       SET "NOML" = $1, "LL_GRADE" = $2, "CIN" = $3, "NOM_ETABL" = $4
       WHERE "PPR"::text = $5
       RETURNING "PPR"::text as ppr`,
      [nom.trim(), grade?.trim() || null, cin?.trim() || null, affectation?.trim() || null, ppr.trim()]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Enseignant introuvable' });
    }
    return res.json({ success: true, message: 'Informations mises à  jour avec succès' });
  } catch (err) {
    console.error('Update enseignant error:', err);
    return res.status(500).json({ error: 'Erreur lors de la mise à  jour' });
  }
});

// POST /api/saisies â€” insert a new entry
app.post('/api/saisies', requireAuth, requireDirecteur, async (req, res) => {
  const { ppr_enseignant, mois, jours, taux_ir, rib } = req.body;
  const { code_etablissement, taux_horaire } = req.session.user;

  // Validate taux_ir
  const tauxAllowed = [30, 34, 37];
  if (!tauxAllowed.includes(Number(taux_ir))) {
    return res.status(400).json({ error: 'Taux IR doit être 30, 34 ou 37' });
  }

  const joursValides = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  let totalHeures = 0;
  if (!jours || typeof jours !== 'object') {
    return res.status(400).json({ error: 'Jours manquants' });
  }
  for (const j of joursValides) {
    if (jours[j]) totalHeures += Number(jours[j]);
  }
  if (totalHeures <= 0) {
    return res.status(400).json({ error: 'Veuillez saisir au moins des heures' });
  }

  // Verify the PPR exists in personnel
  try {
    const check = await pool.query(
      `SELECT 1 FROM personnel WHERE "PPR"::text = $1
       UNION
       SELECT 1 FROM personnel_manuel WHERE ppr = $1`,
      [ppr_enseignant.trim()]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Enseignant (PPR) introuvable dans la base' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Erreur vérification enseignant' });
  }

  try {
    await pool.query('BEGIN');
    const result = await pool.query(
      `INSERT INTO saisies_heures
         (code_etablissement, ppr_enseignant, mois, nombre_heures, taux_ir, rib, taux_horaire)
       VALUES ($1, $2, $3, 0, $4, $5, $6)
       RETURNING id`,
      [code_etablissement, ppr_enseignant.trim(), mois, taux_ir, rib || null, taux_horaire]
    );
    const saisieId = result.rows[0].id;

    for (const j of joursValides) {
      if (jours[j] && Number(jours[j]) > 0) {
        await pool.query(
          'INSERT INTO saisies_heures_jours (saisie_id, jour, heures) VALUES ($1, $2, $3)',
          [saisieId, j.toUpperCase(), Number(jours[j])]
        );
      }
    }

    await pool.query('COMMIT');
    
    // Retrieve data to return
    const sel = await pool.query('SELECT id, montant_brut, prelevement_ir, montant_net FROM saisies_heures WHERE id=$1',[saisieId]);

    return res.json({ success: true, data: sel.rows[0] });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Insert saisie error:', err);
    return res.status(500).json({ error: 'Erreur lors de l\'enregistrement' });
  }
});

// GET /api/saisies — get saisies for the logged-in directeur, with optional month filter
app.get('/api/saisies', requireAuth, requireDirecteur, async (req, res) => {
  const { code_etablissement } = req.session.user;
  const { mois } = req.query;

  try {
    let query = `
      SELECT
        sh.id,
        p."NOML" as nom,
        p."LL_GRADE" as grade,
        sh.ppr_enseignant as ppr,
        sh.nombre_heures,
        sh.taux_horaire,
        sh.montant_brut,
        p."NOM_ETABL" as affectation,
        p."CIN" as cin,
        sh.taux_ir,
        sh.prelevement_ir,
        sh.montant_net,
        sh.rib,
        sh.mois,
        sh.date_saisie,
        sh.valide_par_direction
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      WHERE sh.code_etablissement = $1
    `;
    const params = [code_etablissement];

    if (mois) {
      query += ` AND sh.mois = $2`;
      params.push(mois);
    }
    query += ` ORDER BY sh.date_saisie DESC`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get saisies error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/saisies/:id â€” delete a saisie (only if belongs to the directeur's etab and not validated)
app.delete('/api/saisies/:id', requireAuth, requireDirecteur, async (req, res) => {
  const { id } = req.params;
  const { code_etablissement } = req.session.user;

  try {
    const result = await pool.query(
      `DELETE FROM saisies_heures
       WHERE id = $1 AND code_etablissement = $2 AND valide_par_direction = FALSE
       RETURNING id`,
      [id, code_etablissement]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saisie introuvable, déjà  validée, ou non autorisée' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete saisie error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  DIRECTION PROVINCIALE ROUTES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// GET /api/direction/saisies â€” all saisies, filterable
app.get('/api/direction/saisies', requireAuth, requireDirection, async (req, res) => {
  const { mois, cycle, code_etablissement } = req.query;
  const filterMois = isActiveFilter(mois) ? String(mois).trim() : null;
  const filterCycle = normalizeCycleFilter(cycle);
  const filterEtab = isActiveFilter(code_etablissement) ? String(code_etablissement).trim() : null;

  try {
    let query = `
      SELECT
        sh.id,
        sh.code_etablissement,
        e."اسم المؤسسة" as nom_etablissement,
        e.cycle,
        p."NOML" as nom,
        p."LL_GRADE" as grade,
        sh.ppr_enseignant as ppr,
        sh.nombre_heures,
        sh.taux_horaire,
        sh.montant_brut,
        p."NOM_ETABL" as affectation,
        p."CIN" as cin,
        sh.taux_ir,
        sh.prelevement_ir,
        sh.montant_net,
        sh.rib,
        sh.mois,
        sh.date_saisie,
        sh.valide_par_direction,
        COALESCE(e_affectation.cycle, e.cycle) as cycle
      FROM saisies_heures sh
      LEFT JOIN personnel p ON p."PPR"::text = sh.ppr_enseignant
      LEFT JOIN etablissements e ON e."رمز المؤسسة" = sh.code_etablissement
      LEFT JOIN etablissements e_affectation ON e_affectation."رمز المؤسسة" = p."CD_ETAB"
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (filterMois) {
      query += ` AND sh.mois = $${idx++}`;
      params.push(filterMois);
    }
    if (filterCycle) {
      query += ` AND UPPER(COALESCE(e_affectation.cycle, e.cycle)) = $${idx++}`;
      params.push(filterCycle);
    }
    if (filterEtab) {
      query += ` AND sh.code_etablissement = $${idx++}`;
      params.push(filterEtab);
    }

    query += ` ORDER BY COALESCE(e_affectation.cycle, e.cycle), sh.code_etablissement, sh.date_saisie DESC`;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('Direction saisies error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/direction/stats â€” summary stats
app.get('/api/direction/stats', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_saisies,
        COUNT(DISTINCT code_etablissement) as total_etab,
        SUM(montant_brut) as total_brut,
        SUM(montant_net) as total_net,
        SUM(CASE WHEN valide_par_direction THEN 1 ELSE 0 END) as total_validees
      FROM saisies_heures
    `);
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/direction/etablissements â€” list all etablissements for filters
app.get('/api/direction/etablissements', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT "رمز المؤسسة" as code, "اسم المؤسسة" as nom, cycle
       FROM etablissements
       ORDER BY cycle, nom`
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/direction/mois â€” distinct months that have entries
app.get('/api/direction/mois', requireAuth, requireDirection, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT mois FROM saisies_heures ORDER BY mois`
    );
    return res.json(result.rows.map(r => r.mois));
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/direction/saisies/:id/valider â€” mark a saisie as validated
app.patch('/api/direction/saisies/:id/valider', requireAuth, requireDirection, async (req, res) => {
  const { id } = req.params;
  const { valide } = req.body;
  try {
    await pool.query(
      `UPDATE saisies_heures SET valide_par_direction = $1 WHERE id = $2`,
      [!!valide, id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  à‰TAT INDIVIDUEL â€” "à‰tat des sommes dues" par saisie
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// ─────────────────────────────────────────────────────────────────────────────
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  SERVE HTML PAGES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/directeur', (req, res) => res.sendFile(path.join(__dirname, 'public', 'directeur.html')));
app.get('/direction', (req, res) => res.sendFile(path.join(__dirname, 'public', 'direction.html')));

// ─────────────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\nðŸŽ“ Heures Supplémentaires â€” DP Tanger-Assilah`);
    console.log(`   Serveur démarré sur http://localhost:${PORT}\n`);
  });
}

module.exports = app;
