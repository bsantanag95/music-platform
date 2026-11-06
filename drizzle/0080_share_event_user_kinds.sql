-- =====================================================================
-- 0080_share_event_user_kinds.sql
-- Tipos de objeto de lo que comparte una persona (openspec:
-- add-share-user-actions-phase1): reseña, comentario, lista, Camino y la
-- colección y la huella de un perfil. La lista del CHECK es la de
-- src/lib/share/kinds.ts.
--
-- La referencia sigue siendo el id interno, sin FK. Las de estos tipos están
-- ligadas a una cuenta: se borran con ella en account-lifecycle.ts.
-- =====================================================================

ALTER TABLE share_event DROP CONSTRAINT chk_share_event_target_kind;

ALTER TABLE share_event ADD CONSTRAINT chk_share_event_target_kind CHECK (target_kind IN (
    'album', 'song', 'artist', 'genre', 'awards', 'award', 'ceremony',
    'halls', 'hall', 'hall_class', 'collections', 'collection', 'profile',
    'review', 'comment', 'list', 'camino', 'user_collection', 'fingerprint'
));
