-- =====================================================================
-- Migración 0055 — alineación del artista: períodos y músicos de apoyo
-- =====================================================================
-- openspec: add-artist-lineup-data.
--
-- - `membership_period`: una fila por relación `member of band` de
--   MusicBrainz. Un integrante que se fue y volvió tiene varios períodos
--   (Vince Neil en Mötley Crüe: 1981–1992, 1997–2015, 2018–). Fechas con su
--   precisión ('YYYY', 'YYYY-MM' o 'YYYY-MM-DD'), si terminó, instrumentos
--   crudos de MusicBrainz y las marcas de fundador (`original`) y adicional
--   (`additional`) separadas de los instrumentos. `membership` sigue siendo el
--   par persona ↔ grupo y su `role`/`joined_on`/`left_on` pasan a ser un
--   resumen derivado de sus períodos, escrito en la misma transacción.
-- - `artist_support`: relaciones de apoyo (instrumental, vocal o genérica) de
--   una persona a cualquier artista, también a un solista (la banda de gira).
--   No va en `membership`: `trg_membership_types` exige persona → grupo y los
--   créditos del álbum tratan a toda pertenencia como integrante. MusicBrainz
--   no distingue apoyo en vivo de apoyo en estudio.
-- - `artist.lineup_synced_at`: NULL = la alineación nunca se guardó con
--   períodos (artistas sincronizados antes de esta migración); se renueva con
--   la ficha cada 30 días.
-- Las filas de ambas tablas se reemplazan completas en cada sincronización
-- (nunca se actualizan), por eso no llevan `updated_at`.
-- =====================================================================

ALTER TABLE artist
    ADD COLUMN lineup_synced_at TIMESTAMPTZ;

CREATE TABLE membership_period (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id  UUID NOT NULL REFERENCES membership(id) ON DELETE CASCADE,
    begin_date     TEXT,
    end_date       TEXT,
    ended          BOOLEAN NOT NULL DEFAULT false,
    instruments    TEXT[] NOT NULL DEFAULT '{}',
    is_founder     BOOLEAN NOT NULL DEFAULT false,
    is_additional  BOOLEAN NOT NULL DEFAULT false,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_membership_period_begin CHECK (begin_date IS NULL OR begin_date ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
    CONSTRAINT chk_membership_period_end CHECK (end_date IS NULL OR end_date ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
    -- Un dato incoherente de MusicBrainz se guarda sin fechas, nunca invertido.
    CONSTRAINT chk_membership_period_order CHECK (
        begin_date IS NULL OR end_date IS NULL OR left(end_date, 4) >= left(begin_date, 4)
    )
);

CREATE INDEX idx_membership_period_membership ON membership_period (membership_id);

CREATE TABLE artist_support (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    musician_id  UUID NOT NULL REFERENCES artist(id) ON DELETE CASCADE,
    artist_id    UUID NOT NULL REFERENCES artist(id) ON DELETE CASCADE,
    kind         TEXT NOT NULL,
    instruments  TEXT[] NOT NULL DEFAULT '{}',
    begin_date   TEXT,
    end_date     TEXT,
    ended        BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_artist_support_kind CHECK (kind IN ('instrumental', 'vocal', 'general')),
    CONSTRAINT chk_artist_support_not_self CHECK (musician_id <> artist_id),
    CONSTRAINT chk_artist_support_begin CHECK (begin_date IS NULL OR begin_date ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
    CONSTRAINT chk_artist_support_end CHECK (end_date IS NULL OR end_date ~ '^\d{4}(-\d{2}(-\d{2})?)?$'),
    CONSTRAINT chk_artist_support_order CHECK (
        begin_date IS NULL OR end_date IS NULL OR left(end_date, 4) >= left(begin_date, 4)
    )
);

CREATE INDEX idx_artist_support_musician ON artist_support (musician_id);
CREATE INDEX idx_artist_support_artist ON artist_support (artist_id);
