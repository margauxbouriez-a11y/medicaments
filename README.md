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
Webhook POST /hemerion-veille-refresh ─┴─► Supabase : articles déjà vus
                                             └─► 21 flux RSS (Google News FR/EN + FDA)
                                                  └─► Score d'impact + catégorie + produit + déduplication
                                                       └─► Supabase : hemerion_veille_articles

Webhook GET /hemerion-veille-articles ─► Supabase ─► JSON (CORS) ─► plateforme web
```

- **Workflow n8n** : « Hemerion – Veille actualités pharma » (`n8n/workflow.sdk.ts`, nœuds Code dans `n8n/*.js`)
- **Base** : `supabase/schema.sql` (table, index plein texte, RLS lecture seule, vue de statistiques)
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

1. **Supabase** : ouvrir le SQL Editor du projet relié au credential n8n « Supabase account » et exécuter `supabase/schema.sql`.
2. **n8n** : le workflow est publié. Lancer une première collecte : `curl -X POST https://margauxbouriez2.app.n8n.cloud/webhook/hemerion-veille-refresh`
3. **Vérifier l'API** : `https://margauxbouriez2.app.n8n.cloud/webhook/hemerion-veille-articles?min_score=50` (paramètre optionnel `category=Réglementaire`)
4. **Plateforme** : activer GitHub Pages (Settings → Pages → branche `main`, dossier racine). La page bascule automatiquement de « Instantané » à « En direct » dès que l'API répond.

## Modifier la veille

- Ajouter / retirer des sources : `n8n/code_sources.js`
- Ajuster les mots-clés et les poids : tableau `RULES` dans `n8n/code_scoring.js`
- Régénérer le code SDK : `python3 n8n/build_sdk.py`, puis mettre à jour le nœud correspondant dans n8n
- Régénérer la page après mise à jour de l'instantané : `python3 web/build.py`

## Pistes d'extension

- Résumé et note d'impact rédigés par Claude (nœud Anthropic de n8n) pour les articles ≥ 50
- Alerte Gmail quotidienne pour les articles « critique » (credential Gmail déjà présent dans n8n)
- Suivi ClinicalTrials.gov des essais concurrents en glioblastome nouvellement diagnostiqué
