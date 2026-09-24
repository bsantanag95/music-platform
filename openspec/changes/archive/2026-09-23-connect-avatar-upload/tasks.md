## 1. Esquema

- [x] 1.1 Escribir migración `drizzle/0045_connect_avatar_upload.sql`: `ALTER TABLE app_user DROP CONSTRAINT chk_app_user_avatar_url, DROP COLUMN avatar_url, ADD COLUMN avatar_image_id UUID REFERENCES image(id) ON DELETE SET NULL`, encabezada con el comentario de contexto habitual (`-- Migración 0045: … openspec: connect-avatar-upload`) al estilo de las migraciones existentes.
- [x] 1.2 Actualizar `src/db/schema.ts`: quitar `avatarUrl` y su `CHECK`, agregar `avatarImageId` con el comentario del change de origen.
- [x] 1.3 Correr la migración contra una base local y confirmar que `schema.ts` compila sin `any`.

## 2. Resolución de la URL en el servidor

- [x] 2.1 Memoizar el proveedor de storage a nivel de módulo en `src/services/storage/index.ts` (o donde corresponda): hoy `resolveUrl()` llama a `getStorageProvider()`, que con el driver `s3` construye un `S3Client` nuevo en cada invocación — inaceptable al resolver una lista de avatares.
- [x] 2.2 Actualizar `src/services/profiles/identity.ts`: reemplazar la selección de `appUser.avatarUrl` por `appUser.avatarImageId`, resolviendo `avatarUrl` en `ExtendedIdentityData` vía `imageService.resolveUrl()` cuando no es null, manteniendo la forma `string | null` del campo.
- [x] 2.3 Extender `UserSummarySchema` con `avatarUrl: string | null` y actualizar las queries de `src/services/social/` que construyen esos DTO (`profiles.ts`, `following.ts`, `blocking.ts`) para seleccionar `avatar_image_id` y resolver la URL antes de devolverlos: búsqueda de personas, seguidores, seguidos, bloqueados y mutuals.
- [x] 2.4 Extender `IdentityCardPreviewSchema` con `avatarUrl: string | null` y su servicio/endpoint (`/api/users/{username}/identity-card-preview`).
- [x] 2.4b Feed: `AuthorSummarySchema` gana `avatarUrl` opcional; `listFeed` lo completa por lote sobre la página ya recortada (`attachAuthorAvatars`) y el chip `AuthorAvatar` de `FeedActivityList` renderiza la foto, con la inicial de siempre como fallback.
- [x] 2.5 Confirmar que ningún DTO expone `avatar_image_id` ni ruta del proveedor: el cliente solo recibe URLs ya resueltas.
- [x] 2.6 Confirmar que `getProfileView` **no** vacía `avatarUrl` cuando el visitante no tiene acceso: la foto es identidad pública, como la bio y los contadores (Decisión 10 del design), y dejarlo anotado en el comentario que ya explica qué se vacía y por qué.

## 3. Endpoint `/api/me/profile/avatar`

- [x] 3.1 Crear el route handler `PUT /api/me/profile/avatar`: verificar sesión, leer `multipart/form-data`, extraer el campo `file`, invocar `imageService.upload({ buffer, kind: "avatar" })` y responder `{ avatarUrl }`.
- [x] 3.2 Rechazar por tamaño **antes** de materializar el buffer: validar `Content-Length` y `file.size` contra `STORAGE_LIMITS.maxByteSize` antes de llamar a `arrayBuffer()`; sin esto el límite de 10 MB no protege la memoria del proceso.
- [x] 3.3 Aplicar límite de frecuencia por usuario reutilizando `src/services/auth/rate-limit.ts`, respondiendo `RATE_LIMITED` sin procesar el archivo (mismo patrón que la exportación de datos).
- [x] 3.4 Implementar el orden de reemplazo: capturar `avatar_image_id` anterior, `UPDATE app_user SET avatar_image_id = <nueva>`, y solo si el `UPDATE` confirma, `imageService.deleteImage(anteriorId)` cuando existía uno.
- [x] 3.5 Crear el route handler `DELETE /api/me/profile/avatar`: capturar `avatar_image_id` actual, `UPDATE app_user SET avatar_image_id = NULL`, `imageService.deleteImage(anteriorId)` si existía, y responder `{ avatarUrl: null }`; no-op exitoso si no había avatar.
- [x] 3.6 Envolver ambos handlers con `src/lib/with-error-handling.ts`; mapear cada `StorageErrorCode` a su código propio (`UNSUPPORTED_FORMAT` → `IMAGE_UNSUPPORTED_FORMAT` 400, `FILE_TOO_LARGE` → `IMAGE_TOO_LARGE` 413, `DIMENSIONS_EXCEEDED` → `IMAGE_DIMENSIONS_EXCEEDED` 400, `DIMENSIONS_INSUFFICIENT` → `IMAGE_DIMENSIONS_INSUFFICIENT` 400) y tratar aparte `StorageConfigError` — es una clase distinta de `StorageError`, no la atrapa un `instanceof`, y debe caer como `INTERNAL_ERROR` sin exponer el código interno.
- [x] 3.7 Validar que solo el usuario autenticado puede modificar su propio avatar (sin parámetro de usuario en la ruta; siempre opera sobre la sesión actual, igual que el resto de `/api/me/profile/*`).

## 4. Contrato de errores e i18n

- [x] 4.1 Agregar `IMAGE_UNSUPPORTED_FORMAT`, `IMAGE_TOO_LARGE`, `IMAGE_DIMENSIONS_EXCEEDED` e `IMAGE_DIMENSIONS_INSUFFICIENT` a `ErrorCodeSchema` (`src/lib/api/schemas.ts`).
- [x] 4.2 Agregar esos cuatro códigos a `messages/es/errors.json` y `messages/en/errors.json` con título y descripción accionables (qué formato/tamaño se acepta), siguiendo el estilo de las entradas existentes.
- [x] 4.3 Agregar las claves del editor de avatar (subir, reemplazar, quitar, estados de carga y confirmación) a `messages/es/*` y `messages/en/*` en el namespace que corresponda (`users`/`settings`).

## 5. Componente `UserAvatar`

- [x] 5.1 Crear `src/components/social/UserAvatar.tsx` (junto a `monogram.ts`): recibe `avatarUrl: string | null` + los props que hoy recibe el monograma, renderiza `next/image` con `width`/`height` explícitos y `alt=""` (decorativa: el nombre va siempre al lado, igual que hoy el monograma es `aria-hidden`), y el monograma cuando no hay foto.
- [x] 5.2 Reemplazar el uso directo del monograma por `UserAvatar` en `ProfileIdentity.tsx`, `UserHoverCard.tsx`, `UserCard.tsx` y `MutualFollowersRow.tsx`.
- [x] 5.3 Confirmar que `Logo.tsx` no se tocó (no es un avatar de usuario) y que `affinity.ts` sigue sin renderizar nada (es cálculo, no vista).

## 6. Editores de subida (perfil y Ajustes)

- [x] 6.1 Implementar el control de subir/reemplazar/quitar foto en el editor de identidad del modo edición del perfil (`profile-edit-mode`), con estados de carga, éxito y error recuperable, actualizando la vista con el `avatarUrl` que devuelve la API.
- [x] 6.2 Reusar el mismo editor en la pantalla Perfil de `owner-settings`, sin duplicar lógica.
- [x] 6.3 Mostrar los errores de validación localizados por `code` (formato, tamaño, dimensiones máximas y mínimas, límite de frecuencia), nunca el mensaje crudo de la API.

## 7. Eliminación de cuenta

- [x] 7.1 En `src/services/auth/account-lifecycle.ts`, capturar `avatar_image_id` antes del `db.delete(appUser)` y llamar a `imageService.deleteImage()` después de que la cuenta se borró; un fallo del borrado del archivo no debe bloquear ni revertir la eliminación de la cuenta.
- [x] 7.2 Confirmar que la desactivación **no** toca la foto (la cuenta puede reactivarse) y que la reactivación la recupera intacta.
- [x] 7.3 Incluir la URL del avatar en la sección de perfil de la exportación de datos (`src/services/profiles/data-export.ts`), que ya exporta bio y enlaces.

## 8. Documentación

- [x] 8.1 Agregar `PUT`/`DELETE /api/me/profile/avatar` a `docs/04-api/contracts.md` con su respuesta `{ avatarUrl }`, siguiendo el formato de `PUT`/`DELETE /api/me/profile/anthem`, y documentar el campo `avatarUrl` nuevo en los DTO de usuario (búsqueda, conexiones, preview de la Tarjeta de Identidad).
- [x] 8.2 Agregar los cuatro códigos nuevos a la tabla de `docs/04-api/errors.md` con su status HTTP y dónde ocurren.
- [x] 8.3 Actualizar `docs/03-data/sql-model.md`: reemplazar la mención de `avatar_url` en la tabla `app_user` por `avatar_image_id` y su referencia a `image` con `ON DELETE SET NULL`.
- [x] 8.4 Actualizar `docs/05-features/user-profile.md`: la línea que documenta `avatar_url` como "reservado, sin lectura en UI" pasa a describir el flujo real de subida, incluido que la foto es identidad pública (visible en perfiles privados).
- [x] 8.5 Actualizar `docs/02-architecture/data-classification.md`: la foto de perfil es el primer dato personal binario fuera de Postgres; clasificarla y anotar su prioridad de recuperación.
- [x] 8.6 Actualizar `docs/06-operations/backup-restore.md`: el respaldo cubre Postgres, no los objetos del bucket — dejar explícito que restaurar la base sin el storage deja avatares rotos.

## 9. Tests

- [x] 9.1 Tests del endpoint: subida exitosa sin avatar previo, reemplazo con limpieza del anterior, fallo de subida conserva el avatar anterior, `DELETE` con y sin avatar existente, respuesta `{ avatarUrl }` en ambos casos.
- [x] 9.2 Test de rechazo por tamaño antes de bufferear (solicitud con `Content-Length` excesivo) y de límite de frecuencia (`RATE_LIMITED` sin procesar el archivo).
- [x] 9.3 Tests de mapeo de errores: cada `StorageErrorCode` produce su `ApiError.code` y status esperados; `StorageConfigError` cae como `INTERNAL_ERROR` sin filtrar el código interno.
- [x] 9.4 Test de `UserAvatar`: renderiza imagen cuando hay `avatarUrl`, monograma cuando es null.
- [x] 9.5 Tests de resolución: `identity.ts` y las queries sociales devuelven `avatarUrl` resuelto a partir de `avatarImageId`, y `null` cuando no hay avatar.
- [x] 9.6 Test de que un perfil privado sin acceso sigue entregando `avatarUrl` (identidad pública) mientras vacía identidad musical y datos personales.
- [x] 9.7 Test de eliminación de cuenta: se invoca el borrado de la imagen del avatar; un fallo de ese borrado no impide que la cuenta se elimine.
- [x] 9.8 Caso conocido sin cubrir (documentado en Risks, no se testea): fallo de `deleteImage()` del avatar anterior tras un swap ya confirmado.

## 10. Verificación final

- [x] 10.1 Confirmar que `typecheck`, `lint`, `test` y `build` pasan.
- [x] 10.2 Confirmar que las claves nuevas existen en **ambos** idiomas (`es` y `en`) y que ninguna superficie muestra la clave cruda.
- [x] 10.3 Probar manualmente en el navegador: subir avatar, verificar que reemplaza el monograma en perfil, búsqueda, listado de conexiones y hover card, reemplazar avatar, quitarlo y confirmar vuelta al monograma.
