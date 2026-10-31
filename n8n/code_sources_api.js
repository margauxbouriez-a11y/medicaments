// Liste des sources de veille renvoyée à la plateforme (GET /webhook/hemerion-veille-sources).
const sources = $input.all()
  .map(i => i.json)
  .filter(r => r && (r.query || r.url))
  .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
  .map(r => ({
    position: Number(r.position) || 0,
    axe: r.axe || 'Autre',
    label: r.label || '',
    query: r.query || '',
    url: r.url || '',
    lang: r.lang === 'fr' ? 'fr' : 'en',
    active: r.active !== false,
    updated_at: r.updatedAt || r.createdAt || null
  }));
const updated = sources.map(s => s.updated_at).filter(Boolean).sort().pop() || null;
return [{ json: { generated_at: new Date().toISOString(), updated_at: updated, count: sources.length, sources } }];
