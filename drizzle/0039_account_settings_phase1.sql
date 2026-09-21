-- =====================================================================
-- ACCOUNT_SETTINGS_PHASE1 - usuario, email, sesiones por dispositivo, idioma
-- =====================================================================

-- Change rework-account-settings, Fase 1 (Cuenta y seguridad). Todo es aditivo:
-- ninguna fila existente cambia de comportamiento al migrar.

-- Cambio de usuario (capability account-username). NULL = nunca lo cambio; la
-- fecha implementa "un cambio cada 30 dias".
ALTER TABLE app_user
    ADD COLUMN username_changed_at TIMESTAMPTZ;

-- Idioma preferido de la interfaz (capability account-preferences). NULL = sin
-- preferencia: se conserva el idioma de la ruta, como hasta ahora.
ALTER TABLE app_user
    ADD COLUMN locale TEXT;

ALTER TABLE app_user
    ADD CONSTRAINT chk_app_user_locale
    CHECK (locale IS NULL OR locale IN ('es', 'en'));

-- ---------------------------------------------------------------------
-- USERNAME_ALIAS - usuario anterior reservado durante 30 dias
-- ---------------------------------------------------------------------
-- Mientras dura la reserva nadie mas puede tomar ese usuario y las paginas de
-- perfil redirigen al usuario nuevo. Los alias vencidos no se consultan; se
-- borran al renombrar (ver services/auth/username.ts).

CREATE TABLE username_alias (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    username    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    CHECK (expires_at > created_at)
);

-- El usuario es unico sin distinguir mayusculas, igual que la comparacion de
-- disponibilidad (app_user.username, en cambio, distingue mayusculas por historia).
CREATE UNIQUE INDEX uq_username_alias_lower ON username_alias (lower(username));
CREATE INDEX idx_username_alias_user ON username_alias (user_id);
CREATE INDEX idx_username_alias_expires_at ON username_alias (expires_at);

-- ---------------------------------------------------------------------
-- EMAIL_CHANGE_TOKEN - cambio de email pendiente de confirmar (TTL 24 h)
-- ---------------------------------------------------------------------
-- Mismo patron que email_verification_token: solo el hash del token en la
-- base, un solo cambio vigente por usuario (un pedido nuevo lo reemplaza) y
-- borrado fisico al confirmar. El email actual NO cambia hasta confirmar.

CREATE TABLE email_change_token (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    new_email   TEXT NOT NULL,
    token_hash  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX uq_email_change_token_hash ON email_change_token (token_hash);
CREATE UNIQUE INDEX uq_email_change_token_user ON email_change_token (user_id);
CREATE INDEX idx_email_change_token_expires_at ON email_change_token (expires_at);

-- ---------------------------------------------------------------------
-- SESSION - etiqueta del dispositivo y ultima actividad
-- ---------------------------------------------------------------------
-- Solo se guarda una etiqueta legible ("Chrome · Windows"): ni el User-Agent
-- completo ni la IP. Las sesiones previas quedan con ambas en NULL y siguen
-- siendo validas.

ALTER TABLE session
    ADD COLUMN device_label TEXT,
    ADD COLUMN last_seen_at TIMESTAMPTZ;

ALTER TABLE session
    ADD CONSTRAINT chk_session_device_label
    CHECK (device_label IS NULL OR length(device_label) <= 80);
