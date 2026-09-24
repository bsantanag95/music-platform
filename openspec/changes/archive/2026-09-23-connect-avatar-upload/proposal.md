## Why

`add-image-storage` entregó la base genérica de imágenes propias (tabla `image`, storage service, preset `avatar` ya definido en `src/lib/config/storage.ts`) sin conectar ningún consumidor. Hoy la identidad visual del usuario sigue siendo monograma-only por decisión explícita (`profile-identity` y `owner-settings` tienen requirements `SHALL NOT` que bloquean cualquier superficie de subida). Este change conecta el primer consumidor real: permite que el dueño suba, reemplace y quite su foto de perfil, usando la infraestructura ya construida.

## What Changes

- **BREAKING** (schema, sin dato real que migrar): se elimina `app_user.avatar_url` (columna muerta, nunca leída por la UI) y se agrega `app_user.avatar_image_id UUID REFERENCES image(id) ON DELETE SET NULL`, según la guía para consumidores futuros documentada en ADR 0017.
- Nuevo endpoint `PUT` / `DELETE /api/me/profile/avatar`: `PUT` sube y procesa un archivo (`kind: "avatar"`) vía `imageService`, desasocia y borra la imagen anterior si existía, y asocia la nueva; `DELETE` desasocia y borra la imagen actual, volviendo al monograma. Ambos devuelven `{ avatarUrl: string | null }`, el estado resultante, igual que `PUT /api/me/profile/anthem` devuelve `{ showcase }`.
- El endpoint rechaza por `Content-Length` y por `file.size` **antes** de materializar el buffer en memoria (el límite de 10 MB del pipeline se valida recién con el archivo ya cargado), y limita la frecuencia de subida por usuario con `RATE_LIMITED`, reutilizando `src/services/auth/rate-limit.ts`: es el endpoint más caro de la app (decode de hasta 8192×8192 con `sharp` por request).
- **Contrato de errores**: cada motivo de rechazo del servicio de imágenes recibe su propio código (`IMAGE_UNSUPPORTED_FORMAT`, `IMAGE_TOO_LARGE`, `IMAGE_DIMENSIONS_EXCEEDED`, `IMAGE_DIMENSIONS_INSUFFICIENT`) en `ErrorCodeSchema`, con su entrada en `messages/{es,en}/errors.json` y en `docs/04-api/errors.md`. El frontend localiza por `code`, así que un `VALIDATION_ERROR` genérico haría indistinguible "el archivo pesa 30 MB" de "SVG no soportado". `STORAGE_CONFIG_MISSING` no se expone: cae como `INTERNAL_ERROR`.
- **El avatar se propaga a todas las superficies que hoy dibujan el monograma**: `UserSummarySchema` e `IdentityCardPreviewSchema` ganan `avatarUrl: string | null`, y las queries de `src/services/social/` y del preview de la hover card resuelven la URL en el servidor. Sin esto, la foto solo aparecería en el perfil y el mismo usuario se vería distinto según la superficie.
- `profile-identity` deja de prohibir la superficie de avatar: el sistema muestra la foto subida cuando existe, y el monograma determinista como fallback cuando no hay foto (nunca ambos, nunca hueco). La foto es identidad pública: un perfil privado sin acceso la muestra, igual que ya muestra nombre y bio.
- `owner-settings` deja de prohibir elegir foto en la pantalla Perfil: agrega el control de subir/reemplazar/quitar junto a los demás editores de identidad, reusando el mismo editor que en el perfil (mismo patrón que el resto de `profile-identity` → `Edición de identidad desde el perfil`).
- **`account-lifecycle`**: eliminar la cuenta borra también la foto y su objeto en storage. Con `ON DELETE SET NULL`, el `DELETE` de `app_user` dejaría la fila `image` y el archivo vivos para siempre, sin referencia — una foto de cara sobreviviendo a la cuenta que la subió. Desactivar la cuenta no la toca: puede reactivarse.

## Capabilities

### New Capabilities
- `avatar-upload`: ciclo de vida técnico del avatar de usuario — endpoint de subida/reemplazo/borrado con sus límites de tamaño y frecuencia, validación y procesamiento vía `image-storage` con `kind: "avatar"`, asociación/desasociación de `avatar_image_id`, traducción de los motivos de rechazo al contrato de errores de la API, y limpieza de la imagen reemplazada, quitada o huérfana por eliminación de cuenta (desasociar antes de `deleteImage()`, siguiendo la guía de ADR 0017).

### Modified Capabilities
- `profile-identity`: el requirement «Imagen de identidad por monograma» pasa a admitir una foto subida como identidad visual, con el monograma como fallback determinista cuando no hay foto, en todas las superficies; el requirement «Edición de identidad desde el perfil» incorpora el avatar como campo editable inline.
- `owner-settings`: el requirement «Pantalla Perfil» deja de excluir explícitamente el control de foto de perfil y lo incorpora junto a los demás editores de identidad.
- `account-lifecycle`: el requirement «Eliminar la cuenta» incorpora la foto de perfil y su objeto en storage a lo que se borra.

## Impact

- **DB**: migración nueva que hace `DROP COLUMN avatar_url` + `ADD COLUMN avatar_image_id` en `app_user`, más el `CHECK` de longitud de `avatar_url` que queda obsoleto y se elimina en el mismo archivo.
- **API**: nueva ruta `/api/me/profile/avatar` (`PUT`/`DELETE`); `UserSummary` y el preview de la Tarjeta de Identidad suman `avatarUrl`, lo que toca la búsqueda social, seguidores, seguidos, bloqueados y mutuals; `docs/04-api/contracts.md` y `docs/04-api/errors.md` se actualizan con la ruta y los códigos nuevos.
- **Código**: `src/services/profiles/identity.ts` cambia `avatarUrl: string | null` por la resolución de URL vía `imageService.resolveUrl()` a partir de `avatar_image_id`; las queries de `src/services/social/` hacen lo mismo; el proveedor de storage se memoiza por proceso para no construir un `S3Client` por avatar resuelto; un componente `UserAvatar` centraliza la decisión foto-vs-monograma en los cuatro puntos de render.
- **i18n**: claves nuevas en `messages/es/*` y `messages/en/*` para el editor y para los códigos de error nuevos.
- **Documentación**: además de contratos y errores, `docs/03-data/sql-model.md`, `docs/05-features/user-profile.md`, `docs/02-architecture/data-classification.md` (primer dato personal binario fuera de Postgres) y `docs/06-operations/backup-restore.md` (el respaldo de Postgres no cubre los objetos de storage).
- **Sin impacto en `cover-art-resolution`**: no se toca el patrón de hotlink de carátulas externas.
- **Sin nuevas dependencias**: reutiliza `sharp` y el storage service de `add-image-storage` tal cual quedaron.
