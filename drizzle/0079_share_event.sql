-- =====================================================================
-- 0079_share_event.sql
-- Registro de cada uso de la hoja de compartir (openspec:
-- add-share-foundation, decisión D13 de docs/05-features/sharing.md).
--
-- Sin datos personales: no guarda quién comparte, su IP ni su agente. La
-- referencia es heterogénea (ids y slugs), por eso no hay FK; la única
-- referencia ligada a una persona es la de un perfil (id de usuario), que se
-- borra junto con la cuenta. Filas inmutables: sin updated_at.
-- Las listas de los CHECK son las de src/lib/share/kinds.ts.
-- =====================================================================

CREATE TABLE share_event (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_kind TEXT NOT NULL,
    target_ref  TEXT NOT NULL,
    channel     TEXT NOT NULL,
    format      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_share_event_target_kind CHECK (target_kind IN (
        'album', 'song', 'artist', 'genre', 'awards', 'award', 'ceremony',
        'halls', 'hall', 'hall_class', 'collections', 'collection', 'profile'
    )),
    CONSTRAINT chk_share_event_target_ref CHECK (char_length(target_ref) BETWEEN 1 AND 200),
    CONSTRAINT chk_share_event_channel CHECK (channel IN (
        'native', 'copy', 'x', 'whatsapp', 'threads', 'bluesky',
        'facebook', 'telegram', 'reddit', 'download'
    )),
    CONSTRAINT chk_share_event_format CHECK (format IN ('link'))
);

CREATE INDEX idx_share_event_created ON share_event (created_at);
CREATE INDEX idx_share_event_target ON share_event (target_kind, target_ref);
