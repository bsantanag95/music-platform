-- =====================================================================
-- 0077_notification_digest_and_awards.sql
-- Avisos de premios de artistas seguidos y estado del resumen semanal
-- (openspec: add-notification-digest-and-awards, D2, D6 y D7).
--
-- Aditiva salvo los CHECK que se rehacen (mismo nombre, regla más amplia):
-- ninguna fila de las fases anteriores los viola. Sin backfill: el resumen
-- empieza desactivado para todos y los premios ya cargados no avisan.
--
-- Los dos tipos nuevos no llevan actor (los premios no tienen una persona
-- detrás) y su referencia estable es la ceremonia, nunca la nominación: la
-- carga de un premio reescribe las nominaciones de cada categoría.
-- =====================================================================

ALTER TABLE notification
    ADD COLUMN award_ceremony_id UUID REFERENCES award_ceremony (id) ON DELETE CASCADE;

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
        'artist_award_win'
    ));

ALTER TABLE notification
    DROP CONSTRAINT chk_notification_actor;

-- La moderación, los hitos, los lanzamientos y los premios no exponen a nadie;
-- el resto siempre tiene actor (y el actor nunca es el destinatario, regla que
-- ya existía y este cambio no toca).
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
                'artist_award_win'
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
                'artist_award_win'
            )
            AND actor_id IS NOT NULL
        )
    );

ALTER TABLE notification
    DROP CONSTRAINT chk_notification_target;

-- Cada tipo exige exactamente su referencia, prohíbe las demás y fija si lleva
-- hito. Los premios exigen la ceremonia y ninguna otra referencia.
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
    );

-- Un aviso por persona, ceremonia y tipo: recargar un premio no repite nada.
CREATE UNIQUE INDEX uq_notification_recipient_ceremony_kind
    ON notification (recipient_id, award_ceremony_id, kind)
    WHERE award_ceremony_id IS NOT NULL;

ALTER TABLE notification_preference
    DROP CONSTRAINT chk_notification_preference_kind;

-- Una sola preferencia (`artist_award`) gobierna nominaciones y premios.
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
        'artist_award'
    ));

-- Resumen semanal por email (D2): opt-in y marca de la última ventana enviada.
-- La preferencia vive en la cuenta y no en `notification_preference`, que es
-- por tipo de aviso y no por canal.
ALTER TABLE app_user
    ADD COLUMN notification_digest_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN notification_digest_sent_at TIMESTAMPTZ;
