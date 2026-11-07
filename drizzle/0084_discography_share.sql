-- =====================================================================
-- 0084_discography_share.sql
-- Marca de discografía compartida y tipo `discography` de share_event
-- (openspec: add-discography-lamina-phase1, ADR 0053).
--
-- Una discografía es una Lámina derivada: se calcula de las valoraciones de una
-- persona con un artista. `rating` no tiene audiencia, así que una fila acá es la
-- decisión del dueño de abrir esa página y su imagen a quien pueda ver su perfil.
-- Se mantiene al día: las notas nuevas de ese artista también se ven. Tabla aparte,
-- como rating_share, y sin tocar `rating`.
-- =====================================================================

CREATE TABLE discography_share (
    user_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, artist_id)
);

CREATE INDEX idx_discography_share_artist ON discography_share (artist_id);

ALTER TABLE share_event DROP CONSTRAINT chk_share_event_target_kind;

ALTER TABLE share_event ADD CONSTRAINT chk_share_event_target_kind CHECK (target_kind IN (
    'album', 'song', 'artist', 'genre', 'awards', 'award', 'ceremony',
    'halls', 'hall', 'hall_class', 'collections', 'collection', 'profile',
    'review', 'comment', 'list', 'camino', 'user_collection', 'fingerprint',
    'rating', 'listen', 'top', 'discography'
));
