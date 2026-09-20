-- =====================================================================
-- DEFAULT_AUDIENCE - audiencia por defecto del contenido nuevo
-- =====================================================================

-- Preferencia opcional del usuario (change rework-owner-management, capability
-- default-audience). Decide con que audiencia nace el contenido NUEVO de
-- biblioteca (favoritos, diario, listas, coleccion). NULL = "segun el tipo":
-- se conservan los defaults de cada tipo, que no son uniformes (favoritos
-- 'public', listas y coleccion 'followers', diario 'private'), por eso no hay
-- un DEFAULT de columna ni backfill: nadie cambia de comportamiento al migrar.
-- Nunca reescribe filas existentes.
ALTER TABLE app_user
    ADD COLUMN default_audience TEXT;

ALTER TABLE app_user
    ADD CONSTRAINT chk_app_user_default_audience
    CHECK (default_audience IS NULL OR default_audience IN ('private', 'followers', 'public'));
