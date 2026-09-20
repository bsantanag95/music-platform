-- =====================================================================
-- PASSWORD_RESET_TOKEN - un solo token vigente por usuario
-- =====================================================================
-- Refuerza el invariante de ADR 0014. Con el indice no unico original, dos
-- pedidos concurrentes de restablecimiento podian insertar dos tokens validos
-- a la vez. El indice unico sobre user_id lo impide a nivel de PostgreSQL y
-- permite reemplazar el token anterior con un INSERT ... ON CONFLICT.

DROP INDEX IF EXISTS idx_password_reset_token_user;

CREATE UNIQUE INDEX uq_password_reset_token_user ON password_reset_token (user_id);
