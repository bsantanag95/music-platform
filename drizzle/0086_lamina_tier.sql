-- =====================================================================
-- 0086_lamina_tier.sql
-- Tier list (openspec: add-tier-list-lamina-phase1, docs/05-features/sharing.md §4.3).
--
-- Reutiliza user_list / user_list_item con kind = 'tier', como el Top N (0083): hereda
-- audiencia, moderación, exportación y la exclusión de las superficies de listas.
--
-- tier_labels: las seis etiquetas de S a E, editables; el color de cada nivel es el de
-- su tramo de la escala de la casa y no se guarda. user_list_item.tier: 0 = S … 5 = E;
-- NULL = bandeja "Sin escuchar / sin valorar". Que solo una tier list tenga niveles es
-- una regla entre tablas: la impone el servicio, único que escribe la columna.
-- lamina_format sigue siendo solo del Top N; lamina_show_scores sirve a las dos.
-- =====================================================================

ALTER TABLE user_list DROP CONSTRAINT chk_user_list_kind;

ALTER TABLE user_list ADD CONSTRAINT chk_user_list_kind
    CHECK (kind IN ('standard', 'artist_journey', 'custom_journey', 'top', 'tier'));

-- Cada etiqueta: de 1 a 12 caracteres, sin espacios a los costados. Un CHECK no admite
-- subconsultas sobre el arreglo, así que la validación vive en una función inmutable.
CREATE FUNCTION fn_tier_labels_valid(labels TEXT[]) RETURNS BOOLEAN
    LANGUAGE sql IMMUTABLE STRICT AS $$
    SELECT cardinality(labels) = 6
       AND NOT EXISTS (
           SELECT 1 FROM unnest(labels) AS label
           WHERE label IS NULL OR char_length(label) NOT BETWEEN 1 AND 12 OR label <> btrim(label)
       )
$$;

ALTER TABLE user_list ADD COLUMN tier_labels TEXT[];

ALTER TABLE user_list ADD CONSTRAINT chk_user_list_tier_labels
    CHECK (tier_labels IS NULL OR fn_tier_labels_valid(tier_labels));

-- Una tier list siempre tiene etiquetas, y nada más las tiene.
ALTER TABLE user_list ADD CONSTRAINT chk_user_list_tier_kind
    CHECK ((kind = 'tier') = (tier_labels IS NOT NULL));

-- Álbumes en esta fase; canciones en la siguiente, sin otra migración.
ALTER TABLE user_list ADD CONSTRAINT chk_user_list_tier_entity
    CHECK (kind <> 'tier' OR entity_type IN ('release-group', 'recording'));

ALTER TABLE user_list_item ADD COLUMN tier SMALLINT;

ALTER TABLE user_list_item ADD CONSTRAINT chk_user_list_item_tier
    CHECK (tier IS NULL OR tier BETWEEN 0 AND 5);

ALTER TABLE share_event DROP CONSTRAINT chk_share_event_target_kind;

ALTER TABLE share_event ADD CONSTRAINT chk_share_event_target_kind CHECK (target_kind IN (
    'album', 'song', 'artist', 'genre', 'awards', 'award', 'ceremony',
    'halls', 'hall', 'hall_class', 'collections', 'collection', 'profile',
    'review', 'comment', 'list', 'camino', 'user_collection', 'fingerprint',
    'rating', 'listen', 'top', 'discography', 'tier'
));
