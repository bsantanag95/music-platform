-- Migración 0007: identidad social — visibilidad de perfil, seguimiento y bloqueo.
-- Fase 5, cambio add-social-profile-follow (perfil/privacidad/seguimiento).

-- ---------------------------------------------------------------------
-- PERFIL — visibilidad pública o privada del perfil
-- ---------------------------------------------------------------------
ALTER TABLE app_user
    ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'public';

ALTER TABLE app_user
    ADD CONSTRAINT chk_app_user_profile_visibility
        CHECK (profile_visibility IN ('public', 'private'));

-- ---------------------------------------------------------------------
-- USER_FOLLOW — relación unilateral de seguimiento con solicitudes
-- ---------------------------------------------------------------------
CREATE TABLE user_follow (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id  UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    followed_id  UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    status       TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- un usuario no puede seguirse a sí mismo
    CHECK (follower_id <> followed_id)
);

-- un solo intento de relación por pareja, en cualquier dirección de estado
CREATE UNIQUE INDEX uq_user_follow_pair ON user_follow (follower_id, followed_id);

CREATE INDEX idx_user_follow_followed ON user_follow (followed_id);

-- ---------------------------------------------------------------------
-- USER_BLOCK — bloqueo básico entre cuentas
-- ---------------------------------------------------------------------
CREATE TABLE user_block (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id  UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    blocked_id  UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- un usuario no puede bloquearse a sí mismo
    CHECK (blocker_id <> blocked_id)
);

CREATE UNIQUE INDEX uq_user_block_pair ON user_block (blocker_id, blocked_id);

CREATE INDEX idx_user_block_blocked ON user_block (blocked_id);

-- ---------------------------------------------------------------------
-- updated_at de user_follow se mantiene con el trigger genérico existente
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_user_follow_touch
BEFORE UPDATE ON user_follow
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();