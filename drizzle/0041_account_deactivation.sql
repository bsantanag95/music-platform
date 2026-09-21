-- =====================================================================
-- ACCOUNT_DEACTIVATION - desactivar cuenta (oculta a la persona, conserva la actividad)
-- =====================================================================

-- Change rework-account-settings, Fase 3 (capability account-lifecycle). NULL =
-- cuenta activa. Una cuenta desactivada no tiene sesiones (desactivar las borra) y
-- se reactiva al iniciar sesion (contrasena o Google), que borra esta marca. Nada
-- del contenido de la persona se toca: los seguimientos, el diario, las listas y
-- las resenas siguen existiendo; las consultas que listan personas o su
-- contenido social filtran `deactivated_at IS NULL` (services/auth/account-status.ts).
-- Aditiva: ninguna fila existente cambia de comportamiento al migrar.

ALTER TABLE app_user
    ADD COLUMN deactivated_at TIMESTAMPTZ;
