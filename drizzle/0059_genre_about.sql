-- =====================================================================
-- 0059_genre_about.sql
-- Texto "Sobre el género" desde Wikipedia (openspec: redesign-genre-page,
-- ADR 0027).
--
-- - `genre_localized_text`: descripción corta de Wikidata e introducción del
--   artículo de Wikipedia, por género e idioma (es / en), con el título y la
--   URL canónica del artículo (la atribución CC BY-SA los exige). Misma forma
--   que `artist_localized_text`. Un resumen siempre lleva su URL.
-- - `genre.wikimedia_synced_at`: última sincronización con Wikimedia
--   (vigencia de 30 días). NULL = nunca sincronizado.
-- - `idx_app_user_genres`: índice GIN sobre "Géneros que me mueven" para la
--   cifra «les mueve a N personas» de la página de género (contención de
--   arreglos con `@>`), que se calcula en cada visita pública.
--
-- Aditivo: el código anterior ignora la tabla y las columnas nuevas.
-- =====================================================================

CREATE TABLE genre_localized_text (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    genre_id       UUID NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
    locale         TEXT NOT NULL,
    description    TEXT,
    summary        TEXT,
    summary_title  TEXT,
    summary_url    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_genre_localized_text UNIQUE (genre_id, locale),
    CONSTRAINT chk_genre_localized_text_locale CHECK (locale IN ('es', 'en')),
    CONSTRAINT chk_genre_localized_text_summary CHECK (summary IS NULL OR summary_url IS NOT NULL)
);

CREATE TRIGGER trg_genre_localized_text_touch
BEFORE UPDATE ON genre_localized_text
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

ALTER TABLE genre
  ADD COLUMN wikimedia_synced_at TIMESTAMPTZ;

CREATE INDEX idx_app_user_genres ON app_user USING gin (genres);
