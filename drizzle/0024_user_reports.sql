-- =====================================================================
-- Migracion 0024 — reportes y auditoria con objetivo usuario
-- =====================================================================

-- content_report admite como objetivo el perfil de un usuario, ademas de
-- comentarios y resenas. Un reporte apunta exactamente a un objetivo.
ALTER TABLE content_report
    DROP CONSTRAINT content_report_check,
    ADD COLUMN user_id UUID REFERENCES app_user (id) ON DELETE CASCADE,
    ADD CONSTRAINT content_report_target_check
        CHECK (num_nonnulls(comment_id, review_id, user_id) = 1);

-- Evita reportes pendientes duplicados del mismo autor sobre el mismo usuario.
CREATE UNIQUE INDEX uq_content_report_open_user
    ON content_report (reporter_id, user_id)
    WHERE user_id IS NOT NULL AND status = 'pending';

-- moderation_action puede auditar acciones cuyo objetivo es un usuario
-- (p. ej. resolver/descartar un reporte de perfil).
ALTER TABLE moderation_action
    DROP CONSTRAINT moderation_action_check,
    ADD COLUMN user_id UUID REFERENCES app_user (id) ON DELETE CASCADE,
    ADD CONSTRAINT moderation_action_target_check
        CHECK (num_nonnulls(comment_id, review_id, list_id, restriction_id, user_id) = 1);