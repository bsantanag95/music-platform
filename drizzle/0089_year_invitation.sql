-- =====================================================================
-- 0089_year_invitation.sql
-- Aviso de "Tu año en discos" (openspec: add-year-in-discs-phase3, D3).
--
-- Aditiva salvo los CHECK que se rehacen (mismo nombre, regla más amplia):
-- ninguna fila existente los viola. Sin backfill.
--
-- El aviso no lleva actor ni referencia a otra tabla: su objeto es el año del
-- propio destinatario, en la columna nueva `year`. Un aviso por persona y año.
-- =====================================================================

ALTER TABLE notification
    ADD COLUMN year SMALLINT;

ALTER TABLE notification
    ADD CONSTRAINT chk_notification_year CHECK (
        (kind = 'year_in_discs') = (year IS NOT NULL)
        AND (year IS NULL OR year BETWEEN 2000 AND 2100)
    );

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
        'artist_single',
        'artist_award_nomination',
        'artist_award_win',
        'year_in_discs'
    ));

ALTER TABLE notification
    DROP CONSTRAINT chk_notification_actor;

-- El aviso del año tampoco expone a nadie.
ALTER TABLE notification
    ADD CONSTRAINT chk_notification_actor CHECK (
        (
            kind IN (
                'moderation',
                'comment_like_milestone',
                'list_save_milestone',
                'artist_release',
                'artist_release_announced',
                'artist_single',
                'artist_award_nomination',
                'artist_award_win',
                'year_in_discs'
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
                'artist_single',
                'artist_award_nomination',
                'artist_award_win',
                'year_in_discs'
            )
            AND actor_id IS NOT NULL
        )
    );

ALTER TABLE notification
    DROP CONSTRAINT chk_notification_target;

-- Igual que en 0077, más el aviso del año: ninguna referencia ni hito.
ALTER TABLE notification
    ADD CONSTRAINT chk_notification_target CHECK (
        (
            kind IN ('comment_reply', 'thread_reply')
            AND comment_id IS NOT NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
            AND award_ceremony_id IS NULL
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
            AND award_ceremony_id IS NULL
        )
        OR (
            kind = 'list_save_milestone'
            AND list_id IS NOT NULL
            AND milestone IS NOT NULL
            AND comment_id IS NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND release_group_id IS NULL
            AND award_ceremony_id IS NULL
        )
        OR (
            kind IN ('new_follower', 'follow_request', 'follow_accepted')
            AND follow_id IS NOT NULL
            AND comment_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
            AND award_ceremony_id IS NULL
            AND milestone IS NULL
        )
        OR (
            kind = 'moderation'
            AND moderation_action_id IS NOT NULL
            AND comment_id IS NULL
            AND follow_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
            AND award_ceremony_id IS NULL
            AND milestone IS NULL
        )
        OR (
            kind IN ('artist_release', 'artist_release_announced', 'artist_single')
            AND release_group_id IS NOT NULL
            AND comment_id IS NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND award_ceremony_id IS NULL
            AND milestone IS NULL
        )
        OR (
            kind IN ('artist_award_nomination', 'artist_award_win')
            AND award_ceremony_id IS NOT NULL
            AND comment_id IS NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
            AND milestone IS NULL
        )
        OR (
            kind = 'year_in_discs'
            AND comment_id IS NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
            AND list_id IS NULL
            AND release_group_id IS NULL
            AND award_ceremony_id IS NULL
            AND milestone IS NULL
        )
    );

-- Un aviso por persona y año: repetir el envío no duplica.
CREATE UNIQUE INDEX uq_notification_recipient_year
    ON notification (recipient_id, kind, year)
    WHERE year IS NOT NULL;

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
        'artist_single',
        'artist_award',
        'year_in_discs'
    ));
