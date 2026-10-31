// Vérifie la clé d'édition et valide la nouvelle liste de sources envoyée par la plateforme
// (POST /webhook/hemerion-veille-sources, corps « key » + « sources » au format JSON).
const req = $('Modifier les sources (POST)').first().json;
let body = req.body || {};
if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

let expected = '';
try {
  const row = $('Lire la clé').all().map(i => i.json).find(r => r && r.cle === 'edit_key');
  expected = row ? String(row.valeur || '') : '';
} catch (e) { expected = ''; }

const fail = (status, error) => [{ json: { ok: false, status, error } }];
if (!expected) return fail(500, "Aucune clé d'édition n'est configurée dans n8n (table hemerion_veille_reglages).");
if (String(body.key || '') !== expected) return fail(403, "Clé d'édition incorrecte.");

let list = body.sources;
if (typeof list === 'string') { try { list = JSON.parse(list); } catch (e) { return fail(400, 'Liste de sources illisible.'); } }
if (!Array.isArray(list)) return fail(400, 'Liste de sources manquante.');

const txt = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const errors = [];
const sources = [];
list.forEach((s, i) => {
  if (!s || typeof s !== 'object') return;
  const axe = txt(s.axe, 60);
  const label = txt(s.label, 90);
  const query = txt(s.query, 300);
  let url = txt(s.url, 500);
  if (!query && !url) return; // ligne vide ignorée
  if (url && !/^https:\/\/[^\s]+$/i.test(url)) errors.push('Ligne ' + (i + 1) + ' : l’adresse du flux doit commencer par https://');
  if (url && query) url = ''; // une requête Google News prime sur une adresse directe
  sources.push({
    position: sources.length + 1,
    axe: axe || 'Autre',
    label: label || query || url,
    query,
    url,
    lang: s.lang === 'fr' ? 'fr' : 'en',
    active: s.active !== false && s.active !== 'false'
  });
});

if (errors.length) return fail(400, errors.join(' · '));
if (!sources.length) return fail(400, 'Il faut garder au moins une source.');
if (sources.length > 60) return fail(400, 'Maximum 60 sources (le workflow interroge chaque flux à chaque collecte).');

return [{ json: { ok: true, status: 200, count: sources.length, active: sources.filter(s => s.active).length, sources } }];
