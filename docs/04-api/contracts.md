# Contrato de API — `/api/*`

Documenta el contrato real de los endpoints existentes (Fases 1-4) y las brechas que
`02-architecture/frontend-plan/00-backend-analysis.md` identificó como necesarias para la
Fase 3. Ver ADR 0006 sobre por qué este contrato es REST y no tRPC.

## `GET /api/catalog/search?q=<texto>` — ✅ Existe

Busca **candidatos** (artistas y álbumes) que coinciden con el texto, combinando la base
local y la búsqueda en vivo de MusicBrainz (`/artist?query=` y `/release-group?query=`,
una request por tipo como máximo). **No ingiere** discografía, tracklist ni carátula: la
ingesta pesada ocurre al abrir un resultado (`/api/catalog/artist/[id]`,
`/api/catalog/release-group/[id]`). Cada candidato de MusicBrainz aún no visto se
persiste como stub (una operación por tipo) para que todo resultado tenga `id` local.

**Query params:** `q` (string, requerido; vacío o solo espacios tras normalizar → 400).

**200 OK**

```json
{
  "results": [
    {
      "kind": "artist | release-group",
      "id": "uuid",
      "mbid": "uuid | null",
      "name": "string",
      "subtitle": "string | null",
      "artistType": "person | group | various | unknown | null",
      "category": "studio | single_ep | compilation | live_other | null",
      "year": "int | null",
      "cached": "boolean"
    }
  ]
}
```

`subtitle`: disambiguation del artista o artista principal del álbum. `artistType` solo
en artistas; `category` y `year` solo en álbumes (el año si MusicBrainz lo trae, con
precisión anual basta). `cached`: la entidad local ya tiene contenido cacheado
(discografía sincronizada / tracklist ingerido). Sin coincidencias es **200 con
`{ "results": [] }`**, no 404.

Orden determinista: locales cacheados → resto de locales → solo-MusicBrainz (por score),
con coincidencia exacta de nombre/título al tope de su grupo; "Todo" intercala artistas
y álbumes preservando el orden relativo.

**400** `VALIDATION_ERROR` si falta `q` o llega vacío. **502** `INTERNAL_ERROR` si
MusicBrainz falla y no hay ninguna coincidencia local (con datos locales, degrada a 200
con las coincidencias locales).

## `GET /api/catalog/release-group/[id]` — ✅ Existe

Trae (o ingiere bajo demanda) el tracklist de la edición "oficial" de un álbum ya
conocido por su `id` propio (no `mbid`).

**200 OK**

```json
{
  "release": {
    "id": "uuid",
    "mbid": "uuid | null",
    "releaseGroupId": "uuid",
    "editionLabel": "string",
    "releaseDate": "YYYY-MM-DD | null",
    "coverThumbUrl": "string | null"
  },
  "cover": "string | null",
  "tracks": [
    {
      "recordingId": "uuid",
      "position": "int",
      "discNumber": "int",
      "title": "string",
      "durationSec": "int | null",
      "credits": [
        {
          "artistId": "uuid",
          "name": "string",
          "role": "primary | featured",
          "joinPhrase": "string | null"
        }
      ]
    }
  ]
}
```

**404** si el `id` no corresponde a ningún `release_group`, o si MusicBrainz no tiene
ninguna edición ingerible para ese álbum.

**Nota:** `cover` se resuelve contra Cover Art Archive a nivel de **release-group**
(`coverartarchive.org/release-group/{mbid}/front-250`, siempre baja resolución, ver
`03-data/data-licensing.md`) y se cachea en `release_group.cover_thumb_url` (migración `0003`);
`release.cover_thumb_url` quedó deprecada como fallback legado para filas pre-migración. Vale
`null` cuando el álbum no tiene carátula. Nunca construir esta URL a mano en el frontend.

**Créditos por canción:** cada elemento de `tracks` incluye `credits: [{ artistId, name, role, joinPhrase }]`, ordenado por posición. Se arma con un `JOIN` de `credit` + `artist` sobre los `recordingId` de todo el tracklist en una sola query (no una query por canción).

## `GET /api/catalog/release-group/[id]/cover` — ✅ Existe

Trae (o resuelve bajo demanda) únicamente la carátula miniatura de un álbum ya conocido por su
`id` propio. **No ingesta el tracklist** ni consulta MusicBrainz: la carátula se resuelve con un
`HEAD` a Cover Art Archive a nivel de release-group (`front-250`, ver `03-data/data-licensing.md`)
y se cachea en `release_group.cover_thumb_url`. Es lo que consume `LazyCoverImage` en la grilla
del perfil de artista, de modo que cargar las carátulas de un artista frío no se bloquea detrás de
la ingesta de cada tracklist (0 llamadas a MusicBrainz por álbum).

**200 OK**

```json
{
  "cover": "string | null"
}
```

**404** con `code: ALBUM_NOT_FOUND` si el `id` no corresponde a ningún `release_group`.

## `GET /api/catalog/artist/[id]` — ✅ Existe

Perfil de artista navegable directo por `id` propio. Si el artista es un stub
(`type='unknown'`), se enriquece contra MusicBrainz por id antes de responder — mismo
patrón que `findOrIngestArtist` aplica a stubs encontrados por nombre.

**200 OK:** `{ artist, releaseGroups, memberships }`. `artist` incluye `membershipsSyncedAt` además
de `discographySyncedAt`; `memberships` contiene `artistId`, `name`, `type`, `role`, `joinedOn` y `leftOn`.
La primera lectura sincroniza `artist-rels` antes de leer memberships; las lecturas posteriores con
`membershipsSyncedAt` ya establecido no consultan MusicBrainz. Para personas, `releaseGroups`
combina la discografía propia y la de grupos relacionados, sin duplicados por id.

**404** con `code: ARTIST_NOT_FOUND` si el `id` no corresponde a ningún artista.

## `GET /api/catalog/recording/[id]` — ✅ Existe

Recibe el UUID interno de una grabación y devuelve únicamente datos cacheados en la base propia.
La lectura no ingesta desde MusicBrainz ni resuelve carátulas externamente.

**400** con `code: VALIDATION_ERROR` si `id` no es un UUID. **404** con
`code: RECORDING_NOT_FOUND` si no existe la grabación.

**200 OK**

```json
{
  "recording": {
    "id": "uuid",
    "mbid": "uuid | null",
    "title": "string",
    "durationSec": "int | null",
    "variantType": "original | re_recording | remix | live"
  },
  "credits": [
    {
      "artistId": "uuid",
      "name": "string",
      "role": "primary | featured",
      "joinPhrase": "string | null"
    }
  ],
  "appearances": [
    {
      "releaseId": "uuid",
      "releaseGroupId": "uuid",
      "albumTitle": "string",
      "editionLabel": "string",
      "releaseDate": "YYYY-MM-DD | null",
      "coverThumbUrl": "string | null",
      "discNumber": "int",
      "position": "int"
    }
  ]
}
```

El endpoint comparte el read-model `getRecordingDetail` con las lecturas de servidor futuras.

## Autenticación local

`POST /api/auth/register` recibe `{ username, email, password }`, crea una cuenta y devuelve
`201 { user }`. `POST /api/auth/login` recibe `{ identifier, password }`, rota la sesión actual o
crea una nueva y devuelve `200 { user }`. Ambos aplican rate limiting y nunca devuelven el token.

`POST` y `DELETE /api/auth/logout` eliminan la sesión actual. `DELETE /api/auth/revoke-all` requiere sesión y
elimina todas las sesiones del usuario. `GET /api/auth/me` es un contrato opcional para clientes;
los Server Components resuelven la sesión directamente, sin fetch interno.

Una cookie ausente, inválida o expirada se trata de forma indistinguible y devuelve `AUTH_REQUIRED`
en operaciones protegidas; no se revela si la sesión existió. Logout solo revoca la sesión actual.
`revoke-all` revoca todas las sesiones del usuario; no existe listado de dispositivos.

La cookie opaca `music_session` es `httpOnly`, `secure`, `sameSite=lax`, con expiración fija de 30
días. Los errores posibles están en `docs/04-api/errors.md` y `src/lib/api/schemas.ts`.

## Autenticación externa — Google (OAuth 2.0 + OIDC)

`GET /api/auth/google/start` recibe el query param opcional `locale` (validado contra los locales
soportados, default `es`). Genera `state`, `code_verifier`/`code_challenge` (PKCE S256) y `nonce`,
los persiste en cookies `httpOnly`, `secure`, `sameSite=lax` de corta duración (~10 min)
incluyendo el `locale`, y redirige (307) a la authorization URL de Google con scopes fijos
`openid email profile`.

`GET /api/auth/google/callback` recibe los query params que devuelve Google (`code`, `state` y,
en caso de cancelación o error, `error`). Valida `state` contra la cookie, intercambia el
authorization code exclusivamente en el backend (`redirect_uri` siempre el configurado en
`.env`, nunca uno de la request), y valida el ID token con `jose` (issuer, audience, firma JWKS
RS256, expiración, `nonce`). Aplica rate limiting por IP al intercambio; al superarlo redirige a la
página de error con `RATE_LIMITED`.

Resuelve la identidad por `(provider='google', provider_account_id=sub)`:

- Si existe, autentica al `app_user` asociado.
- Si no existe y el email del ID token (con `email_verified=true`) coincide con una cuenta local
  sin esa identidad vinculada, no crea nada y termina en `EMAIL_TAKEN_BY_LOCAL`.
- Si no existe, `email_verified=false` o `email_verified` ausente, no crea nada y termina en
  `OAUTH_EMAIL_NOT_VERIFIED` (se exige email verificado para dar de alta cuentas nuevas).
- Si no existe, no hay coincidencia y `email_verified=true`, crea `app_user` + `auth_identity`
  en una transacción, sin `password_hash`. El username se deriva del local-part del email
  (`auth.md` sección 6): saneado a `^[a-zA-Z0-9_]+$`, 3–32 caracteres, sufijo numérico
  incremental en colisión, reintentando la derivación dentro de la misma operación ante colisiones
  por carrera.

En cualquier resultado exitoso (identidad existente o alta nueva), rota o crea la sesión
(`rotateCurrentSession`/`createSession`), setea la cookie `music_session` con los mismos
atributos que el login local, y redirige (307) a `/<locale>/search` de forma fija, usando el
`locale` persistido en las cookies del flujo — no existe un parámetro `returnTo` ni ninguna URL de
retorno controlada por el cliente.

Ante cualquier error (`state` inválido, cancelación, callback malformado, token inválido, email
no verificado, email ya tomado localmente o rate limit), el callback no devuelve JSON: redirige a
una página localizada de error (`/<locale>/auth/error?code=...`) con el `code` correspondiente como
query param, ya que el callback es una navegación del navegador y no un `fetch` del cliente. Ver
`docs/04-api/errors.md` para el catálogo completo de códigos `OAUTH_*` y su excepción de
transporte.

No hay ruta de vinculación (linking) de Google con una cuenta local ya autenticada en este
incremento — queda diferida a una fase posterior (`auth.md` sección 6, ADR 0010).

## Identidad social — perfiles, seguimiento y bloqueo

Endpoints de la base social de Fase 5 (cambio `add-social-profile-follow`). Los perfiles se
identifican por `username`; las mutaciones requieren sesión y derivan el actor de la cookie
server-side — ningún body acepta `user_id`.

### `GET /api/users?q=<término>&page=&pageSize=`

Busca usuarios por username o displayName (coincidencia parcial). Devuelve tanto perfiles públicos
como privados, sin email ni datos de autenticación. Si el visitante tiene sesión, cada resultado
incluye `relation` (`none` | `following` | `requested` | `incoming` | `blocked` | `self`).

**200 OK:** `{ users: [{ id, username, displayName, profileVisibility, relation }], page, pageSize, hasNext }`.

**400** con `VALIDATION_ERROR` si falta `q` o la paginación es inválida. **401** con
`AUTH_REQUIRED` en operaciones que exijan sesión.

### `GET /api/users/[username]`

Perfil por username. Un perfil público expone su identidad; un perfil privado muestra solo
identidad mínima para visitantes no autorizados. La respuesta incluye `relation` del visitante y
`accessible` (si el visitante puede ver contenido no mínimo).

**200 OK:** `{ user: { id, username, displayName, profileVisibility, relation, blockedByMe, accessible } }`.
**404** con `USER_NOT_FOUND` si el username no existe.

`blockedByMe` es `true` cuando el visitante autenticado es quien bloqueó al dueño del perfil (y por
lo tanto dispone de la acción de desbloquear); si el visitante fue bloqueado por el dueño,
`relation` es `blocked` pero `blockedByMe` es `false` y no se ofrece la acción.

### `GET /api/me/profile`

Perfil propio autenticado, incluye `email`.

**200 OK:** `{ user: { id, username, displayName, email, profileVisibility } }`. **401** con
`AUTH_REQUIRED` si no hay sesión.

### `PATCH /api/me/profile`

Actualiza la visibilidad del perfil propio.

**Body:** `{ profileVisibility: "public" | "private" }`. **200 OK:** `{ user }` con la
configuración persistida. **400** con `VALIDATION_ERROR` si el valor no es válido.

### `PUT /api/users/[username]/follow`

Sigue a un usuario. Si el perfil es público, la relación queda `accepted`; si es privado, se crea
una solicitud pendiente. Es idempotente: repetir no duplica la relación.

**200 OK:** `{ relation: "following" | "requested" }`. **404** con `USER_NOT_FOUND`. **403** con
`BLOCKED` si existe un bloqueo. **400** con `RELATION_INVALID` si se intenta seguir a sí mismo.

### `DELETE /api/users/[username]/follow`

Deja de seguir a un usuario, o cancela una solicitud pendiente enviada. Idempotente.

**200 OK:** `{ relation: "none" }`.

### `GET /api/me/followers` / `GET /api/me/following`

Lista paginada de seguidores aceptados y de cuentas seguidas por el usuario autenticado.

**200 OK:** `{ users: [{ id, username, displayName, profileVisibility }], page, pageSize, hasNext }`.

### `GET /api/me/follow-requests`

Lista paginada de solicitudes pendientes recibidas por el usuario autenticado. Misma forma de
respuesta que seguidores/seguidos.

### `POST /api/me/follow-requests/[userId]/approve`

Aprueba la solicitud pendiente recibida de `[userId]`. **204**. **404** con `REQUEST_NOT_FOUND` si
no existe o ya fue resuelta. **403** con `BLOCKED` si hay bloqueo.

### `POST /api/me/follow-requests/[userId]/reject`

Rechaza la solicitud pendiente recibida de `[userId]`. **204**. Mismos errores que approve.

### `DELETE /api/me/followers/[userId]`

Elimina a `[userId]` de los seguidores del usuario autenticado. **204**. Idempotente.

### `PUT /api/users/[username]/block`

Bloquea a un usuario. Crea el bloqueo y elimina en una transacción las relaciones y solicitudes
entre ambas cuentas. Idempotente. **200 OK:** `{ blocked: true }`. **400** con `RELATION_INVALID`
si se intenta bloquearse a sí mismo.

### `DELETE /api/users/[username]/block`

Retira el bloqueo del usuario autenticado hacia `[username]`. **200 OK:** `{ blocked: false }`. No
recrea relaciones eliminadas.

### `GET /api/me/blocks`

Lista paginada de cuentas bloqueadas por el usuario autenticado. Misma forma de respuesta que
seguidores/seguidos.

## Diario de escucha (Fase 5.3–5.4, cambios `add-listen-diary-reactions` y `add-diary-social-surfaces`)

Endpoints del diario de presencia manual. Las mutaciones (`POST`, `PATCH`, `DELETE`) requieren
sesión y el usuario se deriva de la cookie server-side — ningún body acepta `user_id`. Las lecturas
propias (`GET /api/me/diary`) requieren sesión; las lecturas ajenas y el feed tienen reglas de
visibilidad propias documentadas más abajo.

### `POST /api/me/diary`

Registra una escucha con un solo gesto. El servidor infiere el contexto (`first_listen` en la
primera escucha del usuario sobre el objetivo, `relisten` en adelante) y aplica la audiencia por
defecto `followers`. La entrada se crea sin impresión ni reacción; se completan luego con `PATCH`.

**Body:** `{ target: { type: "artist" | "release-group" | "recording", id } }`.
**201 OK:** `{ entry }` con `{ id, listenContext, body, reaction, audience, createdAt, target }`.
**400** con `VALIDATION_ERROR` si el body no es válido. **404** con `DIARY_TARGET_INVALID` si el
objetivo no existe. **401** con `AUTH_REQUIRED` sin sesión.

### `GET /api/me/diary?page=&pageSize=`

Lista paginada del diario propio en orden cronológico descendente. Cada entrada expone su objetivo
con `{ type, id, title, subtitle, coverThumbUrl }`.

**200 OK:** `{ entries: [ListenEntry], page, pageSize, hasNext }`. **400** con `VALIDATION_ERROR`
si la paginación es inválida.

### `PATCH /api/me/diary/{id}`

Completa o modifica una entrada propia. Cada campo es opcional pero debe enviarse al menos uno.
`reaction: null` limpia la reacción; `body` admite hasta 500 caracteres (cadena vacía o `null` la
limpia). `listenContext` y `audience` usan sus enums.

**Body:** `{ listenContext?, body?, reaction?, audience? }`.
**200 OK:** `{ entry }`. **400** con `VALIDATION_ERROR` si no hay campos o un valor no es válido.
**404** con `LISTEN_ENTRY_NOT_FOUND` si la entrada no existe o no pertenece al usuario (no se revela
la existencia de entradas ajenas).

### `DELETE /api/me/diary/{id}`

Borra físicamente una entrada propia. No afecta al rating del objetivo ni a otras entradas.
**204.** **404** con `LISTEN_ENTRY_NOT_FOUND` si la entrada no existe o no es del usuario.

### `GET /api/users/[username]/diary?page=&pageSize=`

Diario de un usuario visible para un lector. La sesión es opcional: si el visitante tiene sesión se
usa para calcular la visibilidad; si no, se trata como anónimo. La respuesta aplica la matriz de
visibilidad: bloqueo en cualquier dirección → lista vacía; perfil privado y no seguidor aprobado →
lista vacía; seguidor aprobado → entradas `public` y `followers`; resto → solo `public`. Una lista
vacía NO revela si el usuario tiene entradas.

**200 OK:** `{ entries: [ListenEntry], page, pageSize, hasNext }`. **404** con `USER_NOT_FOUND` si
el `username` no existe. **400** con `VALIDATION_ERROR` si la paginación es inválida.

### `GET /api/me/feed?page=&pageSize=`

Feed de actividad v1: escuchas del diario, favoritos y eventos de listas (creación o
actualización de metadatos) de los usuarios seguidos (relación `accepted`) que sean visibles para
el lector. Se calcula bajo demanda uniendo las tres fuentes, ordenado por `createdAt` descendente
con desempate por fuente e id. Requiere sesión.

**200 OK:** `{ entries: [FeedEntry], page, pageSize, hasNext }` donde `FeedEntry` es una unión
discriminada por `kind: "listen" | "favorite" | "list"`. **401** con `AUTH_REQUIRED` sin sesión.
**400** con `VALIDATION_ERROR` si la paginación es inválida.

### Forma de `entry`

```json
{
  "id": "uuid",
  "listenContext": "first_listen | relisten | rediscovery",
  "body": "string | null",
  "reaction": "liked | loved | obsessed | neutral | disliked | null",
  "audience": "private | followers | public",
  "createdAt": "ISO 8601",
  "target": {
    "type": "artist | release-group | recording",
    "id": "uuid",
    "title": "string",
    "subtitle": "string | null",
    "artistName": "string | null (opcional)",
    "coverThumbUrl": "string | null"
  }
}
```

`reaction: null` (ausencia de dato) es distinto de `reaction: "neutral"` (elección explícita); los
textos de cada reacción viven en i18n, no en la API.

`artistName` (campo aditivo de `redesign-feed`): el nombre del artista principal cuando el objetivo
es un álbum o una canción; `null` para objetivos de tipo artista. Presente también en el `target`
de las entradas de `kind: "rating"` y `"comment"`.

### Forma de `FeedEntry`

Unión discriminada por `kind`. Las tres variantes incluyen `author: { id, username, displayName }`:

- **`kind: "listen"`**: los campos de `entry` más `author`.
- **`kind: "favorite"`**: `{ kind, id, targetType, audience, createdAt, target: { id, title, artistName, coverThumbUrl }, author }`.
- **`kind: "list"`**: `{ kind, id, event: "created" | "updated", audience, createdAt, list: { id, title, entityType }, author }`.

```json
{
  "kind": "favorite",
  "id": "uuid",
  "targetType": "artist | release-group | recording",
  "audience": "private | followers | public",
  "createdAt": "ISO 8601",
  "target": { "id": "uuid", "title": "string", "coverThumbUrl": "string | null" },
  "author": { "id": "uuid", "username": "string", "displayName": "string | null" }
}
```

## Ratings y comentarios

Los endpoints sociales usan el objetivo `artist`, `release-group` o `recording` y el UUID interno.
Las lecturas son públicas; `PUT`, `POST`, `PATCH` y `DELETE` requieren sesión. El usuario siempre
se deriva de la sesión: ningún body acepta `user_id`.

### `GET/PUT/DELETE /api/catalog/{target}/{id}/ratings`

`GET` devuelve `{ own, aggregate }`; `own` es el rating de la sesión o `null` y `aggregate` contiene
`count`, `averageStars` y `averageDetailedScore`. `PUT` recibe `{ stars, detailedScore? }` y hace
upsert del rating del usuario; devuelve `200 { rating }`. `DELETE` borra físicamente el rating propio
y devuelve `204`.

### `GET/POST /api/catalog/{target}/{id}/comments`

`GET` acepta opcionalmente `page` (entero desde 1) y `pageSize` (entero 1-100), devolviendo
`{ comments, page, pageSize, hasNext }`. Valores no numéricos, `NaN`, no enteros o fuera de esos
rangos se rechazan con `400 { error, code: "VALIDATION_ERROR" }`; no se normalizan silenciosamente.
`POST` recibe `{ body }`, permite múltiples comentarios por usuario y devuelve `201 { comment }`.

### `PATCH/DELETE /api/catalog/comments/{commentId}`

`PATCH` recibe `{ body }` y solo permite editar el comentario propio. `DELETE` realiza borrado físico
solo del comentario propio y devuelve `204`; devuelve `404 { error, code: "COMMENT_NOT_FOUND" }` si
el comentario no existe y `403 { error, code: "PERMISSION_DENIED" }` si pertenece a otro usuario.

## Favoritos (Fase 5.5, cambio `add-favorites-and-lists`)

Señal de interés simple sobre artista, álbum o canción. Toggle idempotente: un usuario tiene a lo
sumo un favorito por objetivo. Tiene audiencia propia (`private`/`followers`/`public`), independiente
de escucha, rating y comentario. Las mutaciones requieren sesión y el usuario se deriva de la cookie
server-side.

### `POST /api/me/favorites`

Marca un favorito (toggle on). Idempotente: si el objetivo ya es favorito, devuelve el existente
sin duplicar.

**Body:** `{ target: { type: "artist" | "release-group" | "recording", id }, audience? }`.
**201 OK:** `{ favorite }` si se creó. **200 OK:** `{ favorite }` si ya existía. **404** con
`FAVORITE_TARGET_INVALID` si el objetivo no existe. **401** con `AUTH_REQUIRED` sin sesión.

### `DELETE /api/me/favorites`

Quita un favorito (toggle off). Idempotente: si no existe, responde `204` igual.

**Body:** `{ target: { type, id } }`. **204.** **401** con `AUTH_REQUIRED` sin sesión.

### `PATCH /api/me/favorites`

Cambia la audiencia de un favorito propio.

**Body:** `{ id, audience }`. **200 OK:** `{ favorite }`. **404** con `FAVORITE_NOT_FOUND` si el
favorito no existe o no es del usuario.

### `GET /api/me/favorites?page=&pageSize=`

Lista paginada de los favoritos propios en orden cronológico descendente.

**200 OK:** `{ favorites: [{ id, targetType, audience, createdAt, target: { id, title, coverThumbUrl } }], page, pageSize, hasNext }`.

### `GET /api/users/[username]/favorites?page=&pageSize=`

Favoritos de un usuario visibles para un lector. La sesión es opcional. Aplica la matriz de
visibilidad (bloqueos, perfil privado, relación de seguimiento); sin permiso devuelve lista vacía
sin revelar si el usuario tiene favoritos.

**200 OK:** `{ favorites: [...], page, pageSize, hasNext }`. **404** con `USER_NOT_FOUND` si el
username no existe.

## Listas (Fase 5.5, cambio `add-favorites-and-lists`)

Colecciones curadas de un solo tipo de entidad (`artist`/`release-group`/`recording`), propiedad de
un único usuario. Título obligatorio (≤100), descripción opcional (≤500), audiencia propia,
orden manual de ítems. Las mutaciones requieren sesión; las lecturas propias requieren sesión y las
ajenas aplican la matriz de visibilidad.

### `POST /api/me/lists`

Crea una lista vacía. `entityType` queda fijo y no es modificable después.

**Body:** `{ entityType, title, description?, audience? }`.
**201 OK:** `{ list }` con `{ id, entityType, title, description, audience, createdAt, updatedAt, items: [] }`.

### `GET /api/me/lists?page=&pageSize=`

Lista paginada de las listas propias. No incluye ítems ni conteo inline (el detalle los trae).

**200 OK:** `{ lists: [{ id, entityType, title, description, audience, createdAt, updatedAt }], page, pageSize, hasNext }`.

### `GET /api/me/lists/{listId}`

Detalle de una lista propia, con sus ítems ordenados por posición.

**200 OK:** `{ list }` con `items: [{ id, position, target: { id, title, coverThumbUrl } }]`.
**404** con `LIST_NOT_FOUND` si no existe o no es del usuario.

### `PATCH /api/me/lists/{listId}`

Modifica título, descripción o audiencia de una lista propia. Al menos un campo obligatorio;
`entityType` no es modificable.

**Body:** `{ title?, description?, audience? }`. **200 OK:** `{ list }`. **404** con `LIST_NOT_FOUND`.

### `DELETE /api/me/lists/{listId}`

Borra físicamente la lista y sus ítems (cascade). **204.** **404** con `LIST_NOT_FOUND`.

### `POST /api/me/lists/{listId}/items`

Agrega un ítem al final de la lista. Idempotente: un mismo objetivo no se duplica. El tipo del
ítem debe coincidir con `entityType` de la lista.

**Body:** `{ target: { type, id } }`. **201 OK:** `{ list }`. **400** con `VALIDATION_ERROR` si el
tipo no coincide. **404** con `LIST_NOT_FOUND` o `LIST_TARGET_INVALID`.

### `DELETE /api/me/lists/{listId}/items/{itemId}`

Quita un ítem de la lista. **200 OK:** `{ list }`. **404** con `LIST_NOT_FOUND` o
`LIST_ITEM_NOT_FOUND`.

### `PUT /api/me/lists/{listId}/items`

Reordena los ítems de la lista. El array `itemIds` define el nuevo orden completo.

**Body:** `{ itemIds: [uuid] }`. **200 OK:** `{ list }`. **404** con `LIST_NOT_FOUND`.

### `GET /api/users/[username]/lists?page=&pageSize=`

Listas de un usuario visibles para un lector. La sesión es opcional. Aplica la matriz de
visibilidad; sin permiso devuelve lista vacía.

**200 OK:** `{ lists: [...], page, pageSize, hasNext }`. **404** con `USER_NOT_FOUND`.

### `GET /api/users/[username]/lists/{listId}`

Detalle de una lista ajena visible. Si la lista no es visible para el visitante, se comporta como
inexistente.

**200 OK:** `{ list }`. **404** con `LIST_NOT_FOUND` o `USER_NOT_FOUND`.

## Colección física (Fase 5.5, cambio `add-physical-collection`)

Declaración de coleccionismo físico por álbum (`release-group`). Cada entrada tiene un `format`
(`vinyl`/`cd`/`cassette`/`other`), cero o más `attributes` de un vocabulario cerrado, una `note`
libre opcional (≤140) y audiencia propia. **No es un toggle idempotente:** `POST` siempre crea una
entrada nueva y se permiten varias entradas por álbum (mismo o distinto formato). Las mutaciones
requieren sesión; la lectura propia requiere sesión y la ajena aplica la matriz de visibilidad.

Vocabulario de `attributes`: `limited-edition`, `numbered`, `first-press`, `reissue`, `remaster`,
`anniversary-edition`, `deluxe-edition`, `colored-vinyl`, `picture-disc`, `180g`, `gatefold`,
`box-set`, `regional-edition`, `bonus-tracks`, `extra-disc`, `signed`, `promo`.

Forma de `entry`: `{ id, format, attributes: [...], note, audience, createdAt, updatedAt,
album: { id, title, coverThumbUrl, artistId, artistName } }`.

### `POST /api/me/collection`

Crea una entrada. **Body:** `{ releaseGroupId, format, attributes?, note?, audience? }`.
**201 OK:** `{ entry }`. **400** con `VALIDATION_ERROR` si el `format` o un `attribute` está fuera
del vocabulario, o la `note` supera 140. **404** con `ALBUM_NOT_FOUND` si el álbum no existe.

### `GET /api/me/collection?page=&pageSize=&format=&attribute=`

Colección propia paginada, orden cronológico descendente. `format` y `attribute` filtran de forma
opcional.

**200 OK:** `{ entries: [...], page, pageSize, hasNext }`. **400** con `VALIDATION_ERROR` si la
paginación o un filtro no son válidos.

### `PATCH /api/me/collection/{entryId}`

Modifica `format`, `attributes`, `note` o `audience` de una entrada propia. Al menos un campo
obligatorio. `note: null` limpia la nota.

**Body:** `{ format?, attributes?, note?, audience? }`. **200 OK:** `{ entry }`. **404** con
`COLLECTION_ENTRY_NOT_FOUND` si no existe o no es del usuario.

### `DELETE /api/me/collection/{entryId}`

Borra una entrada propia. **204.** **404** con `COLLECTION_ENTRY_NOT_FOUND`.

### `GET /api/users/[username]/collection?page=&pageSize=&format=&attribute=`

Colección de un usuario visible para un lector. Sesión opcional. Aplica la matriz de visibilidad
por entrada; sin permiso devuelve lista vacía sin revelar si el usuario tiene colección.

**200 OK:** `{ entries: [...], page, pageSize, hasNext }`. **404** con `USER_NOT_FOUND`.
