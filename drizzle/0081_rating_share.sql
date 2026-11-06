-- =====================================================================
-- 0081_rating_share.sql
-- Marca de valoración compartida y tipos `rating` y `listen` de share_event
-- (openspec: add-share-user-actions-phase2, D15 de docs/05-features/sharing.md).
--
-- `rating` no tiene audiencia: la ven el dueño y sus seguidores. Una fila acá hace
-- pública esa sola valoración, por decisión del dueño, para su página de relación
-- y su imagen. Tabla aparte, como rating_highlight, para no disparar
-- trg_rating_touch: `rating.updated_at` ordena el feed y "Mis valoraciones".
-- Editar la valoración conserva la fila; borrarla la borra en cascada.
-- =====================================================================

CREATE TABLE rating_share (
    user_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    rating_id UUID NOT NULL REFERENCES rating (id) ON DELETE CASCADE,
    shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, rating_id)
);

CREATE INDEX idx_rating_share_rating ON rating_share (rating_id);

ALTER TABLE share_event DROP CONSTRAINT chk_share_event_target_kind;

ALTER TABLE share_event ADD CONSTRAINT chk_share_event_target_kind CHECK (target_kind IN (
    'album', 'song', 'artist', 'genre', 'awards', 'award', 'ceremony',
    'halls', 'hall', 'hall_class', 'collections', 'collection', 'profile',
    'review', 'comment', 'list', 'camino', 'user_collection', 'fingerprint',
    'rating', 'listen'
));
