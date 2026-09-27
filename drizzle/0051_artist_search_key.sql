-- =====================================================================
-- Migración 0051 — clave exacta de nombre de artista para la búsqueda
-- =====================================================================
-- openspec: redesign-scoped-search.
--
-- La detección de "artista + título" (sugerencias, Álbumes y Canciones)
-- busca artistas cuyo nombre normalizado es EXACTAMENTE un extremo de la
-- consulta ("dokken", "kiss of death", …): una igualdad por lista. Con
-- `search_normalize` sola, "AC/DC" no iguala a "ac dc", así que la clave
-- además convierte la puntuación en espacio — la misma regla que
-- `normalizeSearchText` en TypeScript. Sin índice era un recorrido completo
-- de `artist` por cada tecla del buscador.
-- `public.` explícito: desde PostgreSQL 17 las funciones de un índice se
-- evalúan con un search_path restringido (pg_catalog, pg_temp).
-- =====================================================================

CREATE OR REPLACE FUNCTION search_key(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
    SELECT btrim(regexp_replace(
        regexp_replace(public.search_normalize(value), '([[:alpha:]])[''’`´]([[:alpha:]])', '\1\2', 'g'),
        '[^[:alnum:]]+', ' ', 'g'
    ))
$$;

CREATE INDEX idx_artist_search_key ON artist (search_key(name));
