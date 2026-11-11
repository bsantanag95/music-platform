-- =====================================================================
-- 0092_shared_concert.sql
-- Conciertos compartidos, Fase 1 (openspec: add-shared-concerts-phase1, ADR 0057).
--
-- - concert: el hecho compartido. Dos orígenes (musicbrainz | community) y un
--   estado (confirmed | pending | hidden) preparado para la Fase 2; en la
--   Fase 1 solo hay conciertos de MusicBrainz, que nacen confirmados. Fecha
--   EXACTA: un concierto compartido se reconoce por su día.
-- - concert_performer: el cartel. Guarda el mbid y el nombre de MusicBrainz y
--   enlaza al artista del catálogo solo si ya existe (no se crean stubs).
-- - artist.concerts_synced_at: último recorrido completo de sus eventos.
-- - concert_entry.concert_id: el enlace opcional del recuerdo personal al
--   concierto (ADR 0056). ON DELETE SET NULL: borrar un concierto no borra
--   recuerdos. Uno por persona y concierto.
-- - concert_entry.from_concert: el registro lo creó "Estuve ahí" (quitar la
--   asistencia lo borra solo si además nunca se editó).
-- Aditiva, sin backfill.
-- =====================================================================

CREATE TABLE concert (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid        UUID UNIQUE,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL,
    event_date  DATE NOT NULL,
    venue       TEXT,
    venue_mbid  UUID,
    city        TEXT,
    area_mbid   UUID,
    country     TEXT,
    source      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'confirmed',
    cancelled   BOOLEAN NOT NULL DEFAULT false,
    synced_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_concert_name CHECK (length(name) BETWEEN 1 AND 300),
    CONSTRAINT chk_concert_kind CHECK (kind IN ('concert', 'festival')),
    CONSTRAINT chk_concert_source CHECK (source IN ('musicbrainz', 'community')),
    CONSTRAINT chk_concert_status CHECK (status IN ('confirmed', 'pending', 'hidden')),
    CONSTRAINT chk_concert_musicbrainz_mbid CHECK (source <> 'musicbrainz' OR mbid IS NOT NULL),
    CONSTRAINT chk_concert_country CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_concert_venue CHECK (venue IS NULL OR length(venue) BETWEEN 1 AND 300),
    CONSTRAINT chk_concert_city CHECK (city IS NULL OR length(city) BETWEEN 1 AND 200)
);

CREATE INDEX idx_concert_date ON concert (event_date DESC);

CREATE TRIGGER trg_concert_touch
BEFORE UPDATE ON concert
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE concert_performer (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concert_id   UUID NOT NULL REFERENCES concert (id) ON DELETE CASCADE,
    artist_mbid  UUID NOT NULL,
    artist_name  TEXT NOT NULL,
    artist_id    UUID REFERENCES artist (id) ON DELETE SET NULL,
    role         TEXT NOT NULL,
    position     SMALLINT NOT NULL,
    CONSTRAINT chk_concert_performer_role CHECK (role IN ('main', 'support', 'guest')),
    CONSTRAINT chk_concert_performer_name CHECK (length(artist_name) BETWEEN 1 AND 500),
    CONSTRAINT uq_concert_performer UNIQUE (concert_id, artist_mbid, role)
);

-- Conciertos de un artista (pestaña Conciertos) y enlace por mbid al entrar al catálogo.
CREATE INDEX idx_concert_performer_artist_mbid ON concert_performer (artist_mbid);
CREATE INDEX idx_concert_performer_artist ON concert_performer (artist_id);

ALTER TABLE artist
    ADD COLUMN concerts_synced_at TIMESTAMPTZ;

ALTER TABLE concert_entry
    ADD COLUMN concert_id UUID REFERENCES concert (id) ON DELETE SET NULL,
    ADD COLUMN from_concert BOOLEAN NOT NULL DEFAULT false;

-- Una persona está a lo sumo una vez en cada concierto.
CREATE UNIQUE INDEX uq_concert_entry_user_concert
    ON concert_entry (user_id, concert_id)
    WHERE concert_id IS NOT NULL;

-- Personas que estuvieron en un concierto.
CREATE INDEX idx_concert_entry_concert ON concert_entry (concert_id) WHERE concert_id IS NOT NULL;
