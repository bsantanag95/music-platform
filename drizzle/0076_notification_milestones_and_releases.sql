-- =====================================================================
-- 0076_notification_milestones_and_releases.sql
-- Hitos (likes de un comentario, guardados de una lista) y avisos de
-- lanzamientos de artistas seguidos (openspec:
-- add-notification-milestones-and-releases, D4).
--
-- Aditiva salvo los CHECK y el único que se rehacen (mismo nombre, regla más
-- amplia): ninguna fila de la Fase 1 los viola. Sin backfill: no se emiten
-- hitos ni lanzamientos de eventos anteriores.
--
-- Los cinco tipos nuevos no llevan actor: los likes y los guardados son
-- anónimos y un lanzamiento no tiene una persona detrás. `milestone` es
-- obligatorio en los dos hitos y nulo en el resto.
-- =====================================================================

ALTER TABLE notification
    ADD COLUMN milestone INTEGER,
    ADD COLUMN list_id UUID REFERENCES user_list (id) ON DELETE CASCADE,
    ADD COLUMN release_group_id UUID REFERENCES release_group (id) ON DELETE CASCADE;

ALTER TABLE notification
    DROP CONSTRAINT chk_notification_kind;

ALTER TABLE notification
    ADD CONSTRAINT chk_notification_kind CHECK (kind IN (
        'comment_reply',
        'thread_reply',
        'new_follower',
        'follow_request',
        'follow_accepted',
        'moderation',
        'comment_like_milestone',
        'list_save_milestone',
        'artist_release',
        'artist_release_announced',
        'artist_single'
    ));

ALTER TABLE notification
    DROP CONSTRAINT chk_notification_actor;

-- La moderación y los cinco tipos nuevos no exponen a nadie; el resto siempre
-- tiene actor (y el actor nunca es el destinatario, regla que ya existía).
ALTER TABLE notification
    ADD CONSTRAINT chk_notification_actor CHECK (
        (
            kind IN (
                'moderation',
                'comment_like_milestone',
                'list_save_milestone',
                'artist_release',
                'artist_release_announced',
                'artist_single'
            )
            AND actor_id IS NULL
        )
        OR (
            kind NOT IN (
                'moderation',
                'comment_like_milestone',
                'list_save_milestone',
                'artist_release',
                'artist_release_announced',
                'artist_single'
            )
            AND actor_id IS NOT NULL
        )
    );

ALTER TABLE notification
    DROP CONSTRAINT chk_notification_target;

-- Cada tipo exige exactamente su referencia, prohíbe las demás y fija si lleva
-- hito.
ALTER TABLE notification
    ADD CONSTRAINT chk_notification_target CHECK (
        (
            kind IN ('comment_reply', 'thread_reply')
            AND comment_id IS NOT NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
            AND milestone IS NULL
        )
        OR (
            kind = 'comment_like_milestone'
            AND comment_id IS NOT NULL
            AND milestone IS NOT NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
        )
        OR (
            kind = 'list_save_milestone'
            AND list_id IS NOT NULL
            AND milestone IS NOT NULL
            AND comment_id IS NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND release_group_id IS NULL
        )
        OR (
            kind IN ('new_follower', 'follow_request', 'follow_accepted')
            AND follow_id IS NOT NULL
            AND comment_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
            AND milestone IS NULL
        )
        OR (
            kind = 'moderation'
            AND moderation_action_id IS NOT NULL
            AND comment_id IS NULL
            AND follow_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
            AND milestone IS NULL
        )
        OR (
            kind IN ('artist_release', 'artist_release_announced', 'artist_single')
            AND release_group_id IS NOT NULL
            AND comment_id IS NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND milestone IS NULL
        )
    );

ALTER TABLE notification
    ADD CONSTRAINT chk_notification_milestone CHECK (milestone IS NULL OR milestone > 0);

-- Un hito se avisa una sola vez por objeto: el hito forma parte de la clave.
DROP INDEX uq_notification_recipient_comment_kind;

CREATE UNIQUE INDEX uq_notification_recipient_comment_kind
    ON notification (recipient_id, comment_id, kind, coalesce(milestone, 0))
    WHERE comment_id IS NOT NULL;

CREATE UNIQUE INDEX uq_notification_recipient_list_milestone
    ON notification (recipient_id, list_id, kind, coalesce(milestone, 0))
    WHERE list_id IS NOT NULL;

-- Un aviso por persona, disco y tipo: la sincronización diaria no repite nada.
CREATE UNIQUE INDEX uq_notification_recipient_release_kind
    ON notification (recipient_id, release_group_id, kind)
    WHERE release_group_id IS NOT NULL;

ALTER TABLE notification_preference
    DROP CONSTRAINT chk_notification_preference_kind;

ALTER TABLE notification_preference
    ADD CONSTRAINT chk_notification_preference_kind CHECK (kind IN (
        'comment_reply',
        'thread_reply',
        'new_follower',
        'follow_accepted',
        'comment_like_milestone',
        'list_save_milestone',
        'artist_release',
        'artist_release_announced',
        'artist_single'
    ));

-- Última vez que la persona abrió la pestaña "Novedades": el punto de la
-- pestaña solo cuenta avisos de lanzamiento posteriores. Nulo = nunca.
ALTER TABLE app_user
    ADD COLUMN notifications_releases_seen_at TIMESTAMPTZ;
