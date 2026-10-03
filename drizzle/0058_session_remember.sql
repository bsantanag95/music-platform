-- =====================================================================
-- 0058_session_remember.sql
-- Sesión "mantenida" o "solo esta visita" (openspec: add-keep-signed-in,
-- ADR 0026).
--
-- - `session.remember`: si la persona pidió mantener la sesión en el
--   dispositivo. Una sesión mantenida dura 30 días desde su última
--   actividad (la app extiende `expires_at` junto con `last_seen_at`); una
--   no mantenida caduca a las 24 horas de iniciada y no se renueva.
--
-- `DEFAULT true`: las sesiones existentes ya eran persistentes (cookie de
-- 30 días), así que quedan como mantenidas sin backfill. Aditivo: el código
-- anterior ignora la columna.
-- =====================================================================

ALTER TABLE session
  ADD COLUMN remember boolean NOT NULL DEFAULT true;
