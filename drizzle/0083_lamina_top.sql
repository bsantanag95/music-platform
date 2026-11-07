-- =====================================================================
-- 0083_lamina_top.sql
-- Lámina Top N (openspec: add-top-n-lamina-phase1, D7 de docs/05-features/sharing.md).
--
-- Reutiliza user_list / user_list_item con kind = 'top', como Camino: hereda
-- audiencia, ítems ordenados, moderación y exportación, y queda fuera de las
-- superficies de listas, que filtran por kind = 'standard'.
--
-- lamina_show_scores nace en false: `rating` no tiene audiencia, así que mostrar
-- las notas es una decisión explícita del dueño (ADR 0050).
-- El tope de ítems por formato es una regla entre filas: vive en el servicio,
-- con la fila de la lista bloqueada.
-- =====================================================================

ALTER TABLE user_list DROP CONSTRAINT chk_user_list_kind;

ALTER TABLE user_list ADD CONSTRAINT chk_user_list_kind
    CHECK (kind IN ('standard', 'artist_journey', 'custom_journey', 'top'));

ALTER TABLE user_list
    ADD COLUMN lamina_format TEXT,
    ADD COLUMN lamina_show_scores BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_list ADD CONSTRAINT chk_user_list_lamina_format
    CHECK (lamina_format IS NULL OR lamina_format IN ('top5', 'top10', 'grid9'));

-- Una Lámina siempre tiene formato, y nada más lo tiene.
ALTER TABLE user_list ADD CONSTRAINT chk_user_list_lamina_kind
    CHECK ((kind = 'top') = (lamina_format IS NOT NULL));

-- Álbumes y canciones: cada foto de artista exige su crédito, y 10 no entran en la línea.
ALTER TABLE user_list ADD CONSTRAINT chk_user_list_lamina_entity
    CHECK (kind <> 'top' OR entity_type IN ('release-group', 'recording'));

ALTER TABLE share_event DROP CONSTRAINT chk_share_event_target_kind;

ALTER TABLE share_event ADD CONSTRAINT chk_share_event_target_kind CHECK (target_kind IN (
    'album', 'song', 'artist', 'genre', 'awards', 'award', 'ceremony',
    'halls', 'hall', 'hall_class', 'collections', 'collection', 'profile',
    'review', 'comment', 'list', 'camino', 'user_collection', 'fingerprint',
    'rating', 'listen', 'top'
));

ALTER TABLE share_event DROP CONSTRAINT chk_share_event_format;

ALTER TABLE share_event ADD CONSTRAINT chk_share_event_format CHECK (format IN ('link', 'story', 'post', 'square'));
