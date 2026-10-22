// Normalise les articles RSS, calcule un score d'impact pour Hemerion, déduplique
// (dans le lot et contre ce qui est déjà dans Supabase) et ne garde que l'essentiel.
let existing = [];
try {
  existing = $('Articles déjà en base').all().map(i => i.json.url_hash).filter(Boolean);
} catch (e) { existing = []; }
const seen = new Set(existing);

const MAX_AGE_DAYS = 30;
const MIN_SCORE = 30;

// Règles : [regex, poids, catégorie, produit(s) concerné(s)]
const RULES = [
  [/hemerion/i, 100, 'Hemerion & produits', ['Pentalafen', 'Heliance']],
  [/pentalafen/i, 100, 'Hemerion & produits', ['Pentalafen']],
  [/heliance/i, 90, 'Hemerion & produits', ['Heliance']],
  [/glioblastom|\bGBM\b|high-grade glioma|gliome de haut grade/i, 35, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],
  [/glioma|gliome|brain tumou?r|tumeur cérébrale|cancer du cerveau|brain cancer/i, 15, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],
  [/photodynami|\bPDT\b|photothérap/i, 35, 'Technologie PDT / 5-ALA', ['Pentalafen', 'Heliance']],
  [/aminolevulin|5-ALA|\bALA\b|gleolan|gliolan|protoporphyrin|fluorescence-guided/i, 35, 'Technologie PDT / 5-ALA', ['Pentalafen']],
  [/laser|optical fib|fibre optique|illumination|light-activated/i, 10, 'Technologie PDT / 5-ALA', ['Heliance']],
  [/novocure|optune|tumor treating fields|TTFields|sonalasense|sonodynamic|sonodynamique|LITT|laser interstitial|focused ultrasound|vorasidenib|temozolomide|témozolomide|stupp/i, 25, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],
  [/combination product|produit combiné|drug-device|médicament-dispositif/i, 25, 'Réglementaire', ['Pentalafen', 'Heliance']],
  [/orphan|orphelin/i, 15, 'Réglementaire', ['Pentalafen', 'Heliance']],
  [/fast track|breakthrough|priority review|accelerated approval|accès précoce|early access/i, 12, 'Réglementaire', ['Pentalafen']],
  [/\bMDR\b|medical device regulation|CE mark|marquage CE|notified bod|organisme notifié|dispositif médical|medical device|510\(k\)|\bPMA\b|de novo|CDRH/i, 15, 'Réglementaire', ['Heliance']],
  [/\bFDA\b|\bEMA\b|\bANSM\b|\bHAS\b|\bCHMP\b|marketing authori|autorisation de mise sur le marché|\bAMM\b|\bIND\b/i, 8, 'Réglementaire', []],
  [/pharmaceutical legislation|pharma package|réforme pharmaceutique|market exclusivity|exclusivité/i, 15, 'Réglementaire', ['Pentalafen']],
  [/reimburse|rembourse|pricing|prix|tarif|forfait innovation|payer/i, 8, 'Marché & financement', []],
  [/neurosurg|neurochirurg|resection|résection/i, 15, 'Marché & financement', ['Heliance']],
  [/funding|financing|raises|levée de fonds|lève|series [A-C]|acquisition|acquires|rachète|IPO|introduction en bourse/i, 6, 'Marché & financement', []],
  [/oncolog|cancer|tumou?r/i, 4, null, []],
  [/lille|hauts-de-france|bpifrance|france 2030|UPMC|pittsburgh/i, 6, null, []]
];

const NOTES = {
  'Hemerion & produits': "Mention directe d'Hemerion ou de ses produits : à lire en priorité (image, partenaires, concurrence directe).",
  'Technologie PDT / 5-ALA': 'Concerne la classe thérapeutique de Pentalafen®/Heliance® (5-ALA + lumière) : données cliniques, sécurité ou approbations qui servent de référence ou de comparateur.',
  'Concurrence glioblastome': "Évolution du standard de soins ou d'un concurrent sur le glioblastome nouvellement diagnostiqué : peut modifier le comparateur de l'essai pivot et le positionnement commercial.",
  'Réglementaire': "Changement de règles ou de pratiques des autorités (FDA, EMA, MDR, ANSM/HAS) applicables au médicament orphelin Pentalafen® ou au dispositif Heliance® : impact sur le calendrier d'autorisation 2030.",
  'Marché & financement': "Signal de marché (financement, M&A, prix/remboursement, neurochirurgie) utile pour la levée de fonds, les partenariats et l'accès au marché."
};

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
function clean(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

const now = Date.now();
const out = [];
const titleSeen = new Set();

for (const item of $input.all()) {
  const a = item.json;
  if (!a || a.error || !a.title || !a.link) continue;
  const link = String(a.link);
  const isGoogle = link.includes('news.google.com');

  let title = clean(a.title);
  let publisher = clean(a.creator || '');
  // Google News : "Titre - Média"
  const m = title.match(/^(.*) - ([^-]{2,60})$/);
  if (m && isGoogle) { title = m[1].trim(); publisher = publisher || m[2].trim(); }
  if (!publisher && link.includes('fda.gov')) publisher = 'U.S. FDA';
  if (!publisher) { try { publisher = new URL(link).hostname.replace(/^www\./, ''); } catch (e) { publisher = 'Source inconnue'; } }

  const published = new Date(a.isoDate || a.pubDate || now);
  const ageDays = (now - published.getTime()) / 86400000;
  if (isNaN(ageDays) || ageDays > MAX_AGE_DAYS) continue;

  let summary = clean(a.contentSnippet || a.content || a.summary || '').slice(0, 600);
  // Google News ne fournit que "titre + média" en description : inutile de le dupliquer
  if (isGoogle && summary.toLowerCase().startsWith(title.toLowerCase().slice(0, 40))) summary = '';
  const text = title + ' ' + summary;

  let score = 0; const cats = {}; const prods = new Set(); const kws = [];
  for (const [re, w, cat, p] of RULES) {
    const hit = text.match(re);
    if (hit) {
      score += w; kws.push(hit[0]);
      if (cat) cats[cat] = (cats[cat] || 0) + w;
      p.forEach(x => prods.add(x));
    }
  }
  // Fraîcheur : bonus pour les 3 derniers jours
  if (ageDays <= 3) score += 5;
  if (score < MIN_SCORE) continue;

  const category = Object.keys(cats).sort((x, y) => cats[y] - cats[x])[0] || 'Marché & financement';
  const normTitle = title.toLowerCase().replace(/[^a-z0-9àâçéèêëîïôûùüÿœ]+/g, ' ').trim();
  const url_hash = hash(normTitle);
  if (seen.has(url_hash) || titleSeen.has(normTitle)) continue;
  seen.add(url_hash); titleSeen.add(normTitle);

  const impact_score = Math.min(100, score);
  out.push({
    json: {
      url_hash,
      title,
      url: a.link,
      source: publisher,
      published_at: published.toISOString(),
      summary,
      category,
      products: [...prods].join(', ') || 'Veille générale',
      impact_score,
      impact_level: impact_score >= 80 ? 'critique' : impact_score >= 50 ? 'élevé' : 'modéré',
      impact_note: NOTES[category] || '',
      matched_keywords: [...new Set(kws.map(k => k.toLowerCase()))].slice(0, 8).join(', '),
      lang: /[àâçéèêëîïôûùœ]| le | la | les | des | du /i.test(title) ? 'fr' : 'en'
    }
  });
}

out.sort((x, y) => y.json.impact_score - x.json.impact_score);
return out.slice(0, 150);
