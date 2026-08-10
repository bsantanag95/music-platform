-- =====================================================================
-- AUTENTICACION - contrasenas locales, sesiones e identidades externas
-- =====================================================================

ALTER TABLE app_user
    ADD COLUMN password_hash TEXT;

-- ---------------------------------------------------------------------
-- SESSION — sesion server-side con token opaco hasheado
-- ---------------------------------------------------------------------

CREATE TABLE session (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX uq_session_token_hash ON session (token_hash);
CREATE INDEX idx_session_user ON session (user_id);
CREATE INDEX idx_session_expires_at ON session (expires_at);

-- ---------------------------------------------------------------------
-- AUTH_IDENTITY — identidad externa vinculada a un usuario
-- ---------------------------------------------------------------------

CREATE TABLE auth_identity (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    provider             TEXT NOT NULL,
    provider_account_id  TEXT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_auth_identity_provider_account
    ON auth_identity (provider, provider_account_id);
CREATE INDEX idx_auth_identity_user ON auth_identity (user_id);
