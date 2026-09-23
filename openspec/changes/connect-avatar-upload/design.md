## Context

`add-image-storage` (archivado) entregó `imageService` (`upload`, `deleteImage`, `resolveUrl`) y la tabla `image`, con el preset `avatar` (256px, mínimo 128×128) ya definido en `src/lib/config/storage.ts`, pero sin ningún consumidor conectado. La identidad visual hoy es monograma-only por decisión explícita en dos specs (`profile-identity`, `owner-settings`), y `app_user.avatar_url` es una columna muerta que nunca tuvo storage backend ni lector en la UI.

El monograma se renderiza hoy en al menos cinco puntos: `ProfileIdentity.tsx`, `UserHoverCard.tsx`, `UserCard.tsx`, `MutualFollowersRow.tsx` y `affinity.ts` (cálculo, no render). Cualquier decisión de "foto si existe, si no monograma" tiene que aplicarse igual en todos esos puntos. Esos componentes no comparten fuente de datos: `ProfileIdentity` recibe `ProfileView` (tipo de servidor), `UserCard` y `MutualFollowersRow` reciben `UserSummary` (DTO validado con Zod) y `UserHoverCard` consume el DTO de `/api/users/{username}/identity-card-preview`. Ninguno de esos dos DTO tiene hoy un campo de avatar, así que "mostrar la foto en todas las superficies" es también un cambio de contrato REST.

Una revisión de la propuesta cerró las decisiones 6 a 14 (códigos de error propios, propagación del avatar a los DTO, límite de tamaño antes de bufferear, límite de frecuencia, visibilidad en perfiles privados, borrado al eliminar la cuenta, forma de la respuesta, memoización del proveedor y manejo explícito de `STORAGE_CONFIG_MISSING`).

## Goals / Non-Goals

**Goals:**
- Conectar `avatar_image_id` a `app_user`, reemplazando la columna muerta `avatar_url`.
- Exponer `PUT`/`DELETE /api/me/profile/avatar` sobre `imageService` con `kind: "avatar"`.
- Un único componente de renderizado que decide foto vs. monograma, consumido por todos los puntos que hoy renderizan el monograma.
- Propagar el avatar por las tres fuentes de datos que alimentan esos puntos (`ProfileView`, `UserSummary`, preview de la hover card), para que la identidad visual sea la misma en perfil, búsqueda, conexiones y hover.
- Traducir `StorageErrorCode` a códigos propios del contrato de errores, distinguibles y localizables.
- Que eliminar la cuenta borre también la foto y su objeto en storage.

**Non-Goals:**
- No se agrega recorte (cropping) ni edición de imagen en el cliente; el usuario sube el archivo tal cual y el servidor decide el resultado final (`processImage` ya hace `resize` con `fit: "cover"`, que centra y recorta).
- No se agrega moderación de contenido del avatar (fuera de alcance también en `add-image-storage`).
- No se agrega un segundo `kind` (ej. banner) en este change.
- No se toca `artist.photo_url` ni ningún otro consumidor potencial de `image-storage`.
- No se implementa el job de barrido de imágenes huérfanas (deuda heredada de `add-image-storage`).
- No cambia el comportamiento de la desactivación de cuenta: una cuenta desactivada conserva su foto, porque puede reactivarse (ver Decisión 11).

## Decisions

**1. `PUT`/`DELETE /api/me/profile/avatar`, mismo patrón que `/api/me/profile/anthem` y `/api/me/profile/links`.**
`PUT` recibe `multipart/form-data` con un campo `file` (Next 15 soporta `request.formData()` nativamente en route handlers; no hace falta un parser adicional). `DELETE` no recibe body. Se descarta anidar esto dentro de `PATCH /api/me/profile` porque ese endpoint es JSON puro y mezclar multipart ahí rompe el contrato existente.

**2. Orden de operaciones en `PUT` (reemplazo): subir primero, luego swap de FK, luego borrar la vieja.**
Siguiendo la guía de consumidores del ADR 0017:
1. `imageService.upload({ buffer, kind: "avatar" })` — si falla, el usuario conserva su avatar anterior intacto.
2. `UPDATE app_user SET avatar_image_id = <nueva> WHERE id = <usuario>`, capturando el `avatar_image_id` anterior en la misma transacción.
3. Si había una imagen anterior, `imageService.deleteImage(anteriorId)` — se ejecuta después de que el swap ya confirmó, así que un fallo acá dejaría una imagen huérfana (aceptado como riesgo menor, ver Risks) en vez de un usuario con `avatar_image_id` roto.

**3. Orden de operaciones en `DELETE`: desasociar primero, borrar después — igual que el patrón general.**
`UPDATE app_user SET avatar_image_id = NULL`, capturando el id anterior, y solo después `imageService.deleteImage(anteriorId)`. Si no había avatar, `DELETE` es un no-op idempotente (200 OK sin cambios).

**4. `ExtendedIdentityData.avatarUrl` conserva su forma (`string | null`), pero ahora se resuelve en vez de leerse de columna.**
`identity.ts` deja de seleccionar `appUser.avatarUrl` y en su lugar selecciona `appUser.avatarImageId`, resolviendo la URL con `imageService.resolveUrl()` cuando no es null. Esto minimiza el blast radius: ningún componente que ya consume `avatarUrl` como string necesita cambiar su forma de dato, solo dejar de asumir que siempre es `null`.

**5. Un componente `UserAvatar` centraliza la decisión foto-vs-monograma.**
En vez de repetir `avatarUrl ? <Image .../> : <Monogram .../>` en cada uno de los 4 puntos de render identificados (`ProfileIdentity`, `UserHoverCard`, `UserCard`, `MutualFollowersRow`), se extrae un componente único que encapsula esa rama. Reduce la superficie de un futuro cambio (ej. agregar un borde o un estado de carga) a un solo archivo. La imagen se marca decorativa (`alt=""`): el nombre y el `@username` van siempre al lado, así que un texto alternativo solo duplicaría lo que el lector de pantalla ya anuncia — igual que hoy el monograma es `aria-hidden`.

**6. Códigos de error propios en el contrato, no `VALIDATION_ERROR` genérico.**
El shape de error de la API es `{ error, code }` y nada más (`src/lib/with-error-handling.ts`); el frontend localiza **por `code`** (`messages/{es,en}/errors.json` está keyeado por código) y `docs/04-api/errors.md` prohíbe explícitamente mostrar el string `error` o hacer string-matching sobre él. Un `VALIDATION_ERROR` con "detalle" no es distinguible para el cliente: "el archivo pesa 30 MB" y "SVG no soportado" mostrarían el mismo texto. Por eso cada rechazo del pipeline recibe su propio código de contrato:

| `StorageErrorCode` | `ApiError.code` | Status |
|---|---|---|
| `UNSUPPORTED_FORMAT` | `IMAGE_UNSUPPORTED_FORMAT` | 400 |
| `FILE_TOO_LARGE` | `IMAGE_TOO_LARGE` | 413 |
| `DIMENSIONS_EXCEEDED` | `IMAGE_DIMENSIONS_EXCEEDED` | 400 |
| `DIMENSIONS_INSUFFICIENT` | `IMAGE_DIMENSIONS_INSUFFICIENT` | 400 |
| `UNKNOWN_KIND` | — (imposible: el `kind` lo fija el servidor) | — |
| `STORAGE_CONFIG_MISSING` | `INTERNAL_ERROR` | 500 |

Esta es la parte de `add-image-storage` que quedó deliberadamente pendiente ("el change que exponga la primera ruta traduce esos códigos"): acá se cumple.

**7. El avatar viaja en `UserSummary` y en el preview de la hover card.**
`UserSummarySchema` gana `avatarUrl: string | null` y lo mismo `IdentityCardPreviewSchema`; las queries de `src/services/social/` (`profiles.ts`, `following.ts`, `blocking.ts`) seleccionan `avatar_image_id` y resuelven la URL antes de devolver el DTO. Sin esto, la foto solo aparecería en el perfil y el mismo usuario se vería distinto según la superficie, que es justo lo que el requirement "el monograma es idéntico en las tres superficies" vino a evitar. Se resuelve la URL en el servidor (no se expone `avatar_image_id` al cliente) para que el frontend nunca conozca el proveedor, igual que en el perfil.

**8. El tamaño se valida antes de materializar el buffer.**
`imageService.upload()` valida `buffer.length`, pero para entonces el archivo ya está entero en memoria. El route handler rechaza primero por `Content-Length` y por `file.size` del `File` de `formData()`, antes de llamar a `arrayBuffer()`. Sin eso, el límite de 10 MB no protege la memoria del servidor: un `PUT` de 200 MB se bufferearía completo antes de la primera validación.

**9. Límite de frecuencia por usuario.**
Es el endpoint más caro de la aplicación: cada `PUT` decodifica hasta 8192×8192 con `sharp` (~268 MB de bitmap en el peor caso) y escribe en R2. Se reutiliza `src/services/auth/rate-limit.ts` con un tope por usuario que responde `RATE_LIMITED`, igual que la exportación de datos. El límite es por proceso y en memoria, como el resto de los límites del proyecto — no es una defensa distribuida, es un freno al abuso trivial.

**10. El avatar es identidad pública: se muestra también en un perfil privado sin acceso.**
`getProfileView` es el único punto que decide qué se vacía sin acceso, y hoy vacía la identidad musical y los datos personales, dejando bio, enlaces y contadores como identidad pública. La foto entra en ese segundo grupo: quien busca a una persona para seguirla necesita reconocerla, y `PrivateProfileCard` ya muestra nombre y bio. Queda escrito como escenario para que sea una decisión y no una herencia del render.

**11. Eliminar la cuenta borra la foto; desactivarla no.**
`deleteAccount` hace `db.delete(appUser)`; con `ON DELETE SET NULL` la fila `image` y el objeto en storage sobrevivirían sin que nada los referencie — una foto de cara persistiendo en una URL pública después de que la persona borró su cuenta. El flujo de eliminación captura `avatar_image_id` **antes** del `DELETE` y llama a `imageService.deleteImage()` después de que la cuenta se borró (si falla, queda una huérfana, no una cuenta a medio borrar). La desactivación no toca la foto: la cuenta puede reactivarse y su identidad visual debe volver intacta.

**12. `PUT` y `DELETE` devuelven el estado resultante: `{ avatarUrl: string | null }`.**
Mismo patrón que `/api/me/profile/anthem`, que devuelve `{ showcase }`. El editor necesita la URL nueva para actualizar sin recargar (requirement de `profile-identity`), y `DELETE` devuelve `null` para que el mismo código vuelva al monograma sin un refetch extra.

**13. El proveedor de storage se memoiza a nivel de módulo.**
`resolveUrl()` llama a `getStorageProvider()`, que con el driver `s3` ejecuta `createS3Driver()` y construye un `S3Client` nuevo — para concatenar un string. En el perfil es una vez por request; con la Decisión 7, son tantas como usuarios tenga un listado. Se memoiza el provider por proceso (invalidado solo por reinicio, igual que la configuración de la que depende).

**14. `STORAGE_CONFIG_MISSING` se maneja explícitamente.**
Lo lanza `StorageConfigError`, una clase distinta de `StorageError` (vive en `src/services/storage/index.ts`), así que un `instanceof StorageError` no lo atrapa. El handler lo trata aparte y lo deja caer como `INTERNAL_ERROR`: es un problema de configuración del servidor, no de la solicitud del usuario, y no se expone el código interno al cliente.

## Risks / Trade-offs

- **[Riesgo] Fallo de `deleteImage()` tras un swap de FK exitoso** (paso 3 de la decisión 2) deja una fila `image` huérfana sin referencia. → **Mitigación**: aceptado en v1 igual que en `add-image-storage` (sin job de barrido todavía); el impacto es solo storage desperdiciado, no un estado inconsistente visible para el usuario. Si el volumen de reemplazos lo justifica, un job de barrido (ya anotado como deuda en ADR 0017) lo resuelve sin cambios de contrato.
- **[Riesgo] Condición de carrera entre dos `PUT` concurrentes del mismo usuario** (doble clic, dos pestañas) puede dejar huérfana la imagen que "ganó" la carrera de subida pero perdió el `UPDATE`. → **Mitigación**: aceptado como riesgo de baja probabilidad (una sola persona operando su propio perfil); no se agrega locking en v1.
- **[Riesgo] `fit: "cover"` recorta sin que el usuario vea el resultado antes de confirmar.** Una foto con el sujeto en una esquina puede recortarse mal. → **Mitigación**: fuera de alcance agregar preview/crop en este change; se acepta la limitación y se dejará como mejora futura si aparece feedback real.
- **[Trade-off] `UserSummary` se toca en muchas superficies** (búsqueda social, seguidores, seguidos, bloqueados, mutuals). → Es el precio de que la identidad visual sea consistente; el campo es opcional en el sentido de que `null` mantiene el comportamiento actual, así que ninguna superficie se rompe si una query queda sin migrar — solo se ve el monograma, que es el estado de hoy.
- **[Trade-off] Foto visible en perfiles privados sin acceso** (Decisión 10). → Una persona con perfil privado publica su cara a cualquier visitante. Se acepta porque el perfil privado ya expone nombre, `@username` y bio, y ocultarla haría imposible reconocer a alguien antes de pedirle seguimiento. Si aparece feedback real, invertirlo es una línea en `getProfileView`.
- **[Riesgo] La foto sobrevive a la eliminación de la cuenta si `deleteImage()` falla** después del `DELETE` de la cuenta. → Aceptado: el borrado de la cuenta no puede quedar bloqueado por el storage. Queda como huérfana para el barrido futuro.

## Migration Plan

1. Migración `drizzle/0045_connect_avatar_upload.sql`: `ALTER TABLE app_user DROP COLUMN avatar_url` (y su `CHECK chk_app_user_avatar_url`), `ADD COLUMN avatar_image_id UUID REFERENCES image(id) ON DELETE SET NULL`.
2. Actualizar `schema.ts`: quitar `avatarUrl`, agregar `avatarImageId`.
3. Actualizar `src/services/profiles/identity.ts` y las queries de `src/services/social/` para resolver la URL vía `imageService.resolveUrl()`, con el proveedor memoizado.
4. Agregar los códigos nuevos a `ErrorCodeSchema` y a `messages/{es,en}/errors.json`.
5. Implementar el endpoint (con límite de tamaño previo y límite de frecuencia) y el componente `UserAvatar`, conectarlo en los 4 puntos de render identificados.
6. Agregar el borrado del avatar al flujo de eliminación de cuenta.
7. Actualizar `docs/04-api/contracts.md`, `docs/04-api/errors.md`, `docs/03-data/sql-model.md` (tabla `app_user`), `docs/05-features/user-profile.md`, `docs/02-architecture/data-classification.md` (primer dato personal binario fuera de Postgres) y `docs/06-operations/backup-restore.md` (el respaldo de Postgres no cubre los objetos de storage).

**Rollback**: revertir el swap de columna (`ADD avatar_url` de vuelta, `DROP avatar_image_id`) es seguro porque no hay datos reales en ninguna de las dos en producción todavía al momento de este change; si ya hay avatares subidos, un rollback perdería la asociación (no el archivo en storage, que sobrevive) — aceptable porque revertir este change implica también revertir la UI que lo expone.

## Open Questions

- Ninguna. El preset `avatar` y los límites ya están fijados desde `add-image-storage`; las decisiones abiertas de la revisión (alcance de propagación, privacidad en perfiles privados y límite de frecuencia) quedaron cerradas en las Decisiones 7, 10 y 9.
