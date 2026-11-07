-- =====================================================================
-- 0085_discography_preference.sql
-- Preferencias del dueño en su discografía (openspec: add-discography-lamina-phase2).
--
-- Por persona y artista: qué secciones suma a la principal (En vivo, Recopilatorios)
-- y qué vista se muestra por defecto (Por disco, Por canción). La página y la imagen
-- compartida muestran esto. Aparte de discography_share: se elige también sin
-- compartir, y quitar la marca no borra lo elegido. Sin fila: solo la sección
-- principal y la vista Por disco.
-- =====================================================================

CREATE TABLE discography_preference (
    user_id      UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id    UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    sections     TEXT[] NOT NULL DEFAULT '{}',
    default_view TEXT NOT NULL DEFAULT 'disc',
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, artist_id),
    CONSTRAINT chk_discography_preference_sections CHECK (sections <@ ARRAY['live', 'compilations']::TEXT[]),
    CONSTRAINT chk_discography_preference_view CHECK (default_view IN ('disc', 'song'))
);

CREATE INDEX idx_discography_preference_artist ON discography_preference (artist_id);

CREATE TRIGGER trg_discography_preference_touch
    BEFORE UPDATE ON discography_preference
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
