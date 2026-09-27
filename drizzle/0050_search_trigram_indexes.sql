-- =====================================================================
-- Migración 0050 — búsqueda local tolerante (trigramas + sin acentos)
-- =====================================================================
-- openspec: redesign-scoped-search.
--
-- La búsqueda local usaba `ILIKE '%q%' LIMIT n` SIN orden: con más de n
-- nombres que contienen la subcadena, el tope podía dejar fuera la
-- coincidencia exacta (buscar "icon" devolvía "Ennio Morricone" antes que la
-- banda "Icon"). Ahora se ordena por exacta → palabra completa → prefijo →
-- similitud ANTES del tope, y esa consulta necesita índices trigram.
--
-- - `pg_trgm` y `unaccent` son extensiones `contrib` y *trusted* desde
--   PostgreSQL 13: las puede crear el dueño de la base sin superusuario.
-- - `unaccent(text)` es STABLE (depende del search_path para encontrar el
--   diccionario), así que no sirve en un índice de expresión. El envoltorio
--   con diccionario explícito sí puede declararse IMMUTABLE.
-- - Corrección de datos: los stubs de artista creados por la búsqueda cuando
--   MusicBrainz no informaba el tipo quedaban como 'various' (reservado a
--   Various Artists). Pasan a 'unknown' — "tipo no confirmado", no un valor
--   inventado — y el enriquecimiento de stubs (ingest-artist.ts) re-deriva el
--   tipo real en la primera visita.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION search_normalize(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
    SELECT lower(public.unaccent('public.unaccent'::regdictionary, value))
$$;

CREATE INDEX idx_artist_name_search
    ON artist USING gin (search_normalize(name) gin_trgm_ops);

CREATE INDEX idx_release_group_title_search
    ON release_group USING gin (search_normalize(title) gin_trgm_ops);

CREATE INDEX idx_recording_title_search
    ON recording USING gin (search_normalize(title) gin_trgm_ops);

CREATE INDEX idx_app_user_username_search
    ON app_user USING gin (search_normalize(username) gin_trgm_ops);

CREATE INDEX idx_app_user_display_name_search
    ON app_user USING gin (search_normalize(display_name) gin_trgm_ops);

UPDATE artist
SET type = 'unknown'
WHERE type = 'various'
  AND (mbid IS NULL OR mbid <> '89ad4ac3-39f7-470e-963a-56509c546377');
