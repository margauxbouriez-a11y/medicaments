// Prépare la réponse JSON de l'API de lecture consommée par la plateforme.
const q = $('API articles (GET)').first().json.query || {};
const minScore = Number(q.min_score || 0);
const category = q.category || '';
const rows = $input.all().map(i => i.json).filter(r => r && r.url_hash);
const articles = rows
  .filter(r => (r.impact_score || 0) >= minScore)
  .filter(r => !category || r.category === category)
  .map(r => ({
    id: r.id,
    url_hash: r.url_hash,
    title: r.title,
    url: r.url,
    source: r.source,
    published_at: r.published_at,
    summary: r.summary,
    category: r.category,
    products: r.products,
    impact_score: r.impact_score,
    impact_level: r.impact_level,
    impact_note: r.impact_note,
    matched_keywords: r.matched_keywords,
    created_at: r.created_at
  }));
return [{ json: { generated_at: new Date().toISOString(), count: articles.length, articles } }];
