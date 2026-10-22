// Sources de veille Hemerion — une entrée par flux RSS interrogé.
// Google News RSS permet des requêtes ciblées (FR + EN) ; les flux officiels sont filtrés ensuite par mots-clés.
const gn = (q, lang) => {
  const hl = lang === 'fr' ? 'hl=fr&gl=FR&ceid=FR:fr' : 'hl=en-US&gl=US&ceid=US:en';
  return 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:30d') + '&' + hl;
};

const sources = [
  // 1. Mentions directes de la start-up et de ses produits
  { label: 'Hemerion (EN)', axe: 'Hemerion & produits', lang: 'en', url: gn('Hemerion', 'en') },
  { label: 'Hemerion (FR)', axe: 'Hemerion & produits', lang: 'fr', url: gn('Hemerion', 'fr') },
  { label: 'Pentalafen / Heliance', axe: 'Hemerion & produits', lang: 'en', url: gn('Pentalafen OR Heliance photodynamic', 'en') },

  // 2. Technologie : thérapie photodynamique, 5-ALA
  { label: 'PDT glioblastome (EN)', axe: 'Technologie PDT / 5-ALA', lang: 'en', url: gn('photodynamic therapy glioblastoma', 'en') },
  { label: 'PDT glioblastome (FR)', axe: 'Technologie PDT / 5-ALA', lang: 'fr', url: gn('thérapie photodynamique glioblastome', 'fr') },
  { label: '5-ALA / aminolevulinic acid', axe: 'Technologie PDT / 5-ALA', lang: 'en', url: gn('"aminolevulinic acid" OR 5-ALA cancer', 'en') },
  { label: 'Gleolan / Gliolan', axe: 'Technologie PDT / 5-ALA', lang: 'en', url: gn('Gleolan OR Gliolan OR photonamic', 'en') },

  // 3. Paysage concurrentiel glioblastome
  { label: 'Glioblastome – essais & approbations', axe: 'Concurrence glioblastome', lang: 'en', url: gn('glioblastoma FDA approval OR "phase 3" OR pivotal', 'en') },
  { label: 'Glioblastome (FR)', axe: 'Concurrence glioblastome', lang: 'fr', url: gn('glioblastome traitement essai', 'fr') },
  { label: 'Novocure / Optune / TTFields', axe: 'Concurrence glioblastome', lang: 'en', url: gn('Novocure Optune OR "tumor treating fields" glioblastoma', 'en') },
  { label: 'Sonodynamique / LITT / ultrasons', axe: 'Concurrence glioblastome', lang: 'en', url: gn('sonodynamic OR "laser interstitial thermal therapy" OR "focused ultrasound" glioblastoma', 'en') },
  { label: 'Vorasidenib / immunothérapies gliome', axe: 'Concurrence glioblastome', lang: 'en', url: gn('vorasidenib OR "CAR-T" OR "oncolytic virus" glioma', 'en') },

  // 4. Réglementaire (FDA, EMA, MDR, ANSM, HAS)
  { label: 'FDA – produits combinés médicament-dispositif', axe: 'Réglementaire', lang: 'en', url: gn('FDA "combination product" drug device guidance', 'en') },
  { label: 'FDA – orphan drug / fast track oncologie', axe: 'Réglementaire', lang: 'en', url: gn('FDA "orphan drug" OR "fast track" brain cancer', 'en') },
  { label: 'EMA – médicaments orphelins / réforme pharma UE', axe: 'Réglementaire', lang: 'en', url: gn('EMA orphan OR "EU pharmaceutical legislation" OR "pharma package"', 'en') },
  { label: 'MDR – dispositifs médicaux UE', axe: 'Réglementaire', lang: 'en', url: gn('"Medical Device Regulation" MDR EU 2026 OR "CE marking" medical device', 'en') },
  { label: 'ANSM / HAS / accès précoce', axe: 'Réglementaire', lang: 'fr', url: gn('ANSM OR HAS "accès précoce" OR "forfait innovation" dispositif médical', 'fr') },
  { label: 'FDA – communiqués officiels', axe: 'Réglementaire', lang: 'en', url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml' },

  // 5. Marché, financement, neurochirurgie
  { label: 'Financement medtech / biotech France', axe: 'Marché & financement', lang: 'fr', url: gn('levée de fonds biotech OR medtech oncologie France', 'fr') },
  { label: 'Neurochirurgie – dispositifs & M&A', axe: 'Marché & financement', lang: 'en', url: gn('neurosurgery device acquisition OR funding brain tumor', 'en') },
  { label: 'Prix & remboursement oncologie', axe: 'Marché & financement', lang: 'en', url: gn('oncology drug pricing reimbursement Europe OR "Inflation Reduction Act" orphan', 'en') }
];

return sources.map(s => ({ json: s }));
