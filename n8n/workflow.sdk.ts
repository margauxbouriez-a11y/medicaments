import { workflow, node, trigger, sticky, expr, ifElse } from '@n8n/workflow-sdk';

const schedule = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Toutes les 6 heures',
    parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 6 }] } },
    position: [0, 200]
  },
  output: [{}]
});

const refreshHook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Rafraîchir la veille (POST)',
    parameters: {
      httpMethod: 'POST',
      path: 'hemerion-veille-refresh',
      responseMode: 'onReceived',
      options: { allowedOrigins: '*', responseData: '{"status":"collecte lancée"}' }
    },
    position: [0, 400]
  },
  output: [{ body: {} }]
});

const existing = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Articles déjà en base',
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: '2iNDkywCKftvE4qh', cachedResultName: 'hemerion_veille_articles' },
      returnAll: false,
      limit: 2000,
      orderBy: true,
      orderByColumn: 'createdAt',
      orderByDirection: 'DESC'
    },
    position: [260, 300]
  },
  output: [{ url_hash: 'a1b2c3d4' }]
});

const readSources = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Lire les sources',
    executeOnce: true,
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'DoObCjW2e284K5hT', cachedResultName: 'hemerion_veille_sources' },
      returnAll: true,
      orderBy: true,
      orderByColumn: 'position',
      orderByDirection: 'ASC'
    },
    position: [528, 304]
  },
  output: [{ position: 1, axe: 'Hemerion & produits', label: 'Hemerion (EN)', query: 'Hemerion', url: '', lang: 'en', active: true }]
});

const sources = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Sources de veille',
    executeOnce: true,
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Sources de veille Hemerion \u2014 une entr\u00e9e par flux RSS interrog\u00e9.\n// Les sources sont \u00e9dit\u00e9es depuis la plateforme (espace \u00ab Sources de veille \u00bb) et stock\u00e9es\n// dans la Data Table n8n `hemerion_veille_sources`. Si la table est vide ou illisible,\n// la liste par d\u00e9faut ci-dessous est utilis\u00e9e.\nconst gn = (q, lang) => {\n  const hl = lang === 'fr' ? 'hl=fr&gl=FR&ceid=FR:fr' : 'hl=en-US&gl=US&ceid=US:en';\n  return 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:30d') + '&' + hl;\n};\n\nconst DEFAULTS = [\n  ['Hemerion & produits', 'Hemerion (EN)', 'Hemerion', 'en'],\n  ['Hemerion & produits', 'Hemerion (FR)', 'Hemerion', 'fr'],\n  ['Hemerion & produits', 'Pentalafen / Heliance', 'Pentalafen OR Heliance photodynamic', 'en'],\n  ['Technologie PDT / 5-ALA', 'PDT glioblastome (EN)', 'photodynamic therapy glioblastoma', 'en'],\n  ['Technologie PDT / 5-ALA', 'PDT glioblastome (FR)', 'th\u00e9rapie photodynamique glioblastome', 'fr'],\n  ['Technologie PDT / 5-ALA', '5-ALA / aminolevulinic acid', '\"aminolevulinic acid\" OR 5-ALA cancer', 'en'],\n  ['Technologie PDT / 5-ALA', 'Gleolan / Gliolan', 'Gleolan OR Gliolan OR photonamic', 'en'],\n  ['Concurrence glioblastome', 'Glioblastome \u2013 essais & approbations', 'glioblastoma FDA approval OR \"phase 3\" OR pivotal', 'en'],\n  ['Concurrence glioblastome', 'Glioblastome (FR)', 'glioblastome traitement essai', 'fr'],\n  ['Concurrence glioblastome', 'Novocure / Optune / TTFields', 'Novocure Optune OR \"tumor treating fields\" glioblastoma', 'en'],\n  ['Concurrence glioblastome', 'Sonodynamique / LITT / ultrasons', 'sonodynamic OR \"laser interstitial thermal therapy\" OR \"focused ultrasound\" glioblastoma', 'en'],\n  ['Concurrence glioblastome', 'Vorasidenib / immunoth\u00e9rapies gliome', 'vorasidenib OR \"CAR-T\" OR \"oncolytic virus\" glioma', 'en'],\n  ['R\u00e9glementaire', 'FDA \u2013 produits combin\u00e9s m\u00e9dicament-dispositif', 'FDA \"combination product\" drug device guidance', 'en'],\n  ['R\u00e9glementaire', 'FDA \u2013 orphan drug / fast track oncologie', 'FDA \"orphan drug\" OR \"fast track\" brain cancer', 'en'],\n  ['R\u00e9glementaire', 'EMA \u2013 m\u00e9dicaments orphelins / r\u00e9forme pharma UE', 'EMA orphan OR \"EU pharmaceutical legislation\" OR \"pharma package\"', 'en'],\n  ['R\u00e9glementaire', 'MDR \u2013 dispositifs m\u00e9dicaux UE', '\"Medical Device Regulation\" MDR EU 2026 OR \"CE marking\" medical device', 'en'],\n  ['R\u00e9glementaire', 'ANSM / HAS / acc\u00e8s pr\u00e9coce', 'ANSM OR HAS \"acc\u00e8s pr\u00e9coce\" OR \"forfait innovation\" dispositif m\u00e9dical', 'fr'],\n  ['R\u00e9glementaire', 'FDA \u2013 communiqu\u00e9s officiels', '', 'en', 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml'],\n  ['March\u00e9 & financement', 'Financement medtech / biotech France', 'lev\u00e9e de fonds biotech OR medtech oncologie France', 'fr'],\n  ['March\u00e9 & financement', 'Neurochirurgie \u2013 dispositifs & M&A', 'neurosurgery device acquisition OR funding brain tumor', 'en'],\n  ['March\u00e9 & financement', 'Prix & remboursement oncologie', 'oncology drug pricing reimbursement Europe OR \"Inflation Reduction Act\" orphan', 'en']\n].map(([axe, label, query, lang, url], i) => ({ position: i + 1, axe, label, query, lang, url: url || '', active: true }));\n\nlet rows = [];\ntry {\n  rows = $('Lire les sources').all().map(i => i.json).filter(r => r && (r.query || r.url));\n} catch (e) { rows = []; }\n\nconst list = (rows.length ? rows : DEFAULTS)\n  .filter(r => r.active !== false)\n  .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))\n  .map(r => {\n    const lang = r.lang === 'fr' ? 'fr' : 'en';\n    return { label: r.label || r.query || r.url, axe: r.axe || 'Autre', lang, url: r.url ? r.url : gn(r.query, lang) };\n  });\n\nreturn list.map(s => ({ json: s }));\n" },
    position: [784, 304]
  },
  output: [{ label: 'Hemerion (EN)', axe: 'Hemerion & produits', lang: 'en', url: 'https://news.google.com/rss/search?q=Hemerion' }]
});

const readRss = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: 'Lire les flux RSS',
    onError: 'continueRegularOutput',
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 1500,
    parameters: { url: expr('{{ $json.url }}'), options: { ignoreSSL: false } },
    position: [1040, 304]
  },
  output: [{ title: 'Hemerion receives FDA feedback - Fierce Biotech', link: 'https://example.com/a', isoDate: '2026-10-20T08:00:00.000Z', contentSnippet: 'Photodynamic therapy for glioblastoma' }]
});

const scoring = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Scorer l’impact et dédupliquer',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Normalise les articles RSS, calcule un score d'impact pour Hemerion, d\u00e9duplique\n// (dans le lot et contre ce qui est d\u00e9j\u00e0 dans la Data Table) et ne garde que l'essentiel.\nlet existing = [];\ntry {\n  existing = $('Articles d\u00e9j\u00e0 en base').all().map(i => i.json.url_hash).filter(Boolean);\n} catch (e) { existing = []; }\nconst seen = new Set(existing);\n\nconst MAX_AGE_DAYS = 30;\nconst MIN_SCORE = 30;\n\n// R\u00e8gles : [regex, poids, cat\u00e9gorie, produit(s) concern\u00e9(s)]\nconst RULES = [\n  [/hemerion/i, 100, 'Hemerion & produits', ['Pentalafen', 'Heliance']],\n  [/pentalafen/i, 100, 'Hemerion & produits', ['Pentalafen']],\n  [/heliance/i, 90, 'Hemerion & produits', ['Heliance']],\n  [/glioblastom|\\bGBM\\b|high-grade glioma|gliome de haut grade/i, 35, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],\n  [/glioma|gliome|brain tumou?r|tumeur c\u00e9r\u00e9brale|cancer du cerveau|brain cancer/i, 15, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],\n  [/photodynami|\\bPDT\\b|phototh\u00e9rap/i, 35, 'Technologie PDT / 5-ALA', ['Pentalafen', 'Heliance']],\n  [/aminolevulin|5-ALA|\\bALA\\b|gleolan|gliolan|protoporphyrin|fluorescence-guided/i, 35, 'Technologie PDT / 5-ALA', ['Pentalafen']],\n  [/laser|optical fib|fibre optique|illumination|light-activated/i, 10, 'Technologie PDT / 5-ALA', ['Heliance']],\n  [/novocure|optune|tumor treating fields|TTFields|sonalasense|sonodynamic|sonodynamique|LITT|laser interstitial|focused ultrasound|vorasidenib|temozolomide|t\u00e9mozolomide|stupp/i, 25, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],\n  [/combination product|produit combin\u00e9|drug-device|m\u00e9dicament-dispositif/i, 25, 'R\u00e9glementaire', ['Pentalafen', 'Heliance']],\n  [/orphan|orphelin/i, 15, 'R\u00e9glementaire', ['Pentalafen', 'Heliance']],\n  [/fast track|breakthrough|priority review|accelerated approval|acc\u00e8s pr\u00e9coce|early access/i, 12, 'R\u00e9glementaire', ['Pentalafen']],\n  [/\\bMDR\\b|medical device regulation|CE mark|marquage CE|notified bod|organisme notifi\u00e9|dispositif m\u00e9dical|medical device|510\\(k\\)|\\bPMA\\b|de novo|CDRH/i, 15, 'R\u00e9glementaire', ['Heliance']],\n  [/\\bFDA\\b|\\bEMA\\b|\\bANSM\\b|\\bHAS\\b|\\bCHMP\\b|marketing authori|autorisation de mise sur le march\u00e9|\\bAMM\\b|\\bIND\\b/i, 8, 'R\u00e9glementaire', []],\n  [/pharmaceutical legislation|pharma package|r\u00e9forme pharmaceutique|market exclusivity|exclusivit\u00e9/i, 15, 'R\u00e9glementaire', ['Pentalafen']],\n  [/reimburse|rembourse|pricing|prix|tarif|forfait innovation|payer/i, 8, 'March\u00e9 & financement', []],\n  [/neurosurg|neurochirurg|resection|r\u00e9section/i, 15, 'March\u00e9 & financement', ['Heliance']],\n  [/funding|financing|raises|lev\u00e9e de fonds|l\u00e8ve|series [A-C]|acquisition|acquires|rach\u00e8te|IPO|introduction en bourse/i, 6, 'March\u00e9 & financement', []],\n  [/oncolog|cancer|tumou?r/i, 4, null, []],\n  [/lille|hauts-de-france|bpifrance|france 2030|UPMC|pittsburgh/i, 6, null, []]\n];\n\nconst NOTES = {\n  'Hemerion & produits': \"Mention directe d'Hemerion ou de ses produits : \u00e0 lire en priorit\u00e9 (image, partenaires, concurrence directe).\",\n  'Technologie PDT / 5-ALA': 'Concerne la classe th\u00e9rapeutique de Pentalafen\u00ae/Heliance\u00ae (5-ALA + lumi\u00e8re) : donn\u00e9es cliniques, s\u00e9curit\u00e9 ou approbations qui servent de r\u00e9f\u00e9rence ou de comparateur.',\n  'Concurrence glioblastome': \"\u00c9volution du standard de soins ou d'un concurrent sur le glioblastome nouvellement diagnostiqu\u00e9 : peut modifier le comparateur de l'essai pivot et le positionnement commercial.\",\n  'R\u00e9glementaire': \"Changement de r\u00e8gles ou de pratiques des autorit\u00e9s (FDA, EMA, MDR, ANSM/HAS) applicables au m\u00e9dicament orphelin Pentalafen\u00ae ou au dispositif Heliance\u00ae : impact sur le calendrier d'autorisation 2030.\",\n  'March\u00e9 & financement': \"Signal de march\u00e9 (financement, M&A, prix/remboursement, neurochirurgie) utile pour la lev\u00e9e de fonds, les partenariats et l'acc\u00e8s au march\u00e9.\"\n};\n\nfunction hash(str) {\n  let h = 0x811c9dc5;\n  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }\n  return h.toString(16).padStart(8, '0');\n}\nfunction clean(s) {\n  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, \"'\").replace(/&quot;/g, '\"').replace(/\\s+/g, ' ').trim();\n}\n\nconst now = Date.now();\nconst out = [];\nconst titleSeen = new Set();\n\nfor (const item of $input.all()) {\n  const a = item.json;\n  if (!a || a.error || !a.title || !a.link) continue;\n  const link = String(a.link);\n  const isGoogle = link.includes('news.google.com');\n\n  let title = clean(a.title);\n  let publisher = clean(a.creator || '');\n  // Google News : \"Titre - M\u00e9dia\"\n  const m = title.match(/^(.*) - ([^-]{2,60})$/);\n  if (m && isGoogle) { title = m[1].trim(); publisher = publisher || m[2].trim(); }\n  if (!publisher && link.includes('fda.gov')) publisher = 'U.S. FDA';\n  if (!publisher) { try { publisher = new URL(link).hostname.replace(/^www\\./, ''); } catch (e) { publisher = 'Source inconnue'; } }\n\n  const published = new Date(a.isoDate || a.pubDate || now);\n  const ageDays = (now - published.getTime()) / 86400000;\n  if (isNaN(ageDays) || ageDays > MAX_AGE_DAYS) continue;\n\n  let summary = clean(a.contentSnippet || a.content || a.summary || '').slice(0, 600);\n  // Google News ne fournit que \"titre + m\u00e9dia\" en description : inutile de le dupliquer\n  if (isGoogle && summary.toLowerCase().startsWith(title.toLowerCase().slice(0, 40))) summary = '';\n  const text = title + ' ' + summary;\n\n  let score = 0; const cats = {}; const prods = new Set(); const kws = [];\n  for (const [re, w, cat, p] of RULES) {\n    const hit = text.match(re);\n    if (hit) {\n      score += w; kws.push(hit[0]);\n      if (cat) cats[cat] = (cats[cat] || 0) + w;\n      p.forEach(x => prods.add(x));\n    }\n  }\n  // Fra\u00eecheur : bonus pour les 3 derniers jours\n  if (ageDays <= 3) score += 5;\n  if (score < MIN_SCORE) continue;\n\n  const category = Object.keys(cats).sort((x, y) => cats[y] - cats[x])[0] || 'March\u00e9 & financement';\n  const normTitle = title.toLowerCase().replace(/[^a-z0-9\u00e0\u00e2\u00e7\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00fb\u00f9\u00fc\u00ff\u0153]+/g, ' ').trim();\n  const url_hash = hash(normTitle);\n  if (seen.has(url_hash) || titleSeen.has(normTitle)) continue;\n  seen.add(url_hash); titleSeen.add(normTitle);\n\n  const impact_score = Math.min(100, score);\n  out.push({\n    json: {\n      url_hash,\n      title,\n      url: a.link,\n      source: publisher,\n      published_at: published.toISOString(),\n      summary,\n      category,\n      products: [...prods].join(', ') || 'Veille g\u00e9n\u00e9rale',\n      impact_score,\n      impact_level: impact_score >= 80 ? 'critique' : impact_score >= 50 ? '\u00e9lev\u00e9' : 'mod\u00e9r\u00e9',\n      impact_note: NOTES[category] || '',\n      matched_keywords: [...new Set(kws.map(k => k.toLowerCase()))].slice(0, 8).join(', '),\n      lang: /[\u00e0\u00e2\u00e7\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00fb\u00f9\u0153]| le | la | les | des | du /i.test(title) ? 'fr' : 'en'\n    }\n  });\n}\n\nout.sort((x, y) => y.json.impact_score - x.json.impact_score);\nreturn out.slice(0, 150);\n" },
    position: [1296, 304]
  },
  output: [{ url_hash: 'a1b2c3d4', title: 'Hemerion receives FDA feedback', url: 'https://example.com/a', source: 'Fierce Biotech', published_at: '2026-10-20T08:00:00.000Z', summary: 'Photodynamic therapy for glioblastoma', category: 'Hemerion & produits', products: 'Pentalafen, Heliance', impact_score: 100, impact_level: 'critique', impact_note: 'Mention directe', matched_keywords: 'hemerion', lang: 'en' }]
});

const save = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Enregistrer dans la table',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: '2iNDkywCKftvE4qh', cachedResultName: 'hemerion_veille_articles' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          url_hash: expr('{{ $json.url_hash }}'),
          title: expr('{{ $json.title }}'),
          url: expr('{{ $json.url }}'),
          source: expr('{{ $json.source }}'),
          published_at: expr('{{ $json.published_at }}'),
          summary: expr('{{ $json.summary }}'),
          category: expr('{{ $json.category }}'),
          products: expr('{{ $json.products }}'),
          impact_score: expr('{{ $json.impact_score }}'),
          impact_level: expr('{{ $json.impact_level }}'),
          impact_note: expr('{{ $json.impact_note }}'),
          matched_keywords: expr('{{ $json.matched_keywords }}'),
          lang: expr('{{ $json.lang }}'),
          is_read: false,
          is_starred: false
        },
        matchingColumns: [],
        schema: [
          { id: 'url_hash', displayName: 'url_hash', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'title', displayName: 'title', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'url', displayName: 'url', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'source', displayName: 'source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'published_at', displayName: 'published_at', required: false, defaultMatch: false, display: true, type: 'dateTime', canBeUsedToMatch: true },
          { id: 'summary', displayName: 'summary', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'category', displayName: 'category', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'products', displayName: 'products', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'impact_score', displayName: 'impact_score', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          { id: 'impact_level', displayName: 'impact_level', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'impact_note', displayName: 'impact_note', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'matched_keywords', displayName: 'matched_keywords', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'lang', displayName: 'lang', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'is_read', displayName: 'is_read', required: false, defaultMatch: false, display: true, type: 'boolean', canBeUsedToMatch: true },
          { id: 'is_starred', displayName: 'is_starred', required: false, defaultMatch: false, display: true, type: 'boolean', canBeUsedToMatch: true }
        ]
      },
      options: {}
    },
    position: [1552, 304]
  },
  output: [{ id: 1, url_hash: 'a1b2c3d4', createdAt: '2026-10-21T12:00:00.000Z' }]
});

const apiHook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'API articles (GET)',
    parameters: {
      httpMethod: 'GET',
      path: 'hemerion-veille-articles',
      responseMode: 'responseNode',
      options: { allowedOrigins: '*' }
    },
    position: [0, 700]
  },
  output: [{ query: { min_score: '0' } }]
});

const readArticles = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Lire les articles',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: '2iNDkywCKftvE4qh', cachedResultName: 'hemerion_veille_articles' },
      returnAll: false,
      limit: 500,
      orderBy: true,
      orderByColumn: 'published_at',
      orderByDirection: 'DESC'
    },
    position: [260, 700]
  },
  output: [{ id: 1, url_hash: 'a1b2c3d4', title: 'Hemerion receives FDA feedback', impact_score: 100 }]
});

const shape = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Formater la réponse',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Pr\u00e9pare la r\u00e9ponse JSON de l'API de lecture consomm\u00e9e par la plateforme.\nconst q = $('API articles (GET)').first().json.query || {};\nconst minScore = Number(q.min_score || 0);\nconst category = q.category || '';\nconst rows = $input.all().map(i => i.json).filter(r => r && r.url_hash);\nconst articles = rows\n  .filter(r => (r.impact_score || 0) >= minScore)\n  .filter(r => !category || r.category === category)\n  .map(r => ({\n    id: r.id,\n    url_hash: r.url_hash,\n    title: r.title,\n    url: r.url,\n    source: r.source,\n    published_at: r.published_at,\n    summary: r.summary,\n    category: r.category,\n    products: r.products,\n    impact_score: r.impact_score,\n    impact_level: r.impact_level,\n    impact_note: r.impact_note,\n    matched_keywords: r.matched_keywords,\n    created_at: r.created_at || r.createdAt\n  }));\nreturn [{ json: { generated_at: new Date().toISOString(), count: articles.length, articles } }];\n" },
    position: [520, 700]
  },
  output: [{ generated_at: '2026-10-21T12:00:00.000Z', count: 1, articles: [] }]
});

const respond = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Répondre en JSON',
    parameters: {
      respondWith: 'firstIncomingItem',
      options: {
        responseCode: 200,
        responseHeaders: { entries: [
          { name: 'Access-Control-Allow-Origin', value: '*' },
          { name: 'Cache-Control', value: 'max-age=300' }
        ] }
      }
    },
    position: [780, 700]
  },
  output: [{ ok: true }]
});

const nightly = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Chaque nuit à 3h',
    parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 3, triggerAtMinute: 17 }] } },
    position: [0, 1000]
  },
  output: [{}]
});

const purge = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Supprimer les articles de plus de 180 jours',
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: { __rl: true, mode: 'id', value: '2iNDkywCKftvE4qh', cachedResultName: 'hemerion_veille_articles' },
      matchType: 'allConditions',
      filters: { conditions: [
        { keyName: 'published_at', condition: 'lt', keyValue: expr('{{ $now.minus({ days: 180 }).toISO() }}') },
        { keyName: 'is_starred', condition: 'isFalse' }
      ] },
      options: {}
    },
    position: [260, 1000]
  },
  output: [{ id: 1 }]
});

const srcHook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'API sources (GET)',
    parameters: { httpMethod: 'GET', path: 'hemerion-veille-sources', responseMode: 'responseNode', options: { allowedOrigins: '*' } },
    position: [0, 1300]
  },
  output: [{ query: {} }]
});

const readSourcesApi = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Lire les sources (API)',
    alwaysOutputData: true,
    parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'id', value: 'DoObCjW2e284K5hT', cachedResultName: 'hemerion_veille_sources' }, returnAll: true, orderBy: true, orderByColumn: 'position', orderByDirection: 'ASC' },
    position: [272, 1300]
  },
  output: [{ id: 1, position: 1, axe: 'Hemerion & produits', label: 'Hemerion (EN)', query: 'Hemerion', url: '', lang: 'en', active: true }]
});

const shapeSources = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Formater les sources', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Liste des sources de veille renvoy\u00e9e \u00e0 la plateforme (GET /webhook/hemerion-veille-sources).\nconst sources = $input.all()\n  .map(i => i.json)\n  .filter(r => r && (r.query || r.url))\n  .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))\n  .map(r => ({\n    position: Number(r.position) || 0,\n    axe: r.axe || 'Autre',\n    label: r.label || '',\n    query: r.query || '',\n    url: r.url || '',\n    lang: r.lang === 'fr' ? 'fr' : 'en',\n    active: r.active !== false,\n    updated_at: r.updatedAt || r.createdAt || null\n  }));\nconst updated = sources.map(s => s.updated_at).filter(Boolean).sort().pop() || null;\nreturn [{ json: { generated_at: new Date().toISOString(), updated_at: updated, count: sources.length, sources } }];\n" }, position: [528, 1300] },
  output: [{ generated_at: '2026-10-31T12:00:00.000Z', count: 1, sources: [] }]
});

const respondSources = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: { name: 'Répondre (sources)', parameters: { respondWith: 'firstIncomingItem', options: { responseCode: 200, responseHeaders: { entries: [ { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Cache-Control', value: 'no-store' } ] } } }, position: [784, 1300] },
  output: [{ ok: true }]
});

const saveHook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {
    name: 'Modifier les sources (POST)',
    parameters: { httpMethod: 'POST', path: 'hemerion-veille-sources-save', responseMode: 'responseNode', options: { allowedOrigins: '*' } },
    position: [0, 1600]
  },
  output: [{ body: { key: '…', sources: '[]' } }]
});

const readKey = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Lire la clé',
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'get',
      dataTableId: { __rl: true, mode: 'id', value: 'R8vt9e2zG67Ht2FP', cachedResultName: 'hemerion_veille_reglages' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'cle', condition: 'eq', keyValue: 'edit_key' }] },
      returnAll: true
    },
    position: [272, 1600]
  },
  output: [{ cle: 'edit_key', valeur: '…' }]
});

const checkRequest = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Vérifier la demande', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// V\u00e9rifie la cl\u00e9 d'\u00e9dition et valide la nouvelle liste de sources envoy\u00e9e par la plateforme\n// (POST /webhook/hemerion-veille-sources, corps \u00ab key \u00bb + \u00ab sources \u00bb au format JSON).\nconst req = $('Modifier les sources (POST)').first().json;\nlet body = req.body || {};\nif (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }\n\nlet expected = '';\ntry {\n  const row = $('Lire la cl\u00e9').all().map(i => i.json).find(r => r && r.cle === 'edit_key');\n  expected = row ? String(row.valeur || '') : '';\n} catch (e) { expected = ''; }\n\nconst fail = (status, error) => [{ json: { ok: false, status, error } }];\nif (!expected) return fail(500, \"Aucune cl\u00e9 d'\u00e9dition n'est configur\u00e9e dans n8n (table hemerion_veille_reglages).\");\nif (String(body.key || '') !== expected) return fail(403, \"Cl\u00e9 d'\u00e9dition incorrecte.\");\n\nlet list = body.sources;\nif (typeof list === 'string') { try { list = JSON.parse(list); } catch (e) { return fail(400, 'Liste de sources illisible.'); } }\nif (!Array.isArray(list)) return fail(400, 'Liste de sources manquante.');\n\nconst txt = (v, max) => String(v == null ? '' : v).replace(/\\s+/g, ' ').trim().slice(0, max);\nconst errors = [];\nconst sources = [];\nlist.forEach((s, i) => {\n  if (!s || typeof s !== 'object') return;\n  const axe = txt(s.axe, 60);\n  const label = txt(s.label, 90);\n  const query = txt(s.query, 300);\n  let url = txt(s.url, 500);\n  if (!query && !url) return; // ligne vide ignor\u00e9e\n  if (url && !/^https:\\/\\/[^\\s]+$/i.test(url)) errors.push('Ligne ' + (i + 1) + ' : l\u2019adresse du flux doit commencer par https://');\n  if (url && query) url = ''; // une requ\u00eate Google News prime sur une adresse directe\n  sources.push({\n    position: sources.length + 1,\n    axe: axe || 'Autre',\n    label: label || query || url,\n    query,\n    url,\n    lang: s.lang === 'fr' ? 'fr' : 'en',\n    active: s.active !== false && s.active !== 'false'\n  });\n});\n\nif (errors.length) return fail(400, errors.join(' \u00b7 '));\nif (!sources.length) return fail(400, 'Il faut garder au moins une source.');\nif (sources.length > 60) return fail(400, 'Maximum 60 sources (le workflow interroge chaque flux \u00e0 chaque collecte).');\n\nreturn [{ json: { ok: true, status: 200, count: sources.length, active: sources.filter(s => s.active).length, sources } }];\n" }, position: [528, 1600] },
  output: [{ ok: true, status: 200, count: 1, active: 1, sources: [] }]
});

const isValid = ifElse({
  version: 2.2,
  config: {
    name: 'Demande valide ?',
    parameters: {
      looseTypeValidation: true,
      conditions: {
        combinator: 'and',
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.ok }}'), rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }]
      }
    },
    position: [784, 1600]
  }
});

const clearSources = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Vider la table des sources',
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: { __rl: true, mode: 'id', value: 'DoObCjW2e284K5hT', cachedResultName: 'hemerion_veille_sources' },
      matchType: 'allConditions',
      filters: { conditions: [{ keyName: 'id', condition: 'gt', keyValue: '0' }] },
      options: {}
    },
    position: [1040, 1500]
  },
  output: [{ id: 1 }]
});

const prepareRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer les lignes', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Une ligne par source valid\u00e9e, \u00e0 r\u00e9ins\u00e9rer dans la table apr\u00e8s l'avoir vid\u00e9e.\nreturn $('V\u00e9rifier la demande').first().json.sources.map(s => ({ json: s }));\n" }, position: [1296, 1500] },
  output: [{ position: 1, axe: 'Hemerion & produits', label: 'Hemerion (EN)', query: 'Hemerion', url: '', lang: 'en', active: true }]
});

const insertSources = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Enregistrer les sources',
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: { __rl: true, mode: 'id', value: 'DoObCjW2e284K5hT', cachedResultName: 'hemerion_veille_sources' },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          position: expr('{{ $json.position }}'),
          axe: expr('{{ $json.axe }}'),
          label: expr('{{ $json.label }}'),
          query: expr('{{ $json.query }}'),
          url: expr('{{ $json.url }}'),
          lang: expr('{{ $json.lang }}'),
          active: expr('{{ $json.active }}')
        },
        matchingColumns: [],
        schema: [
          { id: 'position', displayName: 'position', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          { id: 'axe', displayName: 'axe', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'label', displayName: 'label', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'query', displayName: 'query', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'url', displayName: 'url', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'lang', displayName: 'lang', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
          { id: 'active', displayName: 'active', required: false, defaultMatch: false, display: true, type: 'boolean', canBeUsedToMatch: true }
        ]
      },
      options: {}
    },
    position: [1552, 1500]
  },
  output: [{ id: 1 }]
});

const confirmSave = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Confirmer l’enregistrement', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// R\u00e9ponse envoy\u00e9e \u00e0 la plateforme apr\u00e8s l'enregistrement des sources.\nconst v = $('V\u00e9rifier la demande').first().json;\nreturn [{ json: { ok: true, saved_at: new Date().toISOString(), count: v.count, active: v.active,\n  message: v.active + ' source(s) active(s) sur ' + v.count + ' : elles seront utilis\u00e9es d\u00e8s la prochaine collecte.' } }];\n" }, position: [1808, 1500] },
  output: [{ ok: true, count: 1, active: 1, message: '…' }]
});

const respondSaved = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: { name: 'Répondre (enregistré)', parameters: { respondWith: 'firstIncomingItem', options: { responseCode: 200, responseHeaders: { entries: [ { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Cache-Control', value: 'no-store' } ] } } }, position: [2064, 1500] },
  output: [{ ok: true }]
});

const refuse = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Refuser la demande',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ JSON.stringify({ ok: false, error: $json.error }) }}'),
      options: { responseCode: expr('{{ $json.status || 400 }}'), responseHeaders: { entries: [ { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Cache-Control', value: 'no-store' } ] } }
    },
    position: [1040, 1700]
  },
  output: [{ ok: false }]
});

const note = sticky('## Veille pharma Hemerion\n\n**Collecte** (toutes les 6 h ou `POST /webhook/hemerion-veille-refresh`) : sources de la table `hemerion_veille_sources` (Google News FR/EN + flux RSS) → score d’impact sur Pentalafen® / Heliance® → déduplication → Data Table n8n `hemerion_veille_articles`.\n\n**API** : `GET /webhook/hemerion-veille-articles?min_score=50&category=Réglementaire` renvoie le JSON lu par la plateforme.\n\n**Sources** : `GET /webhook/hemerion-veille-sources` (liste) et `POST /webhook/hemerion-veille-sources-save` (clé + sources, édité depuis l’onglet Sources de la plateforme).', [], { color: 5, position: [-20, -160], width: 760, height: 300 });

export default workflow('hemerion-veille', 'Hemerion – Veille actualités pharma')
  .add(schedule)
  .to(existing)
  .to(readSources)
  .to(sources)
  .to(readRss)
  .to(scoring)
  .to(save)
  .add(refreshHook)
  .to(existing)
  .add(apiHook)
  .to(readArticles)
  .to(shape)
  .to(respond)
  .add(nightly)
  .to(purge)
  .add(srcHook)
  .to(readSourcesApi)
  .to(shapeSources)
  .to(respondSources)
  .add(saveHook)
  .to(readKey)
  .to(checkRequest)
  .to(isValid.onTrue(clearSources.to(prepareRows.to(insertSources.to(confirmSave.to(respondSaved))))).onFalse(refuse))
  .add(note)
  .group('Collecte et scoring', [existing, readSources, sources, readRss, scoring, save], { description: 'Lit les sources (table), interroge les flux RSS, score l’impact, déduplique et enregistre les nouveaux articles' })
  .group('API de lecture', [readArticles, shape, respond], { description: 'Renvoie les articles stockés (JSON + CORS) pour la plateforme de veille' })
  .group('Purge', [purge], { description: 'Chaque nuit, supprime les articles de plus de 180 jours (sauf favoris)' })
  .group('Sources : lecture', [readSourcesApi, shapeSources, respondSources], { description: 'GET /hemerion-veille-sources : axes et requêtes pour l’espace Sources de la plateforme' })
  .group('Sources : modification', [readKey, checkRequest, isValid, clearSources, prepareRows, insertSources, confirmSave, respondSaved, refuse], { description: 'POST /hemerion-veille-sources-save : vérifie la clé puis remplace la liste des sources utilisée par la collecte' });
