-- =====================================================================
-- EMAIL_VERIFICATION - verificacion de email en el registro
-- =====================================================================

-- Estado de verificacion del email (change add-email-verification). Las
-- cuentas preexistentes se consideran verificadas (grandfather); las altas
-- nuevas via Google se marcan al crearse y las locales quedan nulas hasta
-- consumir un token.
ALTER TABLE app_user
    ADD COLUMN email_verified_at TIMESTAMPTZ;

UPDATE app_user
    SET email_verified_at = created_at
    WHERE email_verified_at IS NULL;

-- ---------------------------------------------------------------------
-- EMAIL_VERIFICATION_TOKEN - token de un solo uso (TTL 24 h)
-- ---------------------------------------------------------------------

CREATE TABLE email_verification_token (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    CHECK (expires_at > created_at)
);

-- El token en claro solo viaja en el link del correo; en la base va su hash.
CREATE UNIQUE INDEX uq_email_verification_token_hash ON email_verification_token (token_hash);
-- Un solo token vigente por usuario; un reenvio lo reemplaza con ON CONFLICT.
CREATE UNIQUE INDEX uq_email_verification_token_user ON email_verification_token (user_id);
-- Permite localizar tokens vencidos para el job de limpieza.
CREATE INDEX idx_email_verification_token_expires_at ON email_verification_token (expires_at);
