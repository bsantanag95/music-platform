-- Migración 0044: tabla `image` para imágenes propias de la aplicación.
-- openspec: add-image-storage.
--
-- Cada fila representa un archivo procesado que la aplicación posee (no un
-- "dueño"; los dueños referencian image.id con FK propias en changes futuros).
-- `kind` identifica el preset con que se generó, para poder reprocesar si el
-- preset cambia. `byte_size` queda para auditoría y cuotas futuras.
-- `storage_key` es la clave del objeto en el proveedor de storage; la URL
-- pública se resuelve en runtime por el servicio, no se persiste.

CREATE TABLE image (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_key TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
