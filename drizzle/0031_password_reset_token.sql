-- =====================================================================
-- PASSWORD_RESET_TOKEN - recuperacion de contrasena (change add-password-reset)
-- =====================================================================

CREATE TABLE password_reset_token (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    CHECK (expires_at > created_at)
);

-- El token en claro solo viaja en el link del correo; en la base se guarda su hash.
CREATE UNIQUE INDEX uq_password_reset_token_hash ON password_reset_token (token_hash);
-- Permite invalidar todos los tokens de un usuario al pedir uno nuevo o al completar el reset.
CREATE INDEX idx_password_reset_token_user ON password_reset_token (user_id);
-- Permite localizar tokens vencidos para el job de limpieza.
CREATE INDEX idx_password_reset_token_expires_at ON password_reset_token (expires_at);
