"""Génère le code Workflow SDK n8n (n8n/workflow.sdk.ts) en y injectant les Code nodes."""
import json, pathlib

here = pathlib.Path(__file__).parent
src = json.dumps((here / "code_sources.js").read_text())
scoring = json.dumps((here / "code_scoring.js").read_text())
api = json.dumps((here / "code_api.js").read_text())
src_api = json.dumps((here / "code_sources_api.js").read_text())
src_check = json.dumps((here / "code_sources_check.js").read_text())
src_rows = json.dumps((here / "code_sources_rows.js").read_text())
src_done = json.dumps((here / "code_sources_done.js").read_text())

TABLE = "hemerion_veille_articles"
TABLE_ID = "2iNDkywCKftvE4qh"  # Data Table n8n (projet personnel)
TABLE_RL = "{ __rl: true, mode: 'id', value: '" + TABLE_ID + "', cachedResultName: '" + TABLE + "' }"
COLUMNS = [("url_hash", "string"), ("title", "string"), ("url", "string"), ("source", "string"),
           ("published_at", "dateTime"), ("summary", "string"), ("category", "string"), ("products", "string"),
           ("impact_score", "number"), ("impact_level", "string"), ("impact_note", "string"),
           ("matched_keywords", "string"), ("lang", "string"), ("is_read", "boolean"), ("is_starred", "boolean")]
SRC_RL = "{ __rl: true, mode: 'id', value: 'DoObCjW2e284K5hT', cachedResultName: 'hemerion_veille_sources' }"  # sources éditables
REG_RL = "{ __rl: true, mode: 'id', value: 'R8vt9e2zG67Ht2FP', cachedResultName: 'hemerion_veille_reglages' }"  # clé d'édition (jamais dans le dépôt)
SRC_COLS = [("position", "number"), ("axe", "string"), ("label", "string"), ("query", "string"), ("url", "string"), ("lang", "string"), ("active", "boolean")]
SRC_VALUE = ",\n          ".join(f"{c}: expr('{{{{ $json.{c} }}}}')" for c, t in SRC_COLS)
SRC_SCHEMA = ",\n          ".join(
    f"{{ id: '{c}', displayName: '{c}', required: false, defaultMatch: false, display: true, type: '{t}', canBeUsedToMatch: true }}"
    for c, t in SRC_COLS)
CORS = "{ entries: [ { name: 'Access-Control-Allow-Origin', value: '*' }, { name: 'Cache-Control', value: 'no-store' } ] }"
MAP_VALUE = ",\n          ".join(
    f"{c}: false" if t == "boolean" else f"{c}: expr('{{{{ $json.{c} }}}}')" for c, t in COLUMNS)
MAP_SCHEMA = ",\n          ".join(
    f"{{ id: '{c}', displayName: '{c}', required: false, defaultMatch: false, display: true, type: '{t}', canBeUsedToMatch: true }}"
    for c, t in COLUMNS)

sdk = f"""import {{ workflow, node, trigger, sticky, expr, ifElse }} from '@n8n/workflow-sdk';

const schedule = trigger({{
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {{
    name: 'Toutes les 6 heures',
    parameters: {{ rule: {{ interval: [{{ field: 'hours', hoursInterval: 6 }}] }} }},
    position: [0, 200]
  }},
  output: [{{}}]
}});

const refreshHook = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {{
    name: 'Rafraîchir la veille (POST)',
    parameters: {{
      httpMethod: 'POST',
      path: 'hemerion-veille-refresh',
      responseMode: 'onReceived',
      options: {{ allowedOrigins: '*', responseData: '{{"status":"collecte lancée"}}' }}
    }},
    position: [0, 400]
  }},
  output: [{{ body: {{}} }}]
}});

const existing = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Articles déjà en base',
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {{
      resource: 'row',
      operation: 'get',
      dataTableId: {TABLE_RL},
      returnAll: false,
      limit: 2000,
      orderBy: true,
      orderByColumn: 'createdAt',
      orderByDirection: 'DESC'
    }},
    position: [260, 300]
  }},
  output: [{{ url_hash: 'a1b2c3d4' }}]
}});

const readSources = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Lire les sources',
    executeOnce: true,
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    parameters: {{
      resource: 'row',
      operation: 'get',
      dataTableId: {SRC_RL},
      returnAll: true,
      orderBy: true,
      orderByColumn: 'position',
      orderByDirection: 'ASC'
    }},
    position: [528, 304]
  }},
  output: [{{ position: 1, axe: 'Hemerion & produits', label: 'Hemerion (EN)', query: 'Hemerion', url: '', lang: 'en', active: true }}]
}});

const sources = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{
    name: 'Sources de veille',
    executeOnce: true,
    parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {src} }},
    position: [784, 304]
  }},
  output: [{{ label: 'Hemerion (EN)', axe: 'Hemerion & produits', lang: 'en', url: 'https://news.google.com/rss/search?q=Hemerion' }}]
}});

const readRss = node({{
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {{
    name: 'Lire les flux RSS',
    onError: 'continueRegularOutput',
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 1500,
    parameters: {{ url: expr('{{{{ $json.url }}}}'), options: {{ ignoreSSL: false }} }},
    position: [1040, 304]
  }},
  output: [{{ title: 'Hemerion receives FDA feedback - Fierce Biotech', link: 'https://example.com/a', isoDate: '2026-10-20T08:00:00.000Z', contentSnippet: 'Photodynamic therapy for glioblastoma' }}]
}});

const scoring = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{
    name: 'Scorer l’impact et dédupliquer',
    parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {scoring} }},
    position: [1296, 304]
  }},
  output: [{{ url_hash: 'a1b2c3d4', title: 'Hemerion receives FDA feedback', url: 'https://example.com/a', source: 'Fierce Biotech', published_at: '2026-10-20T08:00:00.000Z', summary: 'Photodynamic therapy for glioblastoma', category: 'Hemerion & produits', products: 'Pentalafen, Heliance', impact_score: 100, impact_level: 'critique', impact_note: 'Mention directe', matched_keywords: 'hemerion', lang: 'en' }}]
}});

const save = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Enregistrer dans la table',
    onError: 'continueRegularOutput',
    parameters: {{
      resource: 'row',
      operation: 'insert',
      dataTableId: {TABLE_RL},
      columns: {{
        mappingMode: 'defineBelow',
        value: {{
          {MAP_VALUE}
        }},
        matchingColumns: [],
        schema: [
          {MAP_SCHEMA}
        ]
      }},
      options: {{}}
    }},
    position: [1552, 304]
  }},
  output: [{{ id: 1, url_hash: 'a1b2c3d4', createdAt: '2026-10-21T12:00:00.000Z' }}]
}});

const apiHook = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {{
    name: 'API articles (GET)',
    parameters: {{
      httpMethod: 'GET',
      path: 'hemerion-veille-articles',
      responseMode: 'responseNode',
      options: {{ allowedOrigins: '*' }}
    }},
    position: [0, 700]
  }},
  output: [{{ query: {{ min_score: '0' }} }}]
}});

const readArticles = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Lire les articles',
    alwaysOutputData: true,
    parameters: {{
      resource: 'row',
      operation: 'get',
      dataTableId: {TABLE_RL},
      returnAll: false,
      limit: 500,
      orderBy: true,
      orderByColumn: 'published_at',
      orderByDirection: 'DESC'
    }},
    position: [260, 700]
  }},
  output: [{{ id: 1, url_hash: 'a1b2c3d4', title: 'Hemerion receives FDA feedback', impact_score: 100 }}]
}});

const shape = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{
    name: 'Formater la réponse',
    parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {api} }},
    position: [520, 700]
  }},
  output: [{{ generated_at: '2026-10-21T12:00:00.000Z', count: 1, articles: [] }}]
}});

const respond = node({{
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {{
    name: 'Répondre en JSON',
    parameters: {{
      respondWith: 'firstIncomingItem',
      options: {{
        responseCode: 200,
        responseHeaders: {{ entries: [
          {{ name: 'Access-Control-Allow-Origin', value: '*' }},
          {{ name: 'Cache-Control', value: 'max-age=300' }}
        ] }}
      }}
    }},
    position: [780, 700]
  }},
  output: [{{ ok: true }}]
}});

const nightly = trigger({{
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {{
    name: 'Chaque nuit à 3h',
    parameters: {{ rule: {{ interval: [{{ field: 'days', daysInterval: 1, triggerAtHour: 3, triggerAtMinute: 17 }}] }} }},
    position: [0, 1000]
  }},
  output: [{{}}]
}});

const purge = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Supprimer les articles de plus de 180 jours',
    alwaysOutputData: true,
    parameters: {{
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: {TABLE_RL},
      matchType: 'allConditions',
      filters: {{ conditions: [
        {{ keyName: 'published_at', condition: 'lt', keyValue: expr('{{{{ $now.minus({{ days: 180 }}).toISO() }}}}') }},
        {{ keyName: 'is_starred', condition: 'isFalse' }}
      ] }},
      options: {{}}
    }},
    position: [260, 1000]
  }},
  output: [{{ id: 1 }}]
}});

const srcHook = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {{
    name: 'API sources (GET)',
    parameters: {{ httpMethod: 'GET', path: 'hemerion-veille-sources', responseMode: 'responseNode', options: {{ allowedOrigins: '*' }} }},
    position: [0, 1300]
  }},
  output: [{{ query: {{}} }}]
}});

const readSourcesApi = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Lire les sources (API)',
    alwaysOutputData: true,
    parameters: {{ resource: 'row', operation: 'get', dataTableId: {SRC_RL}, returnAll: true, orderBy: true, orderByColumn: 'position', orderByDirection: 'ASC' }},
    position: [272, 1300]
  }},
  output: [{{ id: 1, position: 1, axe: 'Hemerion & produits', label: 'Hemerion (EN)', query: 'Hemerion', url: '', lang: 'en', active: true }}]
}});

const shapeSources = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{ name: 'Formater les sources', parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {src_api} }}, position: [528, 1300] }},
  output: [{{ generated_at: '2026-10-31T12:00:00.000Z', count: 1, sources: [] }}]
}});

const respondSources = node({{
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {{ name: 'Répondre (sources)', parameters: {{ respondWith: 'firstIncomingItem', options: {{ responseCode: 200, responseHeaders: {CORS} }} }}, position: [784, 1300] }},
  output: [{{ ok: true }}]
}});

const saveHook = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.2,
  config: {{
    name: 'Modifier les sources (POST)',
    parameters: {{ httpMethod: 'POST', path: 'hemerion-veille-sources-save', responseMode: 'responseNode', options: {{ allowedOrigins: '*' }} }},
    position: [0, 1600]
  }},
  output: [{{ body: {{ key: '…', sources: '[]' }} }}]
}});

const readKey = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Lire la clé',
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {{
      resource: 'row',
      operation: 'get',
      dataTableId: {REG_RL},
      matchType: 'allConditions',
      filters: {{ conditions: [{{ keyName: 'cle', condition: 'eq', keyValue: 'edit_key' }}] }},
      returnAll: true
    }},
    position: [272, 1600]
  }},
  output: [{{ cle: 'edit_key', valeur: '…' }}]
}});

const checkRequest = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{ name: 'Vérifier la demande', parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {src_check} }}, position: [528, 1600] }},
  output: [{{ ok: true, status: 200, count: 1, active: 1, sources: [] }}]
}});

const isValid = ifElse({{
  version: 2.2,
  config: {{
    name: 'Demande valide ?',
    parameters: {{
      looseTypeValidation: true,
      conditions: {{
        combinator: 'and',
        options: {{ caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }},
        conditions: [{{ leftValue: expr('{{{{ $json.ok }}}}'), rightValue: '', operator: {{ type: 'boolean', operation: 'true', singleValue: true }} }}]
      }}
    }},
    position: [784, 1600]
  }}
}});

const clearSources = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Vider la table des sources',
    alwaysOutputData: true,
    executeOnce: true,
    parameters: {{
      resource: 'row',
      operation: 'deleteRows',
      dataTableId: {SRC_RL},
      matchType: 'allConditions',
      filters: {{ conditions: [{{ keyName: 'id', condition: 'gt', keyValue: '0' }}] }},
      options: {{}}
    }},
    position: [1040, 1500]
  }},
  output: [{{ id: 1 }}]
}});

const prepareRows = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{ name: 'Préparer les lignes', parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {src_rows} }}, position: [1296, 1500] }},
  output: [{{ position: 1, axe: 'Hemerion & produits', label: 'Hemerion (EN)', query: 'Hemerion', url: '', lang: 'en', active: true }}]
}});

const insertSources = node({{
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {{
    name: 'Enregistrer les sources',
    parameters: {{
      resource: 'row',
      operation: 'insert',
      dataTableId: {SRC_RL},
      columns: {{
        mappingMode: 'defineBelow',
        value: {{
          {SRC_VALUE}
        }},
        matchingColumns: [],
        schema: [
          {SRC_SCHEMA}
        ]
      }},
      options: {{}}
    }},
    position: [1552, 1500]
  }},
  output: [{{ id: 1 }}]
}});

const confirmSave = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{ name: 'Confirmer l’enregistrement', parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {src_done} }}, position: [1808, 1500] }},
  output: [{{ ok: true, count: 1, active: 1, message: '…' }}]
}});

const respondSaved = node({{
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {{ name: 'Répondre (enregistré)', parameters: {{ respondWith: 'firstIncomingItem', options: {{ responseCode: 200, responseHeaders: {CORS} }} }}, position: [2064, 1500] }},
  output: [{{ ok: true }}]
}});

const refuse = node({{
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {{
    name: 'Refuser la demande',
    parameters: {{
      respondWith: 'json',
      responseBody: expr('{{{{ JSON.stringify({{ ok: false, error: $json.error }}) }}}}'),
      options: {{ responseCode: expr('{{{{ $json.status || 400 }}}}'), responseHeaders: {CORS} }}
    }},
    position: [1040, 1700]
  }},
  output: [{{ ok: false }}]
}});

const note = sticky('## Veille pharma Hemerion\\n\\n**Collecte** (toutes les 6 h ou `POST /webhook/hemerion-veille-refresh`) : sources de la table `hemerion_veille_sources` (Google News FR/EN + flux RSS) → score d’impact sur Pentalafen® / Heliance® → déduplication → Data Table n8n `{TABLE}`.\\n\\n**API** : `GET /webhook/hemerion-veille-articles?min_score=50&category=Réglementaire` renvoie le JSON lu par la plateforme.\\n\\n**Sources** : `GET /webhook/hemerion-veille-sources` (liste) et `POST /webhook/hemerion-veille-sources-save` (clé + sources, édité depuis l’onglet Sources de la plateforme).', [], {{ color: 5, position: [-20, -160], width: 760, height: 300 }});

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
  .group('Collecte et scoring', [existing, readSources, sources, readRss, scoring, save], {{ description: 'Lit les sources (table), interroge les flux RSS, score l’impact, déduplique et enregistre les nouveaux articles' }})
  .group('API de lecture', [readArticles, shape, respond], {{ description: 'Renvoie les articles stockés (JSON + CORS) pour la plateforme de veille' }})
  .group('Purge', [purge], {{ description: 'Chaque nuit, supprime les articles de plus de 180 jours (sauf favoris)' }})
  .group('Sources : lecture', [readSourcesApi, shapeSources, respondSources], {{ description: 'GET /hemerion-veille-sources : axes et requêtes pour l’espace Sources de la plateforme' }})
  .group('Sources : modification', [readKey, checkRequest, isValid, clearSources, prepareRows, insertSources, confirmSave, respondSaved, refuse], {{ description: 'POST /hemerion-veille-sources-save : vérifie la clé puis remplace la liste des sources utilisée par la collecte' }});
"""
(here / "workflow.sdk.ts").write_text(sdk)
print(len(sdk))
