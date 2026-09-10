-- =====================================================================
-- Migracion 0022 — roles de plataforma, moderacion y suspension social
-- =====================================================================

CREATE TABLE user_role (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('moderator', 'admin')),
    granted_by  UUID REFERENCES app_user (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_user_role_user_role ON user_role (user_id, role);
CREATE INDEX idx_user_role_user ON user_role (user_id);

CREATE TABLE user_restriction (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    scope       TEXT NOT NULL CHECK (scope IN ('social_activity')),
    starts_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ,
    reason      TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
    created_by  UUID REFERENCES app_user (id) ON DELETE SET NULL,
    revoked_at  TIMESTAMPTZ,
    revoked_by  UUID REFERENCES app_user (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (expires_at IS NULL OR expires_at > starts_at),
    CHECK ((revoked_at IS NULL) = (revoked_by IS NULL))
);

CREATE INDEX idx_user_restriction_active
    ON user_restriction (user_id, scope, starts_at, expires_at)
    WHERE revoked_at IS NULL;

CREATE TABLE content_report (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    comment_id     UUID REFERENCES comment (id) ON DELETE CASCADE,
    review_id      UUID REFERENCES review (id) ON DELETE CASCADE,
    reason         TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'resolved', 'dismissed')),
    resolved_by    UUID REFERENCES app_user (id) ON DELETE SET NULL,
    resolved_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(comment_id, review_id) = 1),
    CHECK ((resolved_at IS NULL) = (resolved_by IS NULL) OR status = 'pending')
);

CREATE UNIQUE INDEX uq_content_report_open_comment
    ON content_report (reporter_id, comment_id)
    WHERE comment_id IS NOT NULL AND status = 'pending';
CREATE UNIQUE INDEX uq_content_report_open_review
    ON content_report (reporter_id, review_id)
    WHERE review_id IS NOT NULL AND status = 'pending';
CREATE INDEX idx_content_report_status_created ON content_report (status, created_at);

ALTER TABLE comment
    ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible'
        CHECK (moderation_status IN ('visible', 'hidden')),
    ADD COLUMN moderated_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
    ADD COLUMN moderated_at TIMESTAMPTZ,
    ADD COLUMN moderation_reason TEXT;

ALTER TABLE review
    ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible'
        CHECK (moderation_status IN ('visible', 'hidden')),
    ADD COLUMN moderated_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
    ADD COLUMN moderated_at TIMESTAMPTZ,
    ADD COLUMN moderation_reason TEXT;

ALTER TABLE user_list
    ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible'
        CHECK (moderation_status IN ('visible', 'hidden')),
    ADD COLUMN moderated_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
    ADD COLUMN moderated_at TIMESTAMPTZ,
    ADD COLUMN moderation_reason TEXT,
    ADD COLUMN is_official BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN official_published_by UUID REFERENCES app_user (id) ON DELETE SET NULL,
    ADD COLUMN official_published_at TIMESTAMPTZ;

CREATE TABLE moderation_action (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id       UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
    action         TEXT NOT NULL CHECK (action IN ('hide', 'restore', 'report_resolve', 'report_dismiss')),
    comment_id     UUID REFERENCES comment (id) ON DELETE SET NULL,
    review_id      UUID REFERENCES review (id) ON DELETE SET NULL,
    list_id        UUID REFERENCES user_list (id) ON DELETE SET NULL,
    restriction_id UUID REFERENCES user_restriction (id) ON DELETE SET NULL,
    reason         TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(comment_id, review_id, list_id, restriction_id) = 1)
);

CREATE INDEX idx_moderation_action_created ON moderation_action (created_at DESC);

CREATE TABLE user_role_action (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
    target_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('moderator', 'admin')),
    action      TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_role_action_target ON user_role_action (target_id, created_at DESC);
