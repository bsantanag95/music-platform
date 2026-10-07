-- =====================================================================
-- 0063_release_calendar.sql
-- Calendario de lanzamientos de Inicio (openspec: add-home-release-calendar,
-- ADR 0029). Índice de lo que publica el feed "Fresh Releases" de
-- ListenBrainz (CC0), separado del catálogo: una fila NO es un release-group
-- del catálogo. Solo lo que se muestra se vincula a `release_group`
-- (`release_group_id`), por eso el FK es SET NULL: borrar el álbum no borra
-- la entrada, que se reemplaza completa en la próxima sincronización.
--
-- `release_calendar_sync` registra cada sincronización: la última `succeeded`
-- define si el calendario está vencido (24 h).
-- Aditivo: el código anterior ignora ambas tablas.
-- =====================================================================

CREATE TABLE release_calendar_entry (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_group_mbid  UUID NOT NULL UNIQUE,
  release_mbid        UUID,
  title               TEXT NOT NULL,
  artist_credit_name  TEXT NOT NULL,
  artist_mbids        UUID[] NOT NULL DEFAULT '{}',
  release_date        DATE NOT NULL,
  primary_type        TEXT NOT NULL,
  has_cover           BOOLEAN NOT NULL,
  artist_listeners    INTEGER,
  verified_at         TIMESTAMPTZ,
  first_release_date  DATE,
  exclusion           TEXT,
  release_group_id    UUID REFERENCES release_group (id) ON DELETE SET NULL,
  anonymous_rank      SMALLINT,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_release_calendar_entry_primary_type CHECK (primary_type IN ('Album', 'EP')),
  CONSTRAINT chk_release_calendar_entry_exclusion CHECK (exclusion IN ('secondary_type', 'reissue')),
  CONSTRAINT chk_release_calendar_entry_listeners CHECK (artist_listeners IS NULL OR artist_listeners >= 0),
  CONSTRAINT chk_release_calendar_entry_rank CHECK (anonymous_rank IS NULL OR anonymous_rank > 0),
  -- Una exclusión solo existe tras verificar en MusicBrainz.
  CONSTRAINT chk_release_calendar_entry_verified CHECK (exclusion IS NULL OR verified_at IS NOT NULL)
);

CREATE INDEX idx_release_calendar_entry_date ON release_calendar_entry (release_date);
CREATE INDEX idx_release_calendar_entry_artists ON release_calendar_entry USING GIN (artist_mbids);
CREATE INDEX idx_release_calendar_entry_rank ON release_calendar_entry (anonymous_rank)
  WHERE anonymous_rank IS NOT NULL;

CREATE TABLE release_calendar_sync (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at  TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'running',
  entry_count  INTEGER,
  error        TEXT,
  CONSTRAINT chk_release_calendar_sync_status CHECK (status IN ('running', 'succeeded', 'failed'))
);

CREATE INDEX idx_release_calendar_sync_finished ON release_calendar_sync (finished_at DESC)
  WHERE status = 'succeeded';
