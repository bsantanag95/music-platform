-- =====================================================================
-- Migración 0054 — perfil de artista: ficha, foto y textos por idioma
-- =====================================================================
-- openspec: enrich-artist-profile (ADR 0021).
--
-- - `artist.bio` → `artist.disambiguation`: guardaba la desambiguación de
--   MusicBrainz, no una biografía. La búsqueda la sigue usando.
-- - Ficha desde MusicBrainz: país, lugares de inicio y fin, fechas de inicio
--   y fin con su precisión ('YYYY', 'YYYY-MM' o 'YYYY-MM-DD'; en una persona
--   son nacimiento y muerte) y si terminó. Todo arranca en NULL: es el estado
--   real (nunca se pidió), no un valor inventado.
-- - Foto desde Wikimedia Commons, solo con licencia libre verificada: archivo,
--   autor, licencia y enlaces para el crédito obligatorio; `photo_blocked_at`
--   es el retiro a pedido. `photo_url` (ya existía) pasa a ser la miniatura.
-- - `profile_synced_at` (ficha de MusicBrainz) y `wikimedia_synced_at`
--   (Wikimedia): NULL = pendiente; se renuevan cada 30 días en segundo plano.
-- - `artist_link`: enlaces curados en orden fijo (sitio oficial, Bandcamp,
--   una plataforma de streaming). Sin redes sociales.
-- - `artist_localized_text`: descripción corta y resumen de Wikipedia por
--   idioma de la interfaz, y el lugar de nacimiento o formación ya traducido.
-- Sin géneros: los de MusicBrainz son etiquetas CC BY-NC-SA (no comerciales).
-- =====================================================================

ALTER TABLE artist RENAME COLUMN bio TO disambiguation;

ALTER TABLE artist
    ADD COLUMN country              TEXT,
    ADD COLUMN begin_area_name      TEXT,
    ADD COLUMN end_area_name        TEXT,
    ADD COLUMN life_begin           TEXT,
    ADD COLUMN life_end             TEXT,
    ADD COLUMN life_ended           BOOLEAN,
    ADD COLUMN wikidata_id          TEXT,
    ADD COLUMN profile_synced_at    TIMESTAMPTZ,
    ADD COLUMN wikimedia_synced_at  TIMESTAMPTZ,
    ADD COLUMN photo_file           TEXT,
    ADD COLUMN photo_author         TEXT,
    ADD COLUMN photo_license        TEXT,
    ADD COLUMN photo_license_url    TEXT,
    ADD COLUMN photo_source_url     TEXT,
    ADD COLUMN photo_blocked_at     TIMESTAMPTZ,
    ADD CONSTRAINT chk_artist_country CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
    ADD CONSTRAINT chk_artist_life_begin CHECK (life_begin IS NULL OR life_begin ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
    ADD CONSTRAINT chk_artist_life_end CHECK (life_end IS NULL OR life_end ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
    ADD CONSTRAINT chk_artist_wikidata_id CHECK (wikidata_id IS NULL OR wikidata_id ~ '^Q[0-9]+$'),
    -- Una foto guardada siempre lleva los datos de su crédito.
    ADD CONSTRAINT chk_artist_photo_credit CHECK (
        photo_file IS NULL
        OR (photo_url IS NOT NULL AND photo_license IS NOT NULL AND photo_source_url IS NOT NULL)
    );

CREATE TABLE artist_link (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id   UUID NOT NULL REFERENCES artist(id) ON DELETE CASCADE,
    kind        TEXT NOT NULL,
    url         TEXT NOT NULL,
    position    SMALLINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_artist_link_kind CHECK (kind IN ('official', 'bandcamp', 'streaming')),
    CONSTRAINT uq_artist_link_kind UNIQUE (artist_id, kind)
);

CREATE TRIGGER trg_artist_link_touch
BEFORE UPDATE ON artist_link
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE artist_localized_text (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id      UUID NOT NULL REFERENCES artist(id) ON DELETE CASCADE,
    locale         TEXT NOT NULL,
    description    TEXT,
    summary        TEXT,
    summary_title  TEXT,
    summary_url    TEXT,
    place_label    TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_artist_localized_text_locale CHECK (locale IN ('es', 'en')),
    -- Un resumen siempre enlaza a su artículo (atribución CC BY-SA).
    CONSTRAINT chk_artist_localized_text_summary CHECK (summary IS NULL OR summary_url IS NOT NULL),
    CONSTRAINT uq_artist_localized_text UNIQUE (artist_id, locale)
);

CREATE TRIGGER trg_artist_localized_text_touch
BEFORE UPDATE ON artist_localized_text
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
