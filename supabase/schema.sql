-- ============================================================
-- Hemerion – Veille actualités pharma
-- À exécuter une fois dans Supabase > SQL Editor.
-- ============================================================

create table if not exists public.hemerion_veille_articles (
  id               bigint generated always as identity primary key,
  url_hash         text        not null unique,          -- empreinte du titre normalisé (déduplication)
  title            text        not null,
  url              text        not null,
  source           text,
  published_at     timestamptz,
  summary          text,
  category         text,                                  -- Hemerion & produits | Technologie PDT / 5-ALA | Concurrence glioblastome | Réglementaire | Marché & financement
  products         text,                                  -- Pentalafen, Heliance, Veille générale
  impact_score     integer     not null default 0 check (impact_score between 0 and 100),
  impact_level     text,                                  -- critique | élevé | modéré
  impact_note      text,
  matched_keywords text,
  lang             text default 'en',
  is_read          boolean     not null default false,
  is_starred       boolean     not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists hva_published_idx on public.hemerion_veille_articles (published_at desc);
create index if not exists hva_score_idx     on public.hemerion_veille_articles (impact_score desc);
create index if not exists hva_category_idx  on public.hemerion_veille_articles (category);

-- Recherche plein texte (titre + résumé)
alter table public.hemerion_veille_articles
  add column if not exists fts tsvector
  generated always as (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,''))) stored;
create index if not exists hva_fts_idx on public.hemerion_veille_articles using gin (fts);

-- Sécurité : n8n écrit avec la clé service_role (contourne RLS).
-- La plateforme peut lire directement avec la clé anon si besoin.
alter table public.hemerion_veille_articles enable row level security;

drop policy if exists "lecture publique veille" on public.hemerion_veille_articles;
create policy "lecture publique veille"
  on public.hemerion_veille_articles for select
  to anon, authenticated
  using (true);

-- Vue de synthèse pour tableaux de bord
create or replace view public.hemerion_veille_stats as
select
  category,
  count(*)                                          as nb_articles,
  count(*) filter (where impact_level = 'critique') as nb_critiques,
  round(avg(impact_score))                          as score_moyen,
  max(published_at)                                 as dernier_article
from public.hemerion_veille_articles
group by category;

-- Purge automatique des articles de plus de 180 jours (optionnel, nécessite l'extension pg_cron)
-- select cron.schedule('purge-veille-hemerion', '0 3 * * *',
--   $$delete from public.hemerion_veille_articles where published_at < now() - interval '180 days' and not is_starred$$);
