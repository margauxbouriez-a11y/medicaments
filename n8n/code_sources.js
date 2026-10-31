// Sources de veille Hemerion — une entrée par flux RSS interrogé.
// Les sources sont éditées depuis la plateforme (espace « Sources de veille ») et stockées
// dans la Data Table n8n `hemerion_veille_sources`. Si la table est vide ou illisible,
// la liste par défaut ci-dessous est utilisée.
const gn = (q, lang) => {
  const hl = lang === 'fr' ? 'hl=fr&gl=FR&ceid=FR:fr' : 'hl=en-US&gl=US&ceid=US:en';
  return 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:30d') + '&' + hl;
};

const DEFAULTS = [
  ['Hemerion & produits', 'Hemerion (EN)', 'Hemerion', 'en'],
  ['Hemerion & produits', 'Hemerion (FR)', 'Hemerion', 'fr'],
  ['Hemerion & produits', 'Pentalafen / Heliance', 'Pentalafen OR Heliance photodynamic', 'en'],
  ['Technologie PDT / 5-ALA', 'PDT glioblastome (EN)', 'photodynamic therapy glioblastoma', 'en'],
  ['Technologie PDT / 5-ALA', 'PDT glioblastome (FR)', 'thérapie photodynamique glioblastome', 'fr'],
  ['Technologie PDT / 5-ALA', '5-ALA / aminolevulinic acid', '"aminolevulinic acid" OR 5-ALA cancer', 'en'],
  ['Technologie PDT / 5-ALA', 'Gleolan / Gliolan', 'Gleolan OR Gliolan OR photonamic', 'en'],
  ['Concurrence glioblastome', 'Glioblastome – essais & approbations', 'glioblastoma FDA approval OR "phase 3" OR pivotal', 'en'],
  ['Concurrence glioblastome', 'Glioblastome (FR)', 'glioblastome traitement essai', 'fr'],
  ['Concurrence glioblastome', 'Novocure / Optune / TTFields', 'Novocure Optune OR "tumor treating fields" glioblastoma', 'en'],
  ['Concurrence glioblastome', 'Sonodynamique / LITT / ultrasons', 'sonodynamic OR "laser interstitial thermal therapy" OR "focused ultrasound" glioblastoma', 'en'],
  ['Concurrence glioblastome', 'Vorasidenib / immunothérapies gliome', 'vorasidenib OR "CAR-T" OR "oncolytic virus" glioma', 'en'],
  ['Réglementaire', 'FDA – produits combinés médicament-dispositif', 'FDA "combination product" drug device guidance', 'en'],
  ['Réglementaire', 'FDA – orphan drug / fast track oncologie', 'FDA "orphan drug" OR "fast track" brain cancer', 'en'],
  ['Réglementaire', 'EMA – médicaments orphelins / réforme pharma UE', 'EMA orphan OR "EU pharmaceutical legislation" OR "pharma package"', 'en'],
  ['Réglementaire', 'MDR – dispositifs médicaux UE', '"Medical Device Regulation" MDR EU 2026 OR "CE marking" medical device', 'en'],
  ['Réglementaire', 'ANSM / HAS / accès précoce', 'ANSM OR HAS "accès précoce" OR "forfait innovation" dispositif médical', 'fr'],
  ['Réglementaire', 'FDA – communiqués officiels', '', 'en', 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml'],
  ['Marché & financement', 'Financement medtech / biotech France', 'levée de fonds biotech OR medtech oncologie France', 'fr'],
  ['Marché & financement', 'Neurochirurgie – dispositifs & M&A', 'neurosurgery device acquisition OR funding brain tumor', 'en'],
  ['Marché & financement', 'Prix & remboursement oncologie', 'oncology drug pricing reimbursement Europe OR "Inflation Reduction Act" orphan', 'en']
].map(([axe, label, query, lang, url], i) => ({ position: i + 1, axe, label, query, lang, url: url || '', active: true }));

let rows = [];
try {
  rows = $('Lire les sources').all().map(i => i.json).filter(r => r && (r.query || r.url));
} catch (e) { rows = []; }

const list = (rows.length ? rows : DEFAULTS)
  .filter(r => r.active !== false)
  .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
  .map(r => {
    const lang = r.lang === 'fr' ? 'fr' : 'en';
    return { label: r.label || r.query || r.url, axe: r.axe || 'Autre', lang, url: r.url ? r.url : gn(r.query, lang) };
  });

return list.map(s => ({ json: s }));
