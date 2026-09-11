-- =====================================================================
-- Migracion 0025 — rol de curador editorial y autoria editorial
-- =====================================================================

-- El rol de curador editorial se suma a los roles de plataforma. Se amplian
-- los CHECK de user_role y de su historial de auditoria para aceptarlo.
ALTER TABLE user_role
    DROP CONSTRAINT user_role_role_check,
    ADD CONSTRAINT user_role_role_check
        CHECK (role IN ('moderator', 'admin', 'editorial_curator'));

ALTER TABLE user_role_action
    DROP CONSTRAINT user_role_action_role_check,
    ADD CONSTRAINT user_role_action_role_check
        CHECK (role IN ('moderator', 'admin', 'editorial_curator'));

-- user_list registra la autoria de las listas editoriales (el owner sigue
-- siendo la cuenta curadora @exploracion, que no puede iniciar sesion) y el
-- momento/actor de la propuesta para revision. `editorial_author_id` conserva
-- a quien creo la lista; las ediciones posteriores viven en editorial_action.
ALTER TABLE user_list
    ADD COLUMN editorial_author_id UUID REFERENCES app_user (id) ON DELETE SET NULL,
    ADD COLUMN editorial_submitted_at TIMESTAMPTZ,
    ADD COLUMN editorial_submitted_by UUID REFERENCES app_user (id) ON DELETE SET NULL;

-- Auditoria de acciones de autoria editorial (create/edit/submit/publish/
-- withdraw). Mismo patron que user_role_action y moderation_action. El FK
-- cascade a user_list es deliberado: si se borra un borrador nunca publicado,
-- su historial desaparece con el (no hay nada publico que auditar).
CREATE TABLE editorial_action (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id     UUID NOT NULL REFERENCES user_list (id) ON DELETE CASCADE,
    actor_id    UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
    action      TEXT NOT NULL
                CHECK (action IN ('create', 'edit', 'submit', 'publish', 'withdraw')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_editorial_action_list ON editorial_action (list_id, created_at DESC);
