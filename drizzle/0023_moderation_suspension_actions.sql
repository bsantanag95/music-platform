-- =====================================================================
-- Migracion 0023 — acciones de suspension en moderation_action y
-- retirada editorial explicita en user_list
-- =====================================================================

-- La migracion 0022 dejo el CHECK de moderation_action.action limitado a
-- acciones sobre contenido (hide/restore) y reportes (report_resolve/
-- report_dismiss). El servicio de moderacion tambien registra suspensiones
-- y revocaciones sociales (suspend_social / revoke_social), que hoy
-- violarían el CHECK. Se extiende la lista de acciones permitidas.
ALTER TABLE moderation_action
    DROP CONSTRAINT moderation_action_action_check,
    ADD CONSTRAINT moderation_action_action_check
        CHECK (action IN (
            'hide',
            'restore',
            'report_resolve',
            'report_dismiss',
            'suspend_social',
            'revoke_social'
        ));

-- user_list distingue "retirada" de "nunca publicada": la consola editorial
-- filtra listas retiradas por este marcador (is_official = false no alcanza,
-- porque una lista personal común nunca fue oficial).
ALTER TABLE user_list
    ADD COLUMN official_withdrawn_at TIMESTAMPTZ;