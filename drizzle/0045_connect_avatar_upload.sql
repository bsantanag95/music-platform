-- Migración 0045: conectar el primer consumidor de la tabla `image`.
-- openspec: connect-avatar-upload.
--
-- `avatar_url` era una columna muerta (nunca leída por la UI, sin storage
-- backend). Se reemplaza por `avatar_image_id` que referencia `image(id)`
-- con `ON DELETE SET NULL` (ADR 0017): al borrar la fila `image` la
-- asociación se limpia sin error, y el borrado deliberado del archivo lo
-- hace la capa de aplicación (eliminación de cuenta, reemplazo de avatar).

ALTER TABLE app_user
    DROP CONSTRAINT chk_app_user_avatar_url,
    DROP COLUMN avatar_url,
    ADD COLUMN avatar_image_id UUID REFERENCES image(id) ON DELETE SET NULL;
