-- =====================================================================
-- 0093_community_concert.sql
-- Conciertos compartidos, Fase 2 (openspec: add-shared-concerts-phase2, ADR 0058).
--
-- - concert.created_by: quien registró un concierto de la comunidad (crédito
--   discreto, "Registrado por"). ON DELETE SET NULL: el concierto sobrevive a
--   la cuenta.
-- - concert.setlistfm_url: prueba externa opcional; confirma el concierto si
--   el artista y el año del setlist coinciden (lo decide la aplicación).
-- - concert.city_key: ciudad normalizada (minúsculas, sin tildes, puntuación a
--   espacio) con `search_key` (0051, la misma de la búsqueda); base del
--   duplicado exacto. Columna generada: la mantiene la base (también para los
--   conciertos de MusicBrainz ya importados), la app nunca la escribe.
-- - concert.confirmed_at: cuándo se confirmó un concierto de la comunidad. La
--   confirmación es pegajosa; restaurar uno oculto vuelve a confirmado si
--   alguna vez se confirmó.
-- - concert.merged_into_id: destino de una fusión (manual o con MusicBrainz).
--   Un concierto fusionado queda oculto y su página redirige al destino.
-- - content_report.concert_id + reason_code: reportes de conciertos con motivo
--   cerrado (did_not_happen | duplicate | wrong_data). Uno abierto por persona.
-- - moderation_action.concert_id y la acción 'merge'.
-- Aditiva: las filas existentes (solo de MusicBrainz) cumplen los CHECK nuevos.
-- =====================================================================

ALTER TABLE concert
    ADD COLUMN created_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
    ADD COLUMN setlistfm_url TEXT,
    ADD COLUMN city_key TEXT GENERATED ALWAYS AS (public.search_key(city)) STORED,
    ADD COLUMN confirmed_at TIMESTAMPTZ,
    ADD COLUMN merged_into_id UUID REFERENCES concert (id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_concert_setlistfm_url CHECK (
        setlistfm_url IS NULL
        OR (length(setlistfm_url) <= 500 AND setlistfm_url ~ '^https://(www\.)?setlist\.fm/setlist/[^\s]+$')
    ),
    -- Un concierto de la comunidad siempre trae recinto, ciudad (con su clave) y país.
    ADD CONSTRAINT chk_concert_community_place CHECK (
        source <> 'community'
        OR (venue IS NOT NULL AND city IS NOT NULL AND city_key <> '' AND country IS NOT NULL)
    ),
    -- Un concierto de la comunidad confirmado sabe cuándo se confirmó.
    ADD CONSTRAINT chk_concert_community_confirmed CHECK (
        source <> 'community' OR status <> 'confirmed' OR confirmed_at IS NOT NULL
    ),
    -- Fusionado ⇒ oculto, y nunca en sí mismo.
    ADD CONSTRAINT chk_concert_merged CHECK (
        merged_into_id IS NULL OR (status = 'hidden' AND merged_into_id <> id)
    );

-- Límite de conciertos creados por persona en 24 horas.
CREATE INDEX idx_concert_created_by ON concert (created_by, created_at) WHERE created_by IS NOT NULL;
-- Duplicado exacto y candidatos: por fecha y ciudad normalizada.
CREATE INDEX idx_concert_date_city_key ON concert (event_date, city_key);

ALTER TABLE content_report
    DROP CONSTRAINT content_report_target_check,
    ADD COLUMN concert_id UUID REFERENCES concert (id) ON DELETE CASCADE,
    ADD COLUMN reason_code TEXT,
    ADD CONSTRAINT content_report_target_check
        CHECK (num_nonnulls(comment_id, review_id, user_id, concert_id) = 1),
    -- El motivo cerrado es obligatorio en un reporte de concierto y solo existe ahí.
    ADD CONSTRAINT chk_content_report_reason_code CHECK (
        (concert_id IS NULL AND reason_code IS NULL)
        OR (concert_id IS NOT NULL AND reason_code IN ('did_not_happen', 'duplicate', 'wrong_data'))
    );

CREATE UNIQUE INDEX uq_content_report_open_concert
    ON content_report (reporter_id, concert_id)
    WHERE concert_id IS NOT NULL AND status = 'pending';

ALTER TABLE moderation_action
    DROP CONSTRAINT moderation_action_action_check,
    DROP CONSTRAINT moderation_action_target_check,
    ADD COLUMN concert_id UUID REFERENCES concert (id) ON DELETE SET NULL,
    ADD CONSTRAINT moderation_action_action_check
        CHECK (action IN (
            'hide',
            'restore',
            'report_resolve',
            'report_dismiss',
            'suspend_social',
            'revoke_social',
            'merge'
        )),
    ADD CONSTRAINT moderation_action_target_check
        CHECK (num_nonnulls(comment_id, review_id, list_id, restriction_id, user_id, concert_id) <= 1);
