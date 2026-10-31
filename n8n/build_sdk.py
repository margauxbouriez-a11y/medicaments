"""Génère le code Workflow SDK n8n (n8n/workflow.sdk.ts) en y injectant les Code nodes."""
import json, pathlib

here = pathlib.Path(__file__).parent
src = json.dumps((here / "code_sources.js").read_text())
scoring = json.dumps((here / "code_scoring.js").read_text())
api = json.dumps((here / "code_api.js").read_text())

TABLE = "hemerion_veille_articles"
TABLE_ID = "2iNDkywCKftvE4qh"  # Data Table n8n (projet personnel)
TABLE_RL = "{ __rl: true, mode: 'id', value: '" + TABLE_ID + "', cachedResultName: '" + TABLE + "' }"
COLUMNS = [("url_hash", "string"), ("title", "string"), ("url", "string"), ("source", "string"),
           ("published_at", "dateTime"), ("summary", "string"), ("category", "string"), ("products", "string"),
           ("impact_score", "number"), ("impact_level", "string"), ("impact_note", "string"),
           ("matched_keywords", "string"), ("lang", "string"), ("is_read", "boolean"), ("is_starred", "boolean")]
MAP_VALUE = ",\n          ".join(
    f"{c}: false" if t == "boolean" else f"{c}: expr('{{{{ $json.{c} }}}}')" for c, t in COLUMNS)
MAP_SCHEMA = ",\n          ".join(
    f"{{ id: '{c}', displayName: '{c}', required: false, defaultMatch: false, display: true, type: '{t}', canBeUsedToMatch: true }}"
    for c, t in COLUMNS)

sdk = f"""import {{ workflow, node, trigger, sticky, expr }} from '@n8n/workflow-sdk';

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

const sources = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{
    name: 'Sources de veille',
    executeOnce: true,
    parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {src} }},
    position: [520, 300]
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
    position: [780, 300]
  }},
  output: [{{ title: 'Hemerion receives FDA feedback - Fierce Biotech', link: 'https://example.com/a', isoDate: '2026-10-20T08:00:00.000Z', contentSnippet: 'Photodynamic therapy for glioblastoma' }}]
}});

const scoring = node({{
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {{
    name: 'Scorer l’impact et dédupliquer',
    parameters: {{ mode: 'runOnceForAllItems', language: 'javaScript', jsCode: {scoring} }},
    position: [1040, 300]
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
    position: [1300, 300]
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

const note = sticky('## Veille pharma Hemerion\\n\\n**Collecte** (toutes les 6 h ou `POST /webhook/hemerion-veille-refresh`) : 21 flux RSS (Google News FR/EN + FDA) → score d’impact sur Pentalafen® / Heliance® → déduplication → Data Table n8n `{TABLE}`.\\n\\n**API** : `GET /webhook/hemerion-veille-articles?min_score=50&category=Réglementaire` renvoie le JSON lu par la plateforme.', [], {{ color: 5, position: [-20, -160], width: 760, height: 300 }});

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
  .add(nightly)
  .to(purge)
  .add(note)
  .group('Collecte et scoring', [existing, sources, readRss, scoring, save], {{ description: 'Lit les flux RSS ciblés, score l’impact sur Hemerion, déduplique et enregistre les nouveaux articles dans la Data Table' }})
  .group('API de lecture', [readArticles, shape, respond], {{ description: 'Renvoie les articles stockés (JSON + CORS) pour la plateforme de veille' }})
  .group('Purge', [purge], {{ description: 'Chaque nuit, supprime les articles publiés il y a plus de 180 jours (sauf ceux marqués comme favoris)' }});
"""
(here / "workflow.sdk.ts").write_text(sdk)
print(len(sdk))
