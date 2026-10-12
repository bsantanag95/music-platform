-- =====================================================================
-- Migración 0069 — colecciones de /explore generadas por plantillas
-- =====================================================================
-- Motivo (openspec: automate-explore-collections, ADR 0033): el riel
-- "Colecciones destacadas" dejó de depender de un seed manual. Plantillas
-- en código generan listas públicas de @exploracion cada semana (bajo
-- demanda, sin cron). `user_list_featured` sigue siendo la señal de
-- distribución (tabla aparte de user_list a propósito, ver 0013/0018):
-- gana origen, plantilla, período, vigencia y peso.
--
-- `rank` deja de ser único: ya no es el orden editorial inequívoco sino el
-- desempate tras `weight`. Se conserva NOT NULL y > 0.
-- =====================================================================

ALTER TABLE user_list_featured
    ADD COLUMN source       TEXT        NOT NULL DEFAULT 'curated',
    ADD COLUMN template_key TEXT,
    ADD COLUMN period_key   TEXT,
    ADD COLUMN starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN expires_at   TIMESTAMPTZ,
    ADD COLUMN weight       SMALLINT    NOT NULL DEFAULT 0;

ALTER TABLE user_list_featured
    ADD CONSTRAINT chk_user_list_featured_source
        CHECK (source IN ('curated', 'template')),
    ADD CONSTRAINT chk_user_list_featured_template
        CHECK (source <> 'template' OR (template_key IS NOT NULL AND period_key IS NOT NULL)),
    ADD CONSTRAINT chk_user_list_featured_window
        CHECK (expires_at IS NULL OR expires_at > starts_at);

DROP INDEX IF EXISTS uq_user_list_featured_rank;

-- Una lista generada por (plantilla, período). Parcial: las curadas no usan la pareja.
CREATE UNIQUE INDEX uq_user_list_featured_template_period
    ON user_list_featured (template_key, period_key)
    WHERE source = 'template';

-- Lectura del riel: vigentes por peso y rank.
CREATE INDEX idx_user_list_featured_rail
    ON user_list_featured (weight DESC, rank ASC);

-- Adopta las dos colecciones que sembraba scripts/seed-discovery.ts.
UPDATE user_list_featured f
   SET source       = 'template',
       template_key = CASE l.title
                          WHEN 'Novedades esenciales' THEN 'new-releases'
                          ELSE 'one-per-decade'
                      END,
       period_key   = 'evergreen'
  FROM user_list l
  JOIN app_user u ON u.id = l.owner_id
 WHERE l.id = f.list_id
   AND u.username = 'exploracion'
   AND l.title IN ('Novedades esenciales', 'Un disco por década');

-- ---------------------------------------------------------------------
-- Corridas de la generación. Una fila `running` de menos de 15 minutos
-- bloquea a las demás de la misma plantilla (mismo patrón que
-- release_calendar_sync, 0063).
-- ---------------------------------------------------------------------
CREATE TABLE explore_collection_sync (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT        NOT NULL,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at  TIMESTAMPTZ,
    status       TEXT        NOT NULL DEFAULT 'running',
    item_count   INTEGER,
    error        TEXT,
    CONSTRAINT chk_explore_collection_sync_status
        CHECK (status IN ('running', 'succeeded', 'failed'))
);

CREATE INDEX idx_explore_collection_sync_finished
    ON explore_collection_sync (template_key, finished_at DESC)
    WHERE status = 'succeeded';
