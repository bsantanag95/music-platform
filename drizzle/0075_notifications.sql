-- =====================================================================
-- 0075_notifications.sql
-- Bandeja de notificaciones in-app (openspec: add-notifications-core).
--
-- Fase 1 (núcleo in-app): respuestas a un tema, respuestas en un hilo donde
-- se participó, nuevos seguidores, solicitudes de seguimiento, solicitudes
-- aceptadas y acciones de moderación. Una fila por evento (ADR 0045): la
-- escribe el servicio de emisión en la misma transacción que la acción.
--
-- Retracción por cascada (mismo principio del ADR 0009): borrar la respuesta,
-- el seguimiento (dejar de seguir, quitar seguidor, rechazar, cancelar,
-- bloquear) o la cuenta de cualquiera de las dos partes borra la fila sin
-- código de limpieza. `moderation_action` nunca se borra (sus FK a contenido
-- son ON DELETE SET NULL), así que los avisos de moderación sobreviven al
-- borrado del objeto, como su auditoría.
--
-- `group_key` lo fija el emisor: 'thread:<rootId>' para las respuestas,
-- 'followers' para nuevos seguidores (se agrupan por día local al leer),
-- 'follow:<followId>' para solicitudes / aceptaciones y
-- 'moderation:<actionId>' para moderación (estas nunca se agrupan).
-- Sin `updated_at`: la fila solo cambia `read_at`, no lleva trigger.
-- Aditiva: la bandeja empieza vacía, sin backfill de eventos pasados.
-- =====================================================================

CREATE TABLE notification (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id         UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    kind                 TEXT NOT NULL,
    actor_id             UUID REFERENCES app_user (id) ON DELETE CASCADE,
    comment_id           UUID REFERENCES comment (id) ON DELETE CASCADE,
    follow_id            UUID REFERENCES user_follow (id) ON DELETE CASCADE,
    moderation_action_id UUID REFERENCES moderation_action (id) ON DELETE CASCADE,
    group_key            TEXT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at              TIMESTAMPTZ,
    CONSTRAINT chk_notification_kind CHECK (kind IN (
        'comment_reply',
        'thread_reply',
        'new_follower',
        'follow_request',
        'follow_accepted',
        'moderation'
    )),
    -- La moderación no expone al moderador; el resto siempre tiene actor.
    CONSTRAINT chk_notification_actor CHECK (
        (kind = 'moderation' AND actor_id IS NULL)
        OR (kind <> 'moderation' AND actor_id IS NOT NULL)
    ),
    CONSTRAINT chk_notification_actor_not_recipient CHECK (
        actor_id IS NULL OR actor_id <> recipient_id
    ),
    -- Cada tipo exige exactamente su referencia y prohíbe las demás.
    CONSTRAINT chk_notification_target CHECK (
        (
            kind IN ('comment_reply', 'thread_reply')
            AND comment_id IS NOT NULL
            AND follow_id IS NULL
            AND moderation_action_id IS NULL
        )
        OR (
            kind IN ('new_follower', 'follow_request', 'follow_accepted')
            AND follow_id IS NOT NULL
            AND comment_id IS NULL
            AND moderation_action_id IS NULL
        )
        OR (
            kind = 'moderation'
            AND moderation_action_id IS NOT NULL
            AND comment_id IS NULL
            AND follow_id IS NULL
        )
    ),
    CONSTRAINT chk_notification_group_key CHECK (char_length(group_key) BETWEEN 1 AND 80)
);

CREATE INDEX idx_notification_recipient_created
    ON notification (recipient_id, created_at DESC);

-- Contador de no leídas: índice parcial que usa el layout autenticado.
CREATE INDEX idx_notification_recipient_unread
    ON notification (recipient_id)
    WHERE read_at IS NULL;

-- No duplicar el mismo aviso por el mismo objeto y tipo.
CREATE UNIQUE INDEX uq_notification_recipient_comment_kind
    ON notification (recipient_id, comment_id, kind)
    WHERE comment_id IS NOT NULL;

CREATE UNIQUE INDEX uq_notification_recipient_follow_kind
    ON notification (recipient_id, follow_id, kind)
    WHERE follow_id IS NOT NULL;

CREATE UNIQUE INDEX uq_notification_recipient_moderation
    ON notification (recipient_id, moderation_action_id)
    WHERE moderation_action_id IS NOT NULL;

CREATE TABLE notification_preference (
    user_id UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    kind    TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (user_id, kind),
    CONSTRAINT chk_notification_preference_kind CHECK (kind IN (
        'comment_reply',
        'thread_reply',
        'new_follower',
        'follow_accepted'
    ))
);

-- Última vez que la persona abrió la bandeja: el contador solo cuenta filas
-- posteriores. Nulo = nunca la abrió.
ALTER TABLE app_user
    ADD COLUMN notifications_seen_at TIMESTAMPTZ;
