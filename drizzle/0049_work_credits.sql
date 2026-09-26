-- =====================================================================
-- Migración 0049 — obras y créditos de autoría (compositores y letristas)
-- =====================================================================
-- openspec: add-songwriter-credits.
--
-- En MusicBrainz la autoría cuelga de la OBRA (work), no de la grabación: la
-- misma obra la comparten la versión de estudio, las versiones en vivo y los
-- covers. Llega en la misma request de edición que la tracklist
-- (`inc=…+work-rels+work-level-rels`).
-- - `work`: una fila por obra (por `mbid`).
-- - `recording_work`: grabación ↔ obra, con los atributos del vínculo
--   (`cover`, `live`, `instrumental`, `medley`, `partial`).
-- - `work_credit`: relaciones de artista de la obra (`writer`, `composer`,
--   `lyricist`, …), separadas de `personnel_credit` (créditos de grabación).
-- - `release.works_synced_at`: NULL = autoría pendiente. Arranca en NULL para
--   todas las ediciones existentes: es el estado real (nunca se pidió), no un
--   valor inventado. Distinto de `personnel_synced_at`.
-- =====================================================================

CREATE TABLE work (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid        UUID NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_work_touch
BEFORE UPDATE ON work
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE recording_work (
    recording_id  UUID NOT NULL REFERENCES recording (id) ON DELETE CASCADE,
    work_id       UUID NOT NULL REFERENCES work (id) ON DELETE CASCADE,
    attributes    TEXT[] NOT NULL DEFAULT '{}',  -- atributos del vínculo, ordenados
    PRIMARY KEY (recording_id, work_id)
);

CREATE INDEX idx_recording_work_work ON recording_work (work_id);

CREATE TABLE work_credit (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_id        UUID NOT NULL REFERENCES work (id) ON DELETE CASCADE,
    artist_id      UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    relation_type  TEXT NOT NULL,                 -- tipo de MusicBrainz tal cual ('writer', 'composer', …)
    attributes     TEXT[] NOT NULL DEFAULT '{}',  -- matices, ordenados
    credited_as    TEXT,                          -- `target-credit` cuando difiere del nombre
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (work_id, artist_id, relation_type, attributes)
);

CREATE INDEX idx_work_credit_artist ON work_credit (artist_id);

ALTER TABLE release ADD COLUMN works_synced_at TIMESTAMPTZ;
