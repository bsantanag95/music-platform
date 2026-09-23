## Why

Hoy la app no tiene ninguna forma de hacerse responsable de un archivo de imagen propio: `app_user.avatar_url` y `artist.photo_url` son columnas sin implementación real (sin upload, sin storage backend, sin dominio permitido en `next.config.mjs`), y no existe ningún servicio de subida, validación o procesamiento de imágenes. Cada feature futura que necesite una imagen propia (avatar, foto de artista, portada de playlist, banner) terminaría reinventando su propio mecanismo de storage si no se resuelve una vez, de forma genérica, ahora. Esto es distinto del caso de coverart (`cover-art-resolution`), que resuelve URLs externas de CoverArtArchive sin poseer el archivo; acá la app sí es dueña del binario y responsable de su ciclo de vida.

## What Changes

- Nueva tabla `image` que representa un archivo procesado que la aplicación posee: `id`, `storage_key`, `kind`, `mime_type`, `width`, `height`, `byte_size`, `created_at`. Una fila = un archivo en una sola resolución (sin variantes en esta fase). `kind` se persiste para poder identificar qué filas reprocesar si un preset cambia; `byte_size` para auditoría y cuotas futuras.
- Dos capas separadas en `src/services/storage/`: un `StorageProvider` (`put()`, `delete()`, `publicUrl()`, puro I/O contra el proveedor) y el `imageService` (`process()`, `upload()`, `deleteImage()`, `resolveUrl()`), que orquesta validación, procesamiento y persistencia. Cambiar de proveedor implementa una interfaz; la lógica de base de datos no se toca.
- Driver de storage seleccionable por entorno: `local` (escribe en `public/uploads/`, servido estáticamente por Next) para desarrollo, y `s3` (Cloudflare R2 u otro S3-compatible) para producción. Sin configuración válida en producción el servicio falla cerrado con `STORAGE_CONFIG_MISSING`, mismo patrón que el transporte de email (`src/services/email/`, ADR 0014).
- Pipeline de procesamiento al subir (vía `sharp`, nueva dependencia): validación de formato de entrada (JPEG, PNG, WebP, AVIF; SVG explícitamente rechazado), límites de tamaño de archivo y dimensiones (10 MB, 8192×8192, mínimos por `kind`; con lectura de metadata antes de decodificar el pixel data completo, para prevenir decompression bombs), reencode a WebP, resize a un preset fijo según `kind` (ej. `avatar` → 256px).
- `storage_key` derivada íntegramente server-side (`{kind}/{uuid}.webp`): el nombre de archivo que envíe el cliente nunca participa de la clave, para cerrar colisión, enumeración y path traversal.
- Contrato de presets por `kind`, extensible: el sistema soporta agregar nuevos `kind`/tamaño sin rediseño del pipeline.
- Orden de operaciones definido para no dejar estados inconsistentes: en el alta, se sube el objeto y luego se registra la fila, borrando el objeto si el registro falla (compensación); en la baja, se borra el objeto y luego la fila, de modo que una falla parcial siempre deja un borrado reintentable en vez de un objeto huérfano.
- Mecanismo de cleanup: al reemplazar o desasociar una imagen, el código consumidor desasocia la referencia y llama a `deleteImage()`, que borra fila + objeto dentro del mismo flujo (no depende de un job de barrido para el caso normal).
- `next.config.mjs` alimenta `images.remotePatterns` con el hostname público del storage leído del entorno, para que el primer consumidor solo tenga que referenciar la imagen sin tocar configuración de Next.
- Errores de rechazo como clase propia del servicio con `code` estable (`StorageError`), no como entradas nuevas de `ErrorCodeSchema`: la traducción a `ApiError` y la documentación del código HTTP se hacen en el change que exponga la primera ruta.
- Documentación en el mismo cambio: ADR nuevo sobre imágenes propias y proveedor de storage, más `docs/03-data/sql-model.md` (tabla `image`) y el índice de ADRs en `docs/README.md`.
- **Fuera de alcance (explícitamente no incluido en este change)**: ningún endpoint de upload de usuario final, ninguna UI de subida, ninguna ruta HTTP nueva, ninguna columna `*_image_id` agregada a `app_user`/`artist`/`playlist`, ninguna modificación a `profile-identity` (que mantiene su requirement actual de avatar monograma-only), ninguna entrada nueva en `ErrorCodeSchema`/`docs/04-api/errors.md` y ningún job de barrido de huérfanas. Este change entrega solo la base reutilizable; conectar un primer consumidor (ej. avatar) es un change posterior.

## Capabilities

### New Capabilities
- `image-storage`: gestión del ciclo de vida de imágenes propias de la aplicación — tabla `image`, separación entre `StorageProvider` (proveedor intercambiable, con driver `local` para desarrollo y S3-compatible para producción) e `imageService` (validación de formato/tamaño/dimensiones, procesamiento y normalización a WebP, presets por `kind`, generación server-side de `storage_key`, resolución de URL y borrado coordinado con orden de operaciones definido ante fallas parciales).

### Modified Capabilities
(ninguna — este change no modifica el comportamiento de ninguna capability existente; `cover-art-resolution` y `profile-identity` quedan intactas)

## Impact

- **Nueva dependencia**: `sharp` (procesamiento de imágenes, módulo nativo) y SDK de storage S3-compatible (ej. `@aws-sdk/client-s3`).
- **Nuevas variables de entorno**: `STORAGE_DRIVER` y, para el driver S3-compatible, endpoint, bucket, credenciales y dominio público de lectura — a documentar en `.env.example`.
- **DB**: nueva tabla `image` vía migración SQL a mano (ADR 0005); no toca tablas existentes.
- **Código nuevo**: `src/services/storage/` (provider + servicio de imágenes) y su capa de validación/procesamiento; límites y presets centralizados en `src/lib/config/`; sin cambios en rutas de API existentes ni en componentes de UI.
- **Configuración**: `next.config.mjs` suma un `remotePattern` derivado del dominio público de storage; `.gitignore` excluye `public/uploads/` (driver `local`).
- **Documentación**: ADR nuevo, `docs/03-data/sql-model.md` y el índice de `docs/README.md`.
- **Sin impacto en runtime actual**: al no conectar ningún consumidor todavía, no hay cambio de comportamiento visible para el usuario final en este change.
