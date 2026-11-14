-- =====================================================================
-- 0096_terms_acceptance.sql
-- Aceptación de los Términos del servicio al crear la cuenta (openspec:
-- add-terms-acceptance, ADR 0061).
--
-- - `terms_accepted_at`: cuándo se aceptaron.
-- - `terms_version`: versión de los Términos aceptada (la fecha de su última
--   actualización, `TERMS_VERSION` en `src/lib/terms.ts`).
-- - `terms_accepted_via`: cómo se aceptaron. `checkbox` = casilla marcada en el
--   registro con email; `notice` = aviso junto al botón de Google ("al continuar
--   aceptas…"), una aceptación más débil que conviene distinguir.
--
-- Las tres columnas van juntas o ninguna. Las cuentas anteriores quedan con
-- NULL: no se inventa una aceptación que nunca ocurrió. Aditivo: el código
-- anterior ignora las columnas.
-- =====================================================================

ALTER TABLE app_user
  ADD COLUMN terms_accepted_at  TIMESTAMPTZ,
  ADD COLUMN terms_version      TEXT,
  ADD COLUMN terms_accepted_via TEXT,
  ADD CONSTRAINT chk_app_user_terms_acceptance CHECK (
    (terms_accepted_at IS NULL AND terms_version IS NULL AND terms_accepted_via IS NULL)
    OR (
      terms_accepted_at IS NOT NULL
      AND terms_version IS NOT NULL
      AND char_length(terms_version) BETWEEN 1 AND 40
      AND terms_accepted_via IS NOT NULL
      AND terms_accepted_via IN ('checkbox', 'notice')
    )
  );
