-- =====================================================================
-- Migracion 0046 — moderation_action tolera objetivos eliminados
-- =====================================================================

-- Los FK a comment, review, user_list y user_restriction son ON DELETE SET NULL
-- para conservar la auditoria cuando desaparece el objetivo, pero el CHECK
-- exigia exactamente un objetivo: al borrar una cuenta con una restriccion
-- (o un comentario/resena/lista con acciones) el SET NULL dejaba 0 objetivos,
-- violaba el CHECK y la eliminacion fallaba con 23514.
-- Se relaja a "como maximo uno" (el alta sigue sin poder apuntar a dos).
ALTER TABLE moderation_action
    DROP CONSTRAINT moderation_action_target_check,
    ADD CONSTRAINT moderation_action_target_check
        CHECK (num_nonnulls(comment_id, review_id, list_id, restriction_id, user_id) <= 1);
