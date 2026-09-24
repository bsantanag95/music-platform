-- =====================================================================
-- Migración 0048 — ediciones de álbum y créditos de personal
-- =====================================================================
-- openspec: enrich-album-editions-and-credits.
--
-- Ediciones (parte A):
-- - `release_edition`: resumen de CADA edición que MusicBrainz reporta para
--   un release-group (browse paginado), con o sin tracklist ingerida. Es
--   distinto de `release`, que significa "edición con tracklist ingerida".
-- - `label` + `release_edition_label`: sellos como entidades propias (por
--   `mbid`) y la relación edición ↔ sello con su número de catálogo.
-- - `release_group.editions_synced_at`: NULL = resumen pendiente.
-- - `release.is_representative` + índice único parcial: un release-group puede
--   tener varias `release` (la representativa y variantes ingeridas bajo
--   demanda), pero A LO SUMO UNA representativa. La regla vive en SQL.
--
-- Créditos de personal (parte B):
-- - `personnel_credit`: relaciones de artista de MusicBrainz (instrumento,
--   voz, producción, ingeniería, arte…) sobre una edición o una grabación,
--   separadas de `credit` (autoría visible `primary` / `featured`).
-- - `release.personnel_synced_at`: NULL = créditos de personal pendientes.
--   Distinto de `credits_synced_at`, que ya significa créditos de autoría.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Una sola `release` por release-group hasta ahora: verificarlo antes de
-- marcar representativas, en lugar de elegir una arbitraria.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM release GROUP BY release_group_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Hay release-groups con más de una release: resolverlos antes de aplicar 0048 (una sola debe quedar como representativa).';
  END IF;
END
$$;

ALTER TABLE release ADD COLUMN is_representative BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE release ADD COLUMN personnel_synced_at TIMESTAMPTZ;
UPDATE release SET is_representative = true;
CREATE UNIQUE INDEX uq_release_representative
    ON release (release_group_id) WHERE is_representative;

ALTER TABLE release_group ADD COLUMN editions_synced_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- RELEASE_EDITION — resumen de cada edición de MusicBrainz
-- ---------------------------------------------------------------------
CREATE TABLE release_edition (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid              UUID NOT NULL UNIQUE,
    release_group_id  UUID NOT NULL REFERENCES release_group (id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    disambiguation    TEXT,
    status            TEXT,                -- 'Official' | 'Promotion' | 'Bootleg' | 'Pseudo-Release' | NULL
    release_date      DATE,                -- solo con precisión diaria
    release_year      SMALLINT,            -- con cualquier precisión conocida
    country           TEXT,
    packaging         TEXT,
    formats           TEXT[] NOT NULL DEFAULT '{}',  -- un formato por disco, en orden
    medium_count      SMALLINT NOT NULL DEFAULT 0 CHECK (medium_count >= 0),
    track_count       SMALLINT CHECK (track_count IS NULL OR track_count >= 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_release_edition_release_group ON release_edition (release_group_id);

CREATE TRIGGER trg_release_edition_touch
BEFORE UPDATE ON release_edition
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- ---------------------------------------------------------------------
-- LABEL — sello discográfico
-- ---------------------------------------------------------------------
CREATE TABLE label (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid        UUID NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- RELEASE_EDITION_LABEL — sello y número de catálogo de una edición
-- ---------------------------------------------------------------------
CREATE TABLE release_edition_label (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_edition_id  UUID NOT NULL REFERENCES release_edition (id) ON DELETE CASCADE,
    label_id            UUID REFERENCES label (id) ON DELETE CASCADE,
    catalog_number      TEXT,
    position            SMALLINT NOT NULL CHECK (position >= 0),
    CHECK (num_nonnulls(label_id, catalog_number) >= 1),
    UNIQUE (release_edition_id, position)
);

CREATE INDEX idx_release_edition_label_label ON release_edition_label (label_id);

-- ---------------------------------------------------------------------
-- PERSONNEL_CREDIT — créditos de personal (relaciones de artista de MB)
-- ---------------------------------------------------------------------
CREATE TABLE personnel_credit (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id      UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    release_id     UUID REFERENCES release (id) ON DELETE CASCADE,
    recording_id   UUID REFERENCES recording (id) ON DELETE CASCADE,
    relation_type  TEXT NOT NULL,                 -- tipo de MusicBrainz tal cual ('instrument', 'producer', …)
    attributes     TEXT[] NOT NULL DEFAULT '{}',  -- instrumentos y matices, ordenados
    credited_as    TEXT,                          -- `target-credit` cuando difiere del nombre
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- exactamente un destino: la edición o la grabación
    CHECK (num_nonnulls(release_id, recording_id) = 1)
);

-- Índices únicos parciales (mismo motivo que en `credit`: un UNIQUE normal no
-- detecta duplicados cuando una de las columnas de destino es NULL).
CREATE UNIQUE INDEX uq_personnel_credit_release
    ON personnel_credit (release_id, artist_id, relation_type, attributes)
    WHERE release_id IS NOT NULL;
CREATE UNIQUE INDEX uq_personnel_credit_recording
    ON personnel_credit (recording_id, artist_id, relation_type, attributes)
    WHERE recording_id IS NOT NULL;
CREATE INDEX idx_personnel_credit_artist ON personnel_credit (artist_id);
