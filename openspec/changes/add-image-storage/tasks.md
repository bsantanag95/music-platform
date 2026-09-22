## 1. Dependencias y configuración

- [ ] 1.1 Agregar `sharp` como dependencia de producción y verificar que `next build` la resuelve como módulo nativo del servidor (evaluar `serverExternalPackages` si el bundler intenta empaquetarla).
- [ ] 1.2 Agregar `@aws-sdk/client-s3` (cliente S3-compatible para R2) como dependencia de producción.
- [ ] 1.3 Documentar en `.env.example` las variables del proveedor de storage (`STORAGE_DRIVER=local|s3`, endpoint, bucket, access key id, secret access key, dominio público de lectura), siguiendo el estilo de comentarios en español ya usado en el archivo y explicando el fail-closed en producción igual que la sección de email.
- [ ] 1.4 Agregar `public/uploads/` al `.gitignore` (destino del driver `local`).
- [ ] 1.5 Centralizar en `src/lib/config/` los límites (10 MB de archivo, 8192×8192 máximo, mínimos por `kind`) y la tabla de presets, como fuente única — sin constantes dispersas en las funciones de validación.
- [ ] 1.6 Agregar a `next.config.mjs` el `remotePattern` derivado del hostname del dominio público de storage leído del entorno, sin romper el build cuando la variable no está definida (driver `local`).
- [ ] 1.7 Crear la cuenta y el bucket de Cloudflare R2 (proveedor confirmado, Decisión 1) y cargar sus credenciales en el `.env` local — tarea operativa, necesaria solo para ejercitar el driver `s3`; no bloquea las tareas del driver `local`.

## 2. Modelo de datos

- [ ] 2.1 Escribir migración SQL cruda (`drizzle/0044_image_storage.sql` o el siguiente número disponible) que cree la tabla `image` (`id uuid primary key default gen_random_uuid()`, `storage_key text not null unique`, `kind text not null`, `mime_type text not null`, `width integer not null`, `height integer not null`, `byte_size integer not null`, `created_at timestamptz not null default now()`), siguiendo el patrón de migraciones a mano de ADR 0005 y encabezada con el comentario de contexto habitual (`-- Migración 0044: ... openspec: add-image-storage`) al estilo de `0043_add_camino.sql`.
- [ ] 2.2 Agregar el espejo de la tabla `image` en `src/db/schema.ts` (Drizzle `pgTable`), con un comentario breve indicando el change de origen y por qué se persiste `kind`, siguiendo el estilo de comentarios existentes en el archivo.
- [ ] 2.3 Verificar que la migración corre limpia contra una base local (`DATABASE_URL` de desarrollo) y que `schema.ts` compila sin `any`.

## 3. Proveedor de storage (capa de I/O)

- [ ] 3.1 Definir la interfaz `StorageProvider` en `src/services/storage/types.ts`: `put(key, body, contentType)`, `delete(key)` y `publicUrl(key)`. La interfaz no conoce la tabla `image` ni la base de datos.
- [ ] 3.2 Implementar el driver `local`: escribe bajo `public/uploads/`, crea el directorio si no existe y `publicUrl()` devuelve `/uploads/<key>`.
- [ ] 3.3 Implementar el driver S3-compatible sobre `@aws-sdk/client-s3`, configurado desde las variables de entorno de la sección 1.
- [ ] 3.4 Implementar el selector de driver (`getStorageProvider()`) siguiendo el patrón de `getEmailTransport()` en `src/services/email/index.ts`: `local` solo fuera de producción; en producción sin proveedor real configurado, lanzar el error de configuración ausente.

## 4. Servicio de imágenes (capa de dominio)

- [ ] 4.1 Implementar `resolveUrl(image | storageKey): string` delegando en `provider.publicUrl()`, único punto por el que los consumidores obtienen una URL.
- [ ] 4.2 Implementar la generación de `storage_key` server-side (`{kind}/{uuid}.webp`), ignorando por completo el nombre de archivo recibido del cliente.
- [ ] 4.3 Implementar el alta: `provider.put()` primero, `INSERT` del registro `image` después; si el `INSERT` falla, intentar `provider.delete()` del objeto recién subido (compensación) y propagar el error original.
- [ ] 4.4 Implementar `deleteImage(imageId)`: `provider.delete()` del objeto primero y `DELETE` del registro después; si falla el borrado del objeto, conservar el registro y propagar el error para que la operación sea reintentable.
- [ ] 4.5 Definir el tipo/contrato público del servicio (lo único que consumen las features) de forma que un cambio de proveedor no requiera tocar consumidores.

## 5. Validación de entrada

- [ ] 5.1 Implementar validación de formato de entrada (aceptar JPEG/PNG/WebP/AVIF; rechazar SVG y cualquier otro formato) antes de invocar `sharp` sobre el contenido completo.
- [ ] 5.2 Implementar validación de tamaño máximo de archivo (10 MB) antes de cualquier procesamiento, leyendo el límite de `src/lib/config/`.
- [ ] 5.3 Implementar lectura de metadata (`sharp(buffer).metadata()`) para validar dimensiones máximas (8192×8192) antes de decodificar el contenido completo de píxeles, y alinear `limitInputPixels` de `sharp` con ese tope.
- [ ] 5.4 Implementar validación de dimensiones mínimas por `kind` (`avatar`: 128×128), rechazando sin upscalear.
- [ ] 5.5 Definir `StorageError` (clase propia del servicio, con `readonly code` estable, al estilo de `EmailConfigError`) con un código por motivo de rechazo: formato no soportado, tamaño excedido, dimensiones excedidas, dimensiones insuficientes, `kind` desconocido y configuración de storage ausente. **No** agregar entradas a `ErrorCodeSchema` ni a `docs/04-api/errors.md`: eso corresponde al change que exponga la primera ruta HTTP.

## 6. Procesamiento y presets

- [ ] 6.1 Definir la tabla de presets por `kind` en `src/lib/config/` (estructura extensible: `kind → { width, height (opcional), minWidth, minHeight }`), con el preset `avatar` (salida 256px, mínimo de entrada 128×128) como primer caso y ejemplo documentado.
- [ ] 6.2 Implementar `process()`: reencode a WebP + resize al preset del `kind` solicitado, usando `sharp`, devolviendo buffer y dimensiones/tamaño finales.
- [ ] 6.3 Rechazar solicitudes con `kind` sin preset definido, sin invocar el pipeline de procesamiento ni tocar el storage.
- [ ] 6.4 Componer el flujo completo: validar formato → validar tamaño/dimensiones vía metadata → validar `kind` → `process()` → `put()` → `INSERT` → retorno del registro `image` creado.

## 7. Tests

- [ ] 7.1 Marcar los tests que ejerciten `sharp` con `// @vitest-environment node` (el `environment` global de `vitest.config.ts` es `jsdom`).
- [ ] 7.2 Tests unitarios de validación de formato (aceptar los 4 formatos soportados, rechazar SVG, rechazar formato arbitrario), verificando el `code` del `StorageError`.
- [ ] 7.3 Tests unitarios de límites (archivo que excede tamaño máximo, imagen que excede dimensiones máximas vía metadata, imagen bajo el mínimo del kind).
- [ ] 7.4 Test del alta con un `StorageProvider` mockeado: `put()` se invoca exactamente una vez, con el buffer WebP resultante y el `contentType` normalizado — nunca con el buffer original.
- [ ] 7.5 Test de compensación: si el `INSERT` falla, se invoca `provider.delete()` sobre la clave recién subida y se propaga el error.
- [ ] 7.6 Test de generación de `storage_key`: la clave deriva de `kind` + identificador del servidor y un nombre de archivo malicioso del cliente (`../../etc/passwd`) no altera la ubicación del objeto.
- [ ] 7.7 Test de `resolveUrl()` construyendo URL válida a partir de un `storage_key` conocido, en ambos drivers (`local` → ruta relativa; S3 → dominio público).
- [ ] 7.8 Test de `deleteImage()` verificando el orden: borra el objeto y luego el registro; si el borrado del objeto falla, el registro sobrevive y el error se propaga.
- [ ] 7.9 Test de selección de driver: `local` fuera de producción; en producción sin configuración real, error de configuración ausente sin escribir nada.
- [ ] 7.10 Test de rechazo por `kind` desconocido sin invocar `process()` ni el provider.

## 8. Documentación

- [ ] 8.1 Nuevo ADR `docs/02-architecture/adr/0017-<slug>.md` sobre imágenes propias de la aplicación: por qué la app posee el binario (vs. el hotlink de `cover-art-resolution`), proveedor S3-compatible y driver de desarrollo con fail-closed, normalización forzada sin conservar el original, y separación `StorageProvider`/servicio de imágenes. No reescribir ADRs existentes.
- [ ] 8.2 Actualizar `docs/03-data/sql-model.md` con la tabla `image` (una sección por tabla, como el resto del documento), explicando el significado de `kind` y por qué no hay asociación polimórfica.
- [ ] 8.3 Actualizar el índice de ADRs en `docs/README.md` con el ADR nuevo.
- [ ] 8.4 Dejar anotado en el ADR (o en `docs/02-architecture/architecture.md`) el contrato para consumidores futuros: FK `*_image_id → image(id)` con `ON DELETE SET NULL`, desasociar antes de borrar, y nunca construir URLs de storage a mano.

## 9. Verificación final

- [ ] 9.1 Confirmar que `typecheck`, `lint`, `test` y `build` pasan sin cambios en contratos REST existentes (este change no expone rutas HTTP nuevas).
- [ ] 9.2 Confirmar que `ErrorCodeSchema` y `docs/04-api/errors.md` quedaron sin cambios (los códigos del servicio no son contrato REST todavía).
- [ ] 9.3 Revisar que ningún componente/ruta existente quedó modificado fuera del alcance (`src/services/storage/`, `src/lib/config/`, migración nueva, `schema.ts`, `.env.example`, `.gitignore`, `next.config.mjs`, dependencias y los documentos de la sección 8).
