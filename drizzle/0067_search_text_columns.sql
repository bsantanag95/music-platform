-- =====================================================================
-- Migración 0067 — nombre normalizado guardado para las sugerencias cortas
-- =====================================================================
-- openspec: speed-up-short-suggestions (ADR 0031).
--
-- Con 2 letras, las sugerencias buscan una palabra que EMPIEZA por ellas
-- (`search_text ~ '(^| )ma'`). Sobre la expresión `search_normalize(...)` el
-- índice de 0050 encuentra los candidatos, pero Postgres vuelve a calcular
-- `unaccent` en cada uno para comprobarlo: con prefijos comunes ("th" casa
-- 12.694 álbumes en scratch) eso eran 100–130 ms. Con el nombre ya
-- normalizado y guardado, la comprobación es una comparación de texto
-- (16 ms en el mismo caso).
--
-- `search_key` (0051) además convierte la puntuación en espacio, así que
-- "Rock-On" queda "rock on" y el separador espacio basta para el inicio de
-- palabra. La base mantiene la columna en cada INSERT/UPDATE del nombre: la
-- app no la escribe nunca. `search_key` es IMMUTABLE y llama a
-- `public.search_normalize` calificado (requisito de PostgreSQL 17).
--
-- Reescribe las tres tablas (2,3 s para 60 mil álbumes en scratch): aplicar
-- fuera de una ingesta. Los índices de 0050 se conservan: sirven a las
-- consultas de 3+ caracteres y a la búsqueda completa.
-- =====================================================================

ALTER TABLE artist
    ADD COLUMN search_text TEXT GENERATED ALWAYS AS (public.search_key(name)) STORED;

ALTER TABLE release_group
    ADD COLUMN search_text TEXT GENERATED ALWAYS AS (public.search_key(title)) STORED;

ALTER TABLE recording
    ADD COLUMN search_text TEXT GENERATED ALWAYS AS (public.search_key(title)) STORED;

CREATE INDEX idx_artist_search_text_trgm
    ON artist USING gin (search_text gin_trgm_ops);

CREATE INDEX idx_release_group_search_text_trgm
    ON release_group USING gin (search_text gin_trgm_ops);

CREATE INDEX idx_recording_search_text_trgm
    ON recording USING gin (search_text gin_trgm_ops);
