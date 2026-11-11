-- =====================================================================
-- 0095_concert_tours_links.sql
-- Conciertos compartidos, Fase 3 (openspec: add-shared-concerts-phase3, ADR 0059).
--
-- - concert_series: giras de MusicBrainz (series de tipo Tour), por mbid.
-- - concert.series_id: la gira del concierto. ON DELETE SET NULL.
-- - concert.parent_id: el festival del que un concierto es un día o un
--   escenario (relación `parts` de MusicBrainz). ON DELETE SET NULL; nunca él
--   mismo.
-- - concert.end_date: fin del rango de fechas de un festival (NULL = un día).
-- - concert_link_dismissal: "No es este" de una sugerencia de enlace (recuerdo
--   × concierto). Cae con el recuerdo o con el concierto.
-- Aditiva, sin relleno: el refresco de cada artista (cada 30 días) completa
-- gira, festival y end_date de lo ya importado.
-- =====================================================================

CREATE TABLE concert_series (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid        UUID NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_concert_series_name CHECK (length(name) BETWEEN 1 AND 300)
);

ALTER TABLE concert
    ADD COLUMN series_id UUID REFERENCES concert_series (id) ON DELETE SET NULL,
    ADD COLUMN parent_id UUID REFERENCES concert (id) ON DELETE SET NULL,
    ADD COLUMN end_date DATE,
    ADD CONSTRAINT chk_concert_parent CHECK (parent_id IS NULL OR parent_id <> id),
    ADD CONSTRAINT chk_concert_end_date CHECK (end_date IS NULL OR end_date >= event_date);

-- Página de la gira y partes de un festival.
CREATE INDEX idx_concert_series ON concert (series_id, event_date) WHERE series_id IS NOT NULL;
CREATE INDEX idx_concert_parent ON concert (parent_id, event_date) WHERE parent_id IS NOT NULL;

CREATE TABLE concert_link_dismissal (
    entry_id    UUID NOT NULL REFERENCES concert_entry (id) ON DELETE CASCADE,
    concert_id  UUID NOT NULL REFERENCES concert (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (entry_id, concert_id)
);

CREATE INDEX idx_concert_link_dismissal_concert ON concert_link_dismissal (concert_id);
