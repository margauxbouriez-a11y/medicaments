import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

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

const sources = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Sources de veille',
    executeOnce: true,
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Sources de veille Hemerion \u2014 une entr\u00e9e par flux RSS interrog\u00e9.\n// Google News RSS permet des requ\u00eates cibl\u00e9es (FR + EN) ; les flux officiels sont filtr\u00e9s ensuite par mots-cl\u00e9s.\nconst gn = (q, lang) => {\n  const hl = lang === 'fr' ? 'hl=fr&gl=FR&ceid=FR:fr' : 'hl=en-US&gl=US&ceid=US:en';\n  return 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:30d') + '&' + hl;\n};\n\nconst sources = [\n  // 1. Mentions directes de la start-up et de ses produits\n  { label: 'Hemerion (EN)', axe: 'Hemerion & produits', lang: 'en', url: gn('Hemerion', 'en') },\n  { label: 'Hemerion (FR)', axe: 'Hemerion & produits', lang: 'fr', url: gn('Hemerion', 'fr') },\n  { label: 'Pentalafen / Heliance', axe: 'Hemerion & produits', lang: 'en', url: gn('Pentalafen OR Heliance photodynamic', 'en') },\n\n  // 2. Technologie : th\u00e9rapie photodynamique, 5-ALA\n  { label: 'PDT glioblastome (EN)', axe: 'Technologie PDT / 5-ALA', lang: 'en', url: gn('photodynamic therapy glioblastoma', 'en') },\n  { label: 'PDT glioblastome (FR)', axe: 'Technologie PDT / 5-ALA', lang: 'fr', url: gn('th\u00e9rapie photodynamique glioblastome', 'fr') },\n  { label: '5-ALA / aminolevulinic acid', axe: 'Technologie PDT / 5-ALA', lang: 'en', url: gn('\"aminolevulinic acid\" OR 5-ALA cancer', 'en') },\n  { label: 'Gleolan / Gliolan', axe: 'Technologie PDT / 5-ALA', lang: 'en', url: gn('Gleolan OR Gliolan OR photonamic', 'en') },\n\n  // 3. Paysage concurrentiel glioblastome\n  { label: 'Glioblastome \u2013 essais & approbations', axe: 'Concurrence glioblastome', lang: 'en', url: gn('glioblastoma FDA approval OR \"phase 3\" OR pivotal', 'en') },\n  { label: 'Glioblastome (FR)', axe: 'Concurrence glioblastome', lang: 'fr', url: gn('glioblastome traitement essai', 'fr') },\n  { label: 'Novocure / Optune / TTFields', axe: 'Concurrence glioblastome', lang: 'en', url: gn('Novocure Optune OR \"tumor treating fields\" glioblastoma', 'en') },\n  { label: 'Sonodynamique / LITT / ultrasons', axe: 'Concurrence glioblastome', lang: 'en', url: gn('sonodynamic OR \"laser interstitial thermal therapy\" OR \"focused ultrasound\" glioblastoma', 'en') },\n  { label: 'Vorasidenib / immunoth\u00e9rapies gliome', axe: 'Concurrence glioblastome', lang: 'en', url: gn('vorasidenib OR \"CAR-T\" OR \"oncolytic virus\" glioma', 'en') },\n\n  // 4. R\u00e9glementaire (FDA, EMA, MDR, ANSM, HAS)\n  { label: 'FDA \u2013 produits combin\u00e9s m\u00e9dicament-dispositif', axe: 'R\u00e9glementaire', lang: 'en', url: gn('FDA \"combination product\" drug device guidance', 'en') },\n  { label: 'FDA \u2013 orphan drug / fast track oncologie', axe: 'R\u00e9glementaire', lang: 'en', url: gn('FDA \"orphan drug\" OR \"fast track\" brain cancer', 'en') },\n  { label: 'EMA \u2013 m\u00e9dicaments orphelins / r\u00e9forme pharma UE', axe: 'R\u00e9glementaire', lang: 'en', url: gn('EMA orphan OR \"EU pharmaceutical legislation\" OR \"pharma package\"', 'en') },\n  { label: 'MDR \u2013 dispositifs m\u00e9dicaux UE', axe: 'R\u00e9glementaire', lang: 'en', url: gn('\"Medical Device Regulation\" MDR EU 2026 OR \"CE marking\" medical device', 'en') },\n  { label: 'ANSM / HAS / acc\u00e8s pr\u00e9coce', axe: 'R\u00e9glementaire', lang: 'fr', url: gn('ANSM OR HAS \"acc\u00e8s pr\u00e9coce\" OR \"forfait innovation\" dispositif m\u00e9dical', 'fr') },\n  { label: 'FDA \u2013 communiqu\u00e9s officiels', axe: 'R\u00e9glementaire', lang: 'en', url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml' },\n\n  // 5. March\u00e9, financement, neurochirurgie\n  { label: 'Financement medtech / biotech France', axe: 'March\u00e9 & financement', lang: 'fr', url: gn('lev\u00e9e de fonds biotech OR medtech oncologie France', 'fr') },\n  { label: 'Neurochirurgie \u2013 dispositifs & M&A', axe: 'March\u00e9 & financement', lang: 'en', url: gn('neurosurgery device acquisition OR funding brain tumor', 'en') },\n  { label: 'Prix & remboursement oncologie', axe: 'March\u00e9 & financement', lang: 'en', url: gn('oncology drug pricing reimbursement Europe OR \"Inflation Reduction Act\" orphan', 'en') }\n];\n\nreturn sources.map(s => ({ json: s }));\n" },
    position: [520, 300]
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
    position: [780, 300]
  },
  output: [{ title: 'Hemerion receives FDA feedback - Fierce Biotech', link: 'https://example.com/a', isoDate: '2026-10-20T08:00:00.000Z', contentSnippet: 'Photodynamic therapy for glioblastoma' }]
});

const scoring = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Scorer l’impact et dédupliquer',
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Normalise les articles RSS, calcule un score d'impact pour Hemerion, d\u00e9duplique\n// (dans le lot et contre ce qui est d\u00e9j\u00e0 dans la Data Table) et ne garde que l'essentiel.\nlet existing = [];\ntry {\n  existing = $('Articles d\u00e9j\u00e0 en base').all().map(i => i.json.url_hash).filter(Boolean);\n} catch (e) { existing = []; }\nconst seen = new Set(existing);\n\nconst MAX_AGE_DAYS = 30;\nconst MIN_SCORE = 30;\n\n// R\u00e8gles : [regex, poids, cat\u00e9gorie, produit(s) concern\u00e9(s)]\nconst RULES = [\n  [/hemerion/i, 100, 'Hemerion & produits', ['Pentalafen', 'Heliance']],\n  [/pentalafen/i, 100, 'Hemerion & produits', ['Pentalafen']],\n  [/heliance/i, 90, 'Hemerion & produits', ['Heliance']],\n  [/glioblastom|\\bGBM\\b|high-grade glioma|gliome de haut grade/i, 35, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],\n  [/glioma|gliome|brain tumou?r|tumeur c\u00e9r\u00e9brale|cancer du cerveau|brain cancer/i, 15, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],\n  [/photodynami|\\bPDT\\b|phototh\u00e9rap/i, 35, 'Technologie PDT / 5-ALA', ['Pentalafen', 'Heliance']],\n  [/aminolevulin|5-ALA|\\bALA\\b|gleolan|gliolan|protoporphyrin|fluorescence-guided/i, 35, 'Technologie PDT / 5-ALA', ['Pentalafen']],\n  [/laser|optical fib|fibre optique|illumination|light-activated/i, 10, 'Technologie PDT / 5-ALA', ['Heliance']],\n  [/novocure|optune|tumor treating fields|TTFields|sonalasense|sonodynamic|sonodynamique|LITT|laser interstitial|focused ultrasound|vorasidenib|temozolomide|t\u00e9mozolomide|stupp/i, 25, 'Concurrence glioblastome', ['Pentalafen', 'Heliance']],\n  [/combination product|produit combin\u00e9|drug-device|m\u00e9dicament-dispositif/i, 25, 'R\u00e9glementaire', ['Pentalafen', 'Heliance']],\n  [/orphan|orphelin/i, 15, 'R\u00e9glementaire', ['Pentalafen', 'Heliance']],\n  [/fast track|breakthrough|priority review|accelerated approval|acc\u00e8s pr\u00e9coce|early access/i, 12, 'R\u00e9glementaire', ['Pentalafen']],\n  [/\\bMDR\\b|medical device regulation|CE mark|marquage CE|notified bod|organisme notifi\u00e9|dispositif m\u00e9dical|medical device|510\\(k\\)|\\bPMA\\b|de novo|CDRH/i, 15, 'R\u00e9glementaire', ['Heliance']],\n  [/\\bFDA\\b|\\bEMA\\b|\\bANSM\\b|\\bHAS\\b|\\bCHMP\\b|marketing authori|autorisation de mise sur le march\u00e9|\\bAMM\\b|\\bIND\\b/i, 8, 'R\u00e9glementaire', []],\n  [/pharmaceutical legislation|pharma package|r\u00e9forme pharmaceutique|market exclusivity|exclusivit\u00e9/i, 15, 'R\u00e9glementaire', ['Pentalafen']],\n  [/reimburse|rembourse|pricing|prix|tarif|forfait innovation|payer/i, 8, 'March\u00e9 & financement', []],\n  [/neurosurg|neurochirurg|resection|r\u00e9section/i, 15, 'March\u00e9 & financement', ['Heliance']],\n  [/funding|financing|raises|lev\u00e9e de fonds|l\u00e8ve|series [A-C]|acquisition|acquires|rach\u00e8te|IPO|introduction en bourse/i, 6, 'March\u00e9 & financement', []],\n  [/oncolog|cancer|tumou?r/i, 4, null, []],\n  [/lille|hauts-de-france|bpifrance|france 2030|UPMC|pittsburgh/i, 6, null, []]\n];\n\nconst NOTES = {\n  'Hemerion & produits': \"Mention directe d'Hemerion ou de ses produits : \u00e0 lire en priorit\u00e9 (image, partenaires, concurrence directe).\",\n  'Technologie PDT / 5-ALA': 'Concerne la classe th\u00e9rapeutique de Pentalafen\u00ae/Heliance\u00ae (5-ALA + lumi\u00e8re) : donn\u00e9es cliniques, s\u00e9curit\u00e9 ou approbations qui servent de r\u00e9f\u00e9rence ou de comparateur.',\n  'Concurrence glioblastome': \"\u00c9volution du standard de soins ou d'un concurrent sur le glioblastome nouvellement diagnostiqu\u00e9 : peut modifier le comparateur de l'essai pivot et le positionnement commercial.\",\n  'R\u00e9glementaire': \"Changement de r\u00e8gles ou de pratiques des autorit\u00e9s (FDA, EMA, MDR, ANSM/HAS) applicables au m\u00e9dicament orphelin Pentalafen\u00ae ou au dispositif Heliance\u00ae : impact sur le calendrier d'autorisation 2030.\",\n  'March\u00e9 & financement': \"Signal de march\u00e9 (financement, M&A, prix/remboursement, neurochirurgie) utile pour la lev\u00e9e de fonds, les partenariats et l'acc\u00e8s au march\u00e9.\"\n};\n\nfunction hash(str) {\n  let h = 0x811c9dc5;\n  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }\n  return h.toString(16).padStart(8, '0');\n}\nfunction clean(s) {\n  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, \"'\").replace(/&quot;/g, '\"').replace(/\\s+/g, ' ').trim();\n}\n\nconst now = Date.now();\nconst out = [];\nconst titleSeen = new Set();\n\nfor (const item of $input.all()) {\n  const a = item.json;\n  if (!a || a.error || !a.title || !a.link) continue;\n  const link = String(a.link);\n  const isGoogle = link.includes('news.google.com');\n\n  let title = clean(a.title);\n  let publisher = clean(a.creator || '');\n  // Google News : \"Titre - M\u00e9dia\"\n  const m = title.match(/^(.*) - ([^-]{2,60})$/);\n  if (m && isGoogle) { title = m[1].trim(); publisher = publisher || m[2].trim(); }\n  if (!publisher && link.includes('fda.gov')) publisher = 'U.S. FDA';\n  if (!publisher) { try { publisher = new URL(link).hostname.replace(/^www\\./, ''); } catch (e) { publisher = 'Source inconnue'; } }\n\n  const published = new Date(a.isoDate || a.pubDate || now);\n  const ageDays = (now - published.getTime()) / 86400000;\n  if (isNaN(ageDays) || ageDays > MAX_AGE_DAYS) continue;\n\n  let summary = clean(a.contentSnippet || a.content || a.summary || '').slice(0, 600);\n  // Google News ne fournit que \"titre + m\u00e9dia\" en description : inutile de le dupliquer\n  if (isGoogle && summary.toLowerCase().startsWith(title.toLowerCase().slice(0, 40))) summary = '';\n  const text = title + ' ' + summary;\n\n  let score = 0; const cats = {}; const prods = new Set(); const kws = [];\n  for (const [re, w, cat, p] of RULES) {\n    const hit = text.match(re);\n    if (hit) {\n      score += w; kws.push(hit[0]);\n      if (cat) cats[cat] = (cats[cat] || 0) + w;\n      p.forEach(x => prods.add(x));\n    }\n  }\n  // Fra\u00eecheur : bonus pour les 3 derniers jours\n  if (ageDays <= 3) score += 5;\n  if (score < MIN_SCORE) continue;\n\n  const category = Object.keys(cats).sort((x, y) => cats[y] - cats[x])[0] || 'March\u00e9 & financement';\n  const normTitle = title.toLowerCase().replace(/[^a-z0-9\u00e0\u00e2\u00e7\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00fb\u00f9\u00fc\u00ff\u0153]+/g, ' ').trim();\n  const url_hash = hash(normTitle);\n  if (seen.has(url_hash) || titleSeen.has(normTitle)) continue;\n  seen.add(url_hash); titleSeen.add(normTitle);\n\n  const impact_score = Math.min(100, score);\n  out.push({\n    json: {\n      url_hash,\n      title,\n      url: a.link,\n      source: publisher,\n      published_at: published.toISOString(),\n      summary,\n      category,\n      products: [...prods].join(', ') || 'Veille g\u00e9n\u00e9rale',\n      impact_score,\n      impact_level: impact_score >= 80 ? 'critique' : impact_score >= 50 ? '\u00e9lev\u00e9' : 'mod\u00e9r\u00e9',\n      impact_note: NOTES[category] || '',\n      matched_keywords: [...new Set(kws.map(k => k.toLowerCase()))].slice(0, 8).join(', '),\n      lang: /[\u00e0\u00e2\u00e7\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00fb\u00f9\u0153]| le | la | les | des | du /i.test(title) ? 'fr' : 'en'\n    }\n  });\n}\n\nout.sort((x, y) => y.json.impact_score - x.json.impact_score);\nreturn out.slice(0, 150);\n" },
    position: [1040, 300]
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
    position: [1300, 300]
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

const note = sticky('## Veille pharma Hemerion\n\n**Collecte** (toutes les 6 h ou `POST /webhook/hemerion-veille-refresh`) : 21 flux RSS (Google News FR/EN + FDA) → score d’impact sur Pentalafen® / Heliance® → déduplication → Data Table n8n `hemerion_veille_articles`.\n\n**API** : `GET /webhook/hemerion-veille-articles?min_score=50&category=Réglementaire` renvoie le JSON lu par la plateforme.', [], { color: 5, position: [-20, -160], width: 760, height: 300 });

export default workflow('hemerion-veille', 'Hemerion – Veille actualités pharma')
  .add(schedule)
  .to(existing)
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
  .add(note)
  .group('Collecte et scoring', [existing, sources, readRss, scoring, save], { description: 'Lit les flux RSS ciblés, score l’impact sur Hemerion, déduplique et enregistre les nouveaux articles dans la Data Table' })
  .group('API de lecture', [readArticles, shape, respond], { description: 'Renvoie les articles stockés (JSON + CORS) pour la plateforme de veille' });
