# Radar Hemerion — veille des actualités pharma

Automatisation de veille pour **Hemerion Therapeutics** (Villeneuve-d'Ascq), qui développe une thérapie photodynamique peropératoire contre le glioblastome :

| Produit | Nature | Statuts clés |
|---|---|---|
| **Pentalafen®** | Médicament oral, chlorhydrate d'acide 5-aminolévulinique (5-ALA), 2 g avant chirurgie | Désignation orpheline FDA (2021) et EMA, Fast Track FDA (2025) |
| **Heliance®** | Dispositif d'illumination : laser non thermique 635 nm + diffuseur à ballonnet à usage unique | Statut de dispositif médical orphelin (EMA, avril 2026), ISO 13485:2016, marquage CE en préparation |

Essai HTX-GBM01 (phase 1/2, UPMC Pittsburgh + CHU de Lille) : inclusions terminées en mai 2026. Essai pivot en préparation, lancement commercial visé en 2030 (US/UE).

## Architecture

```
Planificateur (toutes les 6 h) ─┐
Webhook POST /hemerion-veille-refresh ─┴─► Data Table n8n : articles déjà vus
                                             └─► Data Table n8n : hemerion_veille_sources (axes + requêtes)
                                                  └─► flux RSS actifs (Google News FR/EN + flux directs, ex. FDA)
                                                  └─► Score d'impact + catégorie + produit + déduplication
                                                       └─► Data Table n8n : hemerion_veille_articles

Webhook GET /hemerion-veille-articles ─► Data Table n8n ─► JSON (CORS) ─► plateforme web

Chaque nuit à 3 h ─► supprime les articles publiés il y a plus de 180 jours (sauf favoris)

Webhook GET  /hemerion-veille-sources      ─► liste des axes et requêtes (onglet « Sources de veille »)
Webhook POST /hemerion-veille-sources-save ─► vérifie la clé d'édition ─► remplace hemerion_veille_sources
```

- **Workflow n8n** : « Hemerion – Veille actualités pharma » (`n8n/workflow.sdk.ts`, nœuds Code dans `n8n/*.js`)
- **Sources** : Data Table n8n `hemerion_veille_sources` (colonnes : position, axe, label, query, url, lang, active), éditée depuis l'onglet **Sources de veille** de la plateforme. Si la table est vide, le workflow utilise la liste par défaut de `n8n/code_sources.js`. Instantané pour la page : `data/sources.json`.
- **Clé d'édition** : Data Table n8n `hemerion_veille_reglages` (ligne `cle = edit_key`). Elle n'est jamais stockée dans ce dépôt public ; pour la changer, modifier la valeur dans n8n (menu *Data tables*).
- **Stockage** : Data Table n8n `hemerion_veille_articles` (aucune base externe ; colonnes : url_hash, title, url, source, published_at, summary, category, products, impact_score, impact_level, impact_note, matched_keywords, lang, is_read, is_starred)
- **Plateforme** : `index.html` (GitHub Pages) — lit l'API n8n, sinon l'instantané embarqué (`data/articles.json`)

### Axes de veille et score d'impact (0–100)

| Axe | Exemples de signaux | Poids |
|---|---|---|
| Hemerion & produits | Hemerion, Pentalafen, Heliance | +90 à +100 |
| Technologie PDT / 5-ALA | photodynamic, 5-ALA, Gleolan/Gliolan | +35 |
| Concurrence glioblastome | glioblastome, Novocure/TTFields, sonodynamique, LITT, vorasidenib, témozolomide | +15 à +35 |
| Réglementaire | orphan, produits combinés, MDR / marquage CE, fast track, paquet pharma UE | +8 à +25 |
| Marché & financement | neurochirurgie, remboursement, levées, M&A | +6 à +15 |

Niveaux : **critique** ≥ 80, **élevé** ≥ 50, **modéré** ≥ 30. Seuls les articles de moins de 30 jours et au-dessus de 30 sont conservés.

## Mise en route

1. **n8n** : le workflow est publié et la Data Table `hemerion_veille_articles` existe déjà (menu *Data tables* du projet). Lancer une collecte : `curl -X POST https://margauxbouriez2.app.n8n.cloud/webhook/hemerion-veille-refresh`
2. **Vérifier l'API** : `https://margauxbouriez2.app.n8n.cloud/webhook/hemerion-veille-articles?min_score=50` (paramètre optionnel `category=Réglementaire`)
3. **Plateforme** : activer GitHub Pages (Settings → Pages → branche `main`, dossier racine). La page bascule automatiquement de « Instantané » à « En direct » dès que l'API répond.

## Modifier la veille

- **Ajouter / modifier / désactiver des sources** : onglet **Sources de veille** de la plateforme (`index.html#sources`). Chaque ligne est une recherche Google News (30 derniers jours) ou un flux RSS direct, rangée dans un axe. *Enregistrer dans n8n* demande la clé d'édition ; la nouvelle liste est utilisée dès la collecte suivante (bouton *Lancer une collecte maintenant*). Le bouton *Tester* ouvre les résultats actuels de la recherche.
- L'axe sert à organiser les recherches ; la catégorie affichée sur chaque article reste calculée par les mots-clés du score. Un article trouvé par une nouvelle recherche n'est gardé que s'il atteint 30 points.
- Liste de secours (table vide) : `DEFAULTS` dans `n8n/code_sources.js`
- Ajuster les mots-clés et les poids : tableau `RULES` dans `n8n/code_scoring.js`
- Régénérer le code SDK : `python3 n8n/build_sdk.py`, puis mettre à jour le nœud correspondant dans n8n
- Régénérer la page après mise à jour des instantanés (`data/articles.json`, `data/sources.json`) : `python3 web/build.py`

## Pistes d'extension


- Résumé et note d'impact rédigés par Claude (nœud Anthropic de n8n) pour les articles ≥ 50
- Alerte Gmail quotidienne pour les articles « critique » (credential Gmail déjà présent dans n8n)
- Suivi ClinicalTrials.gov des essais concurrents en glioblastome nouvellement diagnostiqué
