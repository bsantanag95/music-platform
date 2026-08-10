# Contrato de API — `/api/*`

Documenta el contrato real de los endpoints existentes (Fases 1-4) y las brechas que
`02-architecture/frontend-plan/00-backend-analysis.md` identificó como necesarias para la
Fase 3. Ver ADR 0006 sobre por qué este contrato es REST y no tRPC.

## `GET /api/catalog/search?q=<nombre>` — ✅ Existe

Busca (o ingiere bajo demanda) un artista por nombre y su discografía completa.

**Query params:** `q` (string, requerido).

**200 OK**
```json
{
  "artist": {
    "id": "uuid",
    "mbid": "uuid | null",
    "type": "person | group | various | unknown",
    "name": "string",
    "bio": "string | null",
      "photoUrl": "string | null",
      "createdAt": "ISO 8601",
      "discographySyncedAt": "ISO 8601 | null",
      "membershipsSyncedAt": "ISO 8601 | null"
  },
  "releaseGroups": [
    {
      "id": "uuid",
      "mbid": "uuid | null",
      "title": "string",
      "category": "studio | single_ep | compilation | live_other",
      "createdAt": "ISO 8601"
    }
  ]
}
```

**400** si falta `q`. **404** si MusicBrainz no devuelve ningún resultado para ese nombre.

**Nota de latencia:** si el artista no estaba cacheado, esta llamada dispara ingesta
completa (artista + discografía) contra MusicBrainz — puede tardar varios segundos según
la cantidad de álbumes. Ver riesgo 1 de `frontend-plan/04-risks.md`.

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
        { "artistId": "uuid", "name": "string", "role": "primary | featured", "joinPhrase": "string | null" }
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
  "recording": { "id": "uuid", "mbid": "uuid | null", "title": "string", "durationSec": "int | null", "variantType": "original | re_recording | remix | live" },
  "credits": [{ "artistId": "uuid", "name": "string", "role": "primary | featured", "joinPhrase": "string | null" }],
  "appearances": [{ "releaseId": "uuid", "releaseGroupId": "uuid", "albumTitle": "string", "editionLabel": "string", "releaseDate": "YYYY-MM-DD | null", "coverThumbUrl": "string | null", "discNumber": "int", "position": "int" }]
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
