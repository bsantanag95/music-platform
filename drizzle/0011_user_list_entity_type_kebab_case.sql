-- Migración 0011: corregir el dominio de user_list.entity_type a kebab-case.
-- Corrección de bug: 0009 definió el CHECK (y la comparación del trigger de
-- validación cruzada) con 'release_group' (guion bajo), pero el contrato de
-- API y toda la capa de aplicación usan 'release-group' (kebab-case, mismo
-- formato que SocialTargetTypeSchema). Crear una lista de álbumes violaba
-- user_list_entity_type_check con error 23514 → 500 en POST /api/me/lists.

-- Normalización defensiva: la app nunca pudo insertar 'release_group' (el
-- CHECK lo rechazaba), así que no deberían existir filas afectadas; si las
-- hubiera, se normalizan antes de reemplazar la restricción.
UPDATE user_list SET entity_type = 'release-group' WHERE entity_type = 'release_group';

-- El CHECK original fue declarado inline en 0009 (nombre automático
-- user_list_entity_type_check). Se reemplaza por uno nombrado explícitamente,
-- alineado con el espejo src/db/schema.ts.
ALTER TABLE user_list DROP CONSTRAINT user_list_entity_type_check;
ALTER TABLE user_list ADD CONSTRAINT chk_user_list_entity_type CHECK (
    entity_type IN ('artist', 'release-group', 'recording')
);

-- El trigger de validación cruzada compara expected_type con el valor almacenado:
-- debe usar kebab-case también, si no la rama release-group queda sin validar.
CREATE OR REPLACE FUNCTION trg_user_list_item_target_type()
RETURNS TRIGGER AS $$
DECLARE
    expected_type TEXT;
BEGIN
    SELECT entity_type INTO expected_type FROM user_list WHERE id = NEW.list_id;

    IF expected_type = 'artist' AND NEW.artist_id IS NULL THEN
        RAISE EXCEPTION 'user_list_item must reference an artist when list is artist-type';
    ELSIF expected_type = 'release-group' AND NEW.release_group_id IS NULL THEN
        RAISE EXCEPTION 'user_list_item must reference a release_group when list is release-group-type';
    ELSIF expected_type = 'recording' AND NEW.recording_id IS NULL THEN
        RAISE EXCEPTION 'user_list_item must reference a recording when list is recording-type';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;