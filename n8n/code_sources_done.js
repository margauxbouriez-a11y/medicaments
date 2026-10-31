// Réponse envoyée à la plateforme après l'enregistrement des sources.
const v = $('Vérifier la demande').first().json;
return [{ json: { ok: true, saved_at: new Date().toISOString(), count: v.count, active: v.active,
  message: v.active + ' source(s) active(s) sur ' + v.count + ' : elles seront utilisées dès la prochaine collecte.' } }];
