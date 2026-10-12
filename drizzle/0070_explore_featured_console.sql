-- =====================================================================
-- Migración 0070 — consola editorial de colecciones destacadas
-- =====================================================================
-- Motivo (openspec: manage-explore-featured-console, ADR 0034): el equipo
-- editorial decide qué se destaca en /explore desde /admin y puede pausar
-- las plantillas automáticas (ADR 0033).
--
-- 1. `editorial_action` admite `feature` y `unfeature` (destacar, quitar,
--    reordenar y cambiar la vigencia de una colección destacada).
-- 2. `explore_collection_template_state`: estado operativo por plantilla
--    (pausada por quién y cuándo). Una plantilla sin fila no está pausada.
--    `paused_by` usa SET NULL: borrar la cuenta de quien pausó no debe
--    bloquearse por un dato operativo (a diferencia de la auditoría).
-- =====================================================================

ALTER TABLE editorial_action DROP CONSTRAINT editorial_action_action_check;
ALTER TABLE editorial_action
    ADD CONSTRAINT chk_editorial_action_action
    CHECK (action IN ('create', 'edit', 'submit', 'publish', 'withdraw', 'feature', 'unfeature'));

CREATE TABLE explore_collection_template_state (
    template_key TEXT PRIMARY KEY,
    paused_at    TIMESTAMPTZ,
    paused_by    UUID REFERENCES app_user (id) ON DELETE SET NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_explore_template_state_paused
        CHECK (paused_at IS NOT NULL OR paused_by IS NULL)
);
