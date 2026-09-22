# Contrato de API — `/api/*`

Documenta el contrato real de los endpoints existentes (Fases 1-4) y las brechas que
`02-architecture/frontend-plan/00-backend-analysis.md` identificó como necesarias para la
Fase 3. Ver ADR 0006 sobre por qué este contrato es REST y no tRPC.

## `GET /api/catalog/search?q=<texto>` — ✅ Existe

Busca **candidatos** (artistas y álbumes) que coinciden con el texto, combinando la base
local y la búsqueda en vivo de MusicBrainz (`/artist?query=`, `/release-group?query=` y
`/recording?query=`, una request por tipo como máximo). **No ingiere** discografía, tracklist ni
carátula: la ingesta pesada ocurre al abrir un resultado (`/api/catalog/artist/[id]`,
`/api/catalog/release-group/[id]`). Cada candidato de MusicBrainz aún no visto se
persiste como stub (una operación por tipo) para que todo resultado tenga `id` local.
Adicionalmente, si la consulta coincide con una **canción**, la respuesta puede incluir un
contexto `songContext` con los álbumes que la contienen (ver más abajo).

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
  ],
  "songContext": {
    "recordingId": "uuid",
    "mbid": "uuid | null",
    "title": "string",
    "artistName": "string | null",
    "albums": [
      {
        "id": "uuid",
        "mbid": "uuid | null",
        "title": "string",
        "category": "studio | single_ep | compilation | live_other",
        "year": "int | null"
      }
    ]
  }
}
```

`subtitle`: disambiguation del artista o artista principal del álbum. `artistType` solo
en artistas; `category` y `year` solo en álbumes (el año si MusicBrainz lo trae, con
precisión anual basta). `cached`: la entidad local ya tiene contenido cacheado
(discografía sincronizada / tracklist ingerido). Sin coincidencias es **200 con
`{ "results": [] }`**, no 404.

**`songContext` (opcional, openspec `add-recording-album-search`):** la canción detectada para
`q` y los álbumes que la contienen. Es dato **adicional no esencial**: los clientes deben tratar
su ausencia como normal — puede omitirse si no hay coincidencia de canción relevante o si la pata
de recordings de MusicBrainz falla (ese fallo **nunca** convierte la búsqueda en 502 mientras
haya resultados de artistas/álbumes). Reglas:

- La canción **no es un resultado navegable**: `kind` sigue siendo solo `artist | release-group`;
  `recordingId` se expone como dato, sin enlace a `/song/...` desde la búsqueda.
- Detección (dos fuentes que se **unen**): (a) la base local — `recording`s cuyo título coincide
  con la parte de canción de `q` y ya tienen apariciones ingeridas (tracklists de álbumes
  visitados); (b) MusicBrainz — si un candidato de artista de la propia búsqueda está contenido
  en `q`, la query de recordings se acota a sus **release-groups propios** con cláusula
  `"<canción>" AND (rgid:… OR rgid:…)` (lista ordenada por categoría —estudio primero—, tope 120;
  sale de créditos locales o de un browse de discografía). El texto libre y `artist:"nombre"` no
  son fiables: los bootlegs y las bandas de cover se acreditan con el nombre literal del artista,
  y grabaciones canónicas como el *Stairway to Heaven* de estudio ni siquiera tienen
  artist-credit en MusicBrainz. Se aceptan candidatos cuyo título guarde contención mutua con la
  consulta tolerando ≤2 tokens extra; se browséan los primeros 4 candidatos (en orden de score) y
  la sección es la **unión** de las apariciones de ambas fuentes — cualquier versión (estudio,
  live, remix) cuenta como la misma canción. La **identidad** del contexto (`recordingId`,
  `mbid`, `title`, `artistName`) es la contribución de mayor `release-count`, única grabación
  ingestionada. Una sola canción por búsqueda.
- `albums`: apariciones agrupadas por `release_group` (muchas ediciones, un álbum; el año mínimo
  se propaga entre fuentes al deduplicar), excluidos los que ya figuran en `results`, ordenados
  por categoría (`studio` → `single_ep` → `compilation` → `live_other`), luego `year` ascendente
  (null al final) y título; máximo **12**. `year` es el año del release más antiguo del grupo
  (proxy del álbum original).
- Presupuesto (peor caso en frío, con hint de artista): ≤1 browse de discografía del hint (0 si
  hay créditos locales) + ≤1 request de búsqueda de recordings + ≤4 browses de candidatos (cada
  uno, una página de 100; una canción con más de 100 releases puede no listar todos sus álbumes
  por esa grabación — la página del álbum sigue siendo la fuente de verdad). No hay corte
  temprano del recorrido, pero todo se cachea con la TTL de búsquedas del cliente (10 min, por
  mbid en los browses), salvo el browse de discografía (política de ingestas frescas): el coste
  completo es solo del primer golpe. Si MusicBrainz falla, la sección degrada a las apariciones
  locales sin romper `results`.
- La resolución en frío persiste `recording`, sus créditos y stubs de `release_group`; **nunca**
  escribe `release` ni `track` (ver la capacidad `catalog-recording-ingestion`: ingerir
  apariciones parciales congelaría el álbum con tracklists incompletos).

Orden determinista: locales cacheados → resto de locales → solo-MusicBrainz (por score),
con coincidencia exacta de nombre/título al tope de su grupo; "Todo" intercala artistas
y álbumes preservando el orden relativo.

**400** `VALIDATION_ERROR` si falta `q` o llega vacío. **502** `INTERNAL_ERROR` si
MusicBrainz falla y no hay ninguna coincidencia local (con datos locales, degrada a 200
con las coincidencias locales).

## `GET /api/catalog/release-group/[id]` — ✅ Existe

Trae (o ingiere bajo demanda) el tracklist de la **edición representativa** de un álbum ya
conocido por su `id` propio (no `mbid`). La edición representativa se elige de forma
determinista con `pickRepresentativeRelease` (openspec: `album-edition-selection`), no
"la primera oficial".

**200 OK**

```json
{
  "releaseGroup": {
    "id": "uuid",
    "mbid": "uuid | null",
    "title": "string",
    "category": "studio | single_ep | compilation | live_other",
    "firstReleaseDate": "YYYY-MM-DD | null",
    "firstReleaseYear": "int | null",
    "createdAt": "ISO-8601"
  },
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

**Obra vs edición (openspec: `canonicalize-release-group`):** `releaseGroup` es la obra —lleva
`category` (tipo de obra) y la fecha de lanzamiento **canónica** del álbum (`firstReleaseDate` con
precisión diaria, `firstReleaseYear` con cualquier año conocido, misma tolerancia que
`release_date`). `release.releaseDate` es la fecha de **esa edición** y puede diferir (una reedición
de 2015 de un disco de 1994). El frontend muestra `releaseGroup.firstReleaseYear` como año del álbum.
`release.editionLabel` ya no es siempre `"original"`: se deriva de la edición elegida
(`disambiguation` → sufijo de título → `"standard"`).

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

## Descubrimiento `/explore` (cambio `add-album-discovery`)

**No expone endpoints.** La superficie `/[locale]/explore` y sus listados filtrados
(`?decada=` / `?genero=` / `?page=`) se resuelven en Server Components llamando directo a
`src/services/discovery/discovery.ts`. La paginación de los listados filtrados es
server-side (anterior / siguiente por `?page=`), sin fetch de cliente. Ver
`docs/05-features/explore.md`.

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

`POST /api/auth/register` recibe `{ username, email, password, locale? }`, crea una cuenta y devuelve
`201 { user }`. Dispara en best-effort el correo de verificación de email (ver sección siguiente);
un fallo de envío no afecta el alta. `POST /api/auth/login` recibe `{ identifier, password }`, rota la
sesión actual o crea una nueva y devuelve `200 { user }`. Ambos aplican rate limiting y nunca
devuelven el token.

`POST` y `DELETE /api/auth/logout` eliminan la sesión actual. `DELETE /api/auth/revoke-all` requiere sesión y
elimina todas las sesiones del usuario. `GET /api/auth/me` es un contrato opcional para clientes;
los Server Components resuelven la sesión directamente, sin fetch interno.

Una cookie ausente, inválida o expirada se trata de forma indistinguible y devuelve `AUTH_REQUIRED`
en operaciones protegidas; no se revela si la sesión existió. Logout solo revoca la sesión actual.
`revoke-all` revoca todas las sesiones del usuario; no existe listado de dispositivos.

La cookie opaca `music_session` es `httpOnly`, `secure`, `sameSite=lax`, con expiración fija de 30
días. Los errores posibles están en `docs/04-api/errors.md` y `src/lib/api/schemas.ts`.

## Recuperación de contraseña

`POST /api/auth/password/forgot` recibe `{ email, locale? }` (el `locale` se valida contra los
locales soportados, default `es`). Responde **siempre `202 { ok: true }`** para todo email bien
formado —exista o no la cuenta y sea local o solo-Google— para no permitir enumerar cuentas. Solo
cuando existe un `app_user` con `password_hash` no nulo genera un token de un solo uso (30 minutos,
guardado hasheado), invalida los tokens previos de esa cuenta y envía un correo con el link
`/<locale>/auth/reset-password?token=...`. El envío no bloquea la respuesta. Si en producción no hay
un transporte de email real configurado, responde `503 EMAIL_CONFIG_MISSING` (fail-closed). **400**
con `VALIDATION_ERROR` si el email no es válido; **429** con `RATE_LIMITED` (por IP y por email).

`POST /api/auth/password/reset` recibe `{ token, password }`. Consume el token de forma atómica, y
si es válido y no expiró actualiza la contraseña con Argon2id, elimina todos los tokens de
restablecimiento y todas las sesiones de la cuenta (sin autologin), y responde `200 { ok: true }`.
**400** con `INVALID_RESET_TOKEN` si el token no existe, expiró o ya fue usado; **400** con
`PASSWORD_REUSED` si la contraseña nueva es igual a la actual (el token no se consume, para permitir
reintentar con el mismo link); **400** con `VALIDATION_ERROR` si la contraseña no cumple la política
(`min(8).max(128)`) —en ese caso el token tampoco se consume—; **429** con `RATE_LIMITED` por IP.

## Verificación de email

`app_user.email_verified_at` registra si el email está verificado. Las cuentas preexistentes quedaron
verificadas por backfill y las altas de Google se marcan al crearse; las altas locales nuevas quedan
sin verificar. La verificación es **soft**: no bloquea login ni acciones (ADR 0015).

`POST /api/auth/email/verify` recibe `{ token }` y consume el token de un solo uso (TTL 24 h);
responde `200 { ok: true }` o `400 INVALID_VERIFICATION_TOKEN` si no existe, expiró o ya fue usado;
`400 VALIDATION_ERROR` si el body no es válido; `429 RATE_LIMITED` por IP.

`POST /api/auth/email/verify/resend` requiere sesión (`401 AUTH_REQUIRED`), recibe `{ locale? }` y
reenvía el correo al email de la cuenta autenticada: `200 { ok: true }` si lo envió, `409
EMAIL_ALREADY_VERIFIED` si ya estaba verificado, `503 EMAIL_CONFIG_MISSING` si no hay transporte de
correo configurado y `429 RATE_LIMITED` (por usuario e IP). El reenvío nunca opera sobre otra cuenta.

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
  en una transacción, sin `password_hash` y con `email_verified_at` poblado. El username se deriva
  del local-part del email
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

**Intenciones del flujo (cambio `rework-account-settings`).** `GET /api/auth/google/start` acepta
además `intent` (`login` por defecto | `link` | `reauth`; cualquier otro valor se trata como `login`).
`link` y `reauth` exigen sesión (`401 AUTH_REQUIRED` sin redirigir a Google) y guardan en las cookies
del flujo la intención y quién lo inició; el callback exige que sea la misma sesión. `link` crea la
identidad de Google para la cuenta de la sesión (por el id de Google, no por email); `reauth` exige que
la identidad sea la vinculada a esa cuenta y rota la sesión. Ambas terminan siempre en
`/<locale>/me/settings/account?google=linked|confirmed|error[&code=OAUTH_IDENTITY_TAKEN|OAUTH_IDENTITY_MISMATCH]`
— un destino **fijo**; sigue sin existir un `returnTo` controlado por el cliente. Con `login`, el
callback usa el idioma preferido de la cuenta (`app_user.locale`) si lo tiene.

La vinculación implícita sigue prohibida: un email de Google que coincide con una cuenta local se
rechaza (`EMAIL_TAKEN_BY_LOCAL`); solo se vincula desde una sesión iniciada y con `intent=link`.

## Cuenta y seguridad (cambio `rework-account-settings`, Fase 1)

Todas exigen sesión (`401 AUTH_REQUIRED`). Las acciones sensibles piden el factor de identidad
descrito en `docs/05-features/user-profile.md` ("Autenticación reciente"): la contraseña actual en el
cuerpo (`403 INVALID_CREDENTIALS` si no es correcta, `429 RATE_LIMITED` al superar 10 intentos) o, en
una cuenta sin contraseña, una sesión de menos de 10 minutos (`403 REAUTH_REQUIRED`).

| Endpoint | Cuerpo / respuesta |
|---|---|
| `GET /api/me/account/username/availability?q=` | `200 { valid, available, reason }`; `reason`: `too_short` \| `too_long` \| `invalid_chars` \| `current` \| `taken` \| `null`. Nunca dice quién lo tiene. Límite de 120 consultas por 15 min |
| `PUT /api/me/account/username` | `{ username }` → `200 { username, nextChangeAt }`. `409 USERNAME_TAKEN` (sin distinguir mayúsculas, incluye reservas ajenas), `409 USERNAME_CHANGE_COOLDOWN` (un cambio cada 30 días), `400 VALIDATION_ERROR` |
| `GET /api/me/account/email` | `200 { pending: { newEmail, expiresAt } \| null }` |
| `POST /api/me/account/email` | `{ newEmail, password?, locale? }` → `200 { ok: true }`; manda el enlace al email **nuevo**, el actual no cambia. `409 EMAIL_TAKEN`, `503 EMAIL_CONFIG_MISSING`, `429 RATE_LIMITED`. Si el envío falla no queda token |
| `POST /api/auth/email/change/confirm` | `{ token, locale? }` (sin sesión: el token es el factor) → `200 { ok: true, email }`; `400 INVALID_VERIFICATION_TOKEN` (inexistente, vencido o usado), `409 EMAIL_TAKEN` (otra cuenta lo tomó entretanto) |
| `PUT /api/me/account/password` | `{ currentPassword, newPassword, revokeOtherSessions?, locale? }` (8–128) → `200 { ok: true }`. `400 PASSWORD_REUSED` si es igual a la actual; con `revokeOtherSessions` borra las demás sesiones y conserva la actual; invalida los tokens de reset; avisa por correo |
| `POST /api/me/account/password` | `{ newPassword, locale? }` — solo cuentas **sin** contraseña; exige sesión reciente (`REAUTH_REQUIRED`). `400 VALIDATION_ERROR` si ya tiene |
| `DELETE /api/me/account/identities/google` | `204`. `409 LAST_ACCESS_METHOD` si la cuenta no tiene contraseña |
| `GET /api/me/sessions` | `200 { sessions: [{ id, deviceLabel, createdAt, lastSeenAt, current }] }`, la actual primero; `deviceLabel: null` = "Dispositivo desconocido". Sin token ni hash |
| `DELETE /api/me/sessions/{id}` | `204`. `404 SESSION_NOT_FOUND` (inexistente, no UUID o de otra persona), `400 VALIDATION_ERROR` si es la sesión actual (para eso está cerrar sesión) |
| `PATCH /api/me/preferences` | `{ locale: "es" \| "en" }` → `200 { locale }`. `400 VALIDATION_ERROR` con otro valor |
| `POST /api/me/account/deactivate` | `{ password? }` → `200 { ok: true }`. Marca `deactivated_at`, borra **todas** las sesiones de la persona y limpia la cookie. `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED`, `REAUTH_REQUIRED` (cuenta de Google con sesión de más de 10 min). No borra contenido |
| `DELETE /api/me/account` | `{ username, password? }` → `200 { ok: true }`. `username` debe ser igual al de la cuenta (`400 VALIDATION_ERROR` si no). Borra la cuenta y todo lo suyo, y limpia la cookie. `409 ACCOUNT_DELETION_BLOCKED` si tiene historial de moderación o editorial (no cambia nada). Mismos errores de identidad que desactivar |
| `GET /api/me/export` | `200` con el JSON de la persona (`Content-Disposition: attachment; filename="music-platform-<usuario>-<fecha>.json"`, `Cache-Control: no-store`). Forma: `{ version, exportedAt, account, profile, library, activity, lists, highlights, social, catalog }`. Sin hash de contraseña, tokens ni sesiones. `429 RATE_LIMITED`: una exportación por minuto por persona |

**Autoría desactivada.** En reseñas y comentarios, `user` gana `deactivated?: boolean`. Cuando es `true`,
`username` es `""` y `displayName` es `null` (la API no entrega la identidad real de una cuenta
desactivada); el cliente muestra «Cuenta desactivada» sin enlace. Iniciar sesión con una cuenta
desactivada la **reactiva**: `POST /api/auth/login` y el callback de Google limpian la marca.

`POST /api/auth/login` incluye ahora `user.locale` (preferencia guardada o `null`): `AuthForm` lleva a
la persona a ese idioma si difiere del actual.

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

**200 OK:** `{ user: { id, username, displayName, email, profileVisibility, defaultAudience } }`, con
`defaultAudience` en `"private" | "followers" | "public" | null` (`null` = "según el tipo", ver
`PATCH`). **401** con `AUTH_REQUIRED` si no hay sesión.

### `PATCH /api/me/profile`

Actualiza la visibilidad, el nombre visible, la audiencia por defecto y/o la identidad extendida
del perfil propio (cambios `redesign-user-profile` y `rework-owner-management`). Todos los campos
son opcionales; se requiere al menos uno. Las cadenas de texto se recortan; la cadena vacía borra
el campo (`null`; en `displayName` el sitio vuelve a mostrar el username).

**Body:** cualquier subconjunto de
`{ profileVisibility: "public" | "private", displayName (≤50), defaultAudience: "private" | "followers" | "public" | null, bio (≤200), pronouns (≤40), pronounSet, country, location (≤80), timezone, showLocalTime: boolean }`.

`country` es un **código ISO de dos letras de la lista cerrada** (`CL`, `ES`…; en mayúsculas — `cl`,
`Chile` o `ZZ` responden `400 VALIDATION_ERROR`); la cadena vacía o `null` lo borra. `location` es la
ciudad o región en texto libre. Los **pronombres** son `pronounSet`: `"he"` \| `"she"` \| `"they"`
(guarda la clave y **borra** `pronouns`), `"other"` (exige `pronouns` no vacío en la misma petición,
guarda el texto y deja la clave en `NULL`) o `null` (borra ambos). Una clave de la lista con `pronouns`
no vacío, `"other"` sin texto o una clave fuera de la lista responden `400 VALIDATION_ERROR`. Un
cliente anterior que solo envía `pronouns` se trata como «Otro» (y vacío lo borra, junto con la clave).
`birthYear`, `birthDate`, `gender`, `firstName` y `lastName` **no existen**: se descartan y una petición
que solo los trae responde `400 VALIDATION_ERROR`.

`country`, `location` y los pronombres **no se entregan** a quien no tiene acceso a un perfil privado
(la vista del perfil los vacía en el servidor); `GET /api/me/export` los incluye en `account`
(`country`, `pronounSet`, `pronouns`, `location`).

`timezone` es un **identificador IANA de la lista** (`America/Santiago`, `UTC`…; sensible a
mayúsculas); la cadena vacía o `null` la borra y cualquier otro valor responde `400
VALIDATION_ERROR`. `showLocalTime` muestra la hora local en la Placa y **exige zona**: vaciar la zona
lo apaga solo y activarlo sin zona (guardada o enviada en la misma petición) responde `400
VALIDATION_ERROR`.

`defaultAudience` es la audiencia con la que nace el contenido **nuevo** de biblioteca (favoritos,
diario, listas y colección). `null` la quita: cada tipo vuelve a su default (favoritos `public`,
listas y colección `followers`, diario `private`). Precedencia al crear: audiencia explícita de la
petición > `defaultAudience` > default del tipo. Nunca modifica contenido ya creado: para eso está
`/api/me/default-audience/apply`.

**200 OK:** `{ user: { id, username, displayName, email, profileVisibility, defaultAudience } }`
actualizado.
**400** con `VALIDATION_ERROR` si un valor no es válido (p. ej. una audiencia fuera del conjunto
permitido o un nombre de más de 50 caracteres) o el body está vacío. **401** con `AUTH_REQUIRED` si
no hay sesión; no se modifica ningún dato.

### `PUT /api/me/profile/music-identity`

Reemplaza "Me defino como", géneros y/o formatos de escucha (cambio `rework-account-settings`,
Fase 2). **Body:** cualquier subconjunto no vacío de
`{ selfRoles: SelfRole[] (≤3), genres: Genre[] (≤5), listeningFormats: ListeningFormat[] (≤5) }`,
de las listas cerradas de `src/lib/music-identity.ts`, sin repetidos. Lo enviado sustituye al valor
anterior (`[]` lo vacía); lo no enviado no se toca. **200 OK:** `{ selfRoles, genres, listeningFormats }`
guardados. **400 `VALIDATION_ERROR`** con un valor fuera de la lista, un cuarto rol, un sexto género,
repetidos o un cuerpo vacío (no cambia nada). **401** `AUTH_REQUIRED`.

### `PUT` / `DELETE /api/me/profile/prompts`

`PUT` reemplaza el conjunto **completo** de preguntas del perfil, en el orden del array.
**Body:** `{ prompts: [{ promptKey, answer }] }` (0..3; `promptKey` de las 8 preguntas cerradas; `answer`
de 1 a 100 caracteres, recortada, de una sola línea). **200 OK:** `{ prompts: [{ promptKey, answer,
position }] }`. **400 `VALIDATION_ERROR`** con una pregunta desconocida o repetida, una respuesta
vacía, de más de 100 caracteres o con saltos de línea, o una cuarta pregunta; el conjunto anterior no
cambia (transacción). `DELETE` las quita todas (equivale a `PUT` con `[]`). **401** `AUTH_REQUIRED`.

### `GET /api/me/default-audience/apply?audience=`

Vista previa de solo lectura de "Aplicar a lo existente" (cambio `apply-default-audience`): cuántos
elementos del usuario cambiarían si se aplicara esa audiencia (los que hoy tienen una distinta) y,
de ellos, cuántos están fijados o destacados. No modifica nada. `audience` ∈ `private | followers |
public`; `null` y "según el tipo" no son válidos (no hay un valor único que aplicar).

**200 OK:** `{ audience, favorites, diary, lists, collection, highlighted: { pinnedLists,
highlightedDiary } }`, todos enteros ≥ 0. Las listas cuentan solo las
estándar propias (`kind = 'standard'`); los recorridos de artista no.
**400** con `VALIDATION_ERROR` si `audience` falta o no es válida. **401** con `AUTH_REQUIRED` si no
hay sesión.

### `POST /api/me/default-audience/apply`

Aplica una audiencia a **todo el contenido de biblioteca existente** del usuario: favoritos,
entradas de diario, listas estándar propias y copias de colección. Es una acción explícita, distinta
de `PATCH /api/me/profile` (que solo fija la preferencia para el contenido nuevo y no toca lo ya
creado).

**Body:** `{ audience: "private" | "followers" | "public" }`.

- Una sola transacción: o cambian todos los tipos o ninguno.
- Idempotente: solo actualiza las filas cuya audiencia difiere; repetirla responde con ceros.
- Incluye los elementos fijados o destacados y **no** modifica pines, destacados, la preferencia
  guardada, valoraciones, escuchas, comentarios, reseñas ni la wishlist.
- No cambia `updated_at` de listas ni de copias de colección (no genera eventos de "lista
  actualizada" en el feed).

**200 OK:** `{ audience, favorites, diary, lists, collection }`, con cuántos elementos se actualizaron
de cada tipo (pueden diferir de la vista previa si algo cambió entre ambos pasos).
**400** con `VALIDATION_ERROR` si `audience` falta, es `null` o no es válida. **401** con
`AUTH_REQUIRED` si no hay sesión; no se modifica ningún dato. Sin códigos de error nuevos.

### `PUT` / `DELETE /api/me/profile/links`

Reemplaza el conjunto ordenado de enlaces externos del perfil (0..5). La posición se deriva
del orden del array. `DELETE` los vacía todos.

**Body (PUT):** `{ links: [{ kind, value }] }` — `kind` ∈ `bandcamp · lastfm · discogs · instagram ·
youtube · soundcloud · x · tiktok · spotify · other` (`other` se muestra como "Enlace"); `value` es lo
que la persona escribió (≤400) y el servidor lo valida y normaliza según el `kind` (cambio
`add-profile-link-validation`; antes el campo era `url`, ahora `{ kind, url }` se rechaza; el tipo
`website` se unificó en `other` y ya se rechaza):

| Tipo | `value` aceptado | URL guardada |
|---|---|---|
| `instagram`, `x`, `tiktok`, `youtube`, `soundcloud`, `bandcamp`, `lastfm`, `discogs`, `spotify` | El **usuario** (con o sin `@`) o un enlace de ese sitio, del que se extrae el usuario | La URL canónica del perfil (`https://www.instagram.com/ana`, `https://x.com/ana`, `https://www.tiktok.com/@ana`, `https://www.youtube.com/@ana`, `https://soundcloud.com/ana`, `https://ana.bandcamp.com`, `https://www.last.fm/user/ana`, `https://www.discogs.com/user/ana`, `https://open.spotify.com/user/ana`) |
| `other` (Enlace) | Una URL con o sin esquema (`www.link.com`) | La misma URL; si no trae `http(s)://` se antepone `https://` |

Se rechaza un enlace de otro sitio, uno sin usuario (la portada, una publicación), un usuario que no
cumple las reglas del sitio, un esquema que no sea `http`/`https` (`javascript:`, `mailto:`…) y, en
Enlace, un valor sin dominio. Las reglas viven en `src/lib/profile-links.ts` y las usan el
servidor y el editor.

**200 OK:** `{ links: [{ id, kind, url, position }] }` con la `url` canónica. **400** con
`VALIDATION_ERROR` si hay más de 5, un `kind` fuera del conjunto o un `value` inválido para su tipo.
**401** con `AUTH_REQUIRED` sin sesión.

### `PUT` / `DELETE /api/me/profile/pinned`

Reemplaza los hasta 4 ítems de **"Empieza por aquí"** del perfil (antes "Destacados"; tipos
mezclados, con orden y nota). `DELETE` los vacía. El nombre de la ruta no cambió.

**Body (PUT):** `{ items: [{ type: "artist"|"release-group"|"recording", id, note? (≤120) }] }`.
**200 OK:** `{ showcase: { pinned: [{ id, note, position, entity: { type, id, title, artistName, coverThumbUrl } }], identityCard: { artist, album, anthem } } }`.
El himno solo viaja dentro de `identityCard.anthem` (el campo `showcase.anthem` de primer nivel
se retiró en el cambio `simplify-profile-curation`).
**400** con `VALIDATION_ERROR` si hay más de 4, una nota demasiado larga o una entidad
inexistente.

### `PUT` / `DELETE /api/me/profile/anthem`

Fija (`PUT`) o quita (`DELETE`) el himno del perfil — una canción elegida manualmente.

**Body (PUT):** `{ recordingId }`. **200 OK:** `{ showcase }` (misma forma que arriba).
**400** con `VALIDATION_ERROR` si el `recordingId` no es válido o no existe.

### `GET /api/users/[username]/fingerprint`

Huella de gusto del perfil, filtrada por lo que el visitante puede ver. La curva de
valoraciones solo se calcula para el dueño y seguidores aprobados; escuchas, favoritos,
listas y colección se filtran por audiencia.

**200 OK:** `{ fingerprint: { ratingsVisible, ratingCurve: [{ stars, count }] | null, totalRatings, decades: [{ label, count }], genres: [{ label, count }], genreDataAvailable, split: { ratedArtists, ratedAlbums, ratedSongs, collection, lists } } | null }`.
`fingerprint` es `null` cuando el visitante no tiene acceso al contenido del perfil.

### `GET /api/users/[username]/in-rotation`

Sección "En rotación" del perfil (cambio `add-profile-in-rotation`): canciones y álbumes
con más presencia en el **diario** del dueño en los últimos 30 días, filtrados por lo que el
solicitante puede ver. Score de recencia + frecuencia calculado bajo demanda; no expone
métricas.

**200 OK:** `{ inRotation: { songs: [{ id, title, artistName }], albums: [{ id, title, artistName, coverThumbUrl }] } | null }`.
`inRotation` es `null` cuando el solicitante no tiene acceso al perfil **o** ninguna
actividad visible alcanza el umbral. **404** con `USER_NOT_FOUND` si el usuario no existe.

### `GET /api/users/[username]/affinity`

Coincidencias entre el visitante autenticado y el dueño del perfil.

**200 OK:** `{ affinity: { sharedFavorites: [entity], sharedHighRatings: [entity], mutualFollowers } | null }`.
`affinity` es `null` sin sesión, para el propio dueño, sin acceso, ante bloqueo, o cuando no
hay ninguna coincidencia.

### `PUT /api/users/[username]/follow`

Sigue a un usuario. Si el perfil es público, la relación queda `accepted`; si es privado, se crea
una solicitud pendiente. Es idempotente: repetir no duplica la relación.

**200 OK:** `{ relation: "following" | "requested" }`. **404** con `USER_NOT_FOUND`. **403** con
`BLOCKED` si existe un bloqueo. **400** con `RELATION_INVALID` si se intenta seguir a sí mismo.

### `DELETE /api/users/[username]/follow`

Deja de seguir a un usuario, o cancela una solicitud pendiente enviada. Idempotente.

**200 OK:** `{ relation: "none" }`.

### `PUT` / `DELETE /api/artists/[id]/follow`

Sigue / deja de seguir a un artista (cambio `add-artist-following`). Relación unilateral, sin
aprobación, **idempotente** en ambos sentidos (repetir no falla ni duplica). Seguir no crea
un favorito ni una valoración.

**200 OK:** `{ following: boolean }`. **404** con `ARTIST_NOT_FOUND` si el id no existe o no
es un UUID. **401** con `AUTH_REQUIRED` sin sesión.

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

### `POST /api/me/onboarding`

Cierra el onboarding de dos puertas (cambio `add-two-door-onboarding`): crea los favoritos de
álbum de la Puerta 1 y fija `app_user.onboarded_at`. La Puerta 2 (registrar una escucha)
usa `POST /api/me/diary`, no este endpoint.

**Body:** `{ albumReleaseGroupIds: [uuid] }` (0..6). Cada id se convierte en un `favorite` de
álbum (si no existe), con la audiencia por defecto; no se fija ni se ordena (el cambio
`simplify-profile-curation` retiró la sección "Álbumes favoritos"). **No** crea `rating` ni
`listen_entry`.
**200 OK:** `{ onboardedAt }`.
**400** con `VALIDATION_ERROR` si hay más de 6 ids, ids duplicados o algún álbum no existe.
**401** con `AUTH_REQUIRED` sin sesión. Idempotente: si el usuario ya está onboardeado,
responde `200` con el estado vigente sin volver a crear favoritos.

### `GET /api/me/diary?page=&pageSize=&q=&context=&reaction=&audience=`

Lista paginada del diario propio en orden cronológico descendente. Cada entrada expone su objetivo
con `{ type, id, title, subtitle, coverThumbUrl }`.

Los cuatro últimos params son opcionales, combinables entre sí y aditivos (sin ellos, el
comportamiento es idéntico al de antes de este cambio): `q` busca coincidencia parcial
(case-insensitive) sobre el título del objetivo (artista, álbum o canción); `context` filtra por
`listenContext` (`first_listen` | `relisten` | `rediscovery`); `reaction` filtra por reacción
(`liked` | `loved` | `obsessed` | `neutral` | `disliked`, o el valor especial `none` para las
entradas sin reacción); `audience` filtra por audiencia (`private` | `followers` | `public`).

**200 OK:** `{ entries: [ListenEntry], page, pageSize, hasNext }`. **400** con `VALIDATION_ERROR`
si la paginación es inválida, o si `context`/`reaction`/`audience` traen un valor fuera de su
vocabulario cerrado.

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

### `GET/POST /api/catalog/{target}/{id}/reviews` (cambio `add-album-review`)

La reseña es la superficie crítica del álbum: texto largo, título opcional, **una vigente por
(usuario, objetivo)**, editable. Distinta de `comment`. El rating no vive en la reseña — el listado
lo trae por `LEFT JOIN` con `rating` (refleja el valor **vigente** del autor, o `null` si lo borró).

`GET` es **público** (con o sin sesión), acepta `page` / `pageSize` (entero 1-100) y devuelve
`{ reviews, page, pageSize, hasNext }`, ordenado por fecha de creación descendente. Cada entrada:
`{ id, user: { id, username, displayName }, title: string | null, body, rating: { stars, detailedScore } | null, createdAt, updatedAt }`.

`POST` requiere sesión y recibe `{ body, title?, stars?, detailedScore? }`:

- `title` ausente o `""` → se guarda `null`; en otro caso 1–120.
- `body` obligatorio, 1–10000.
- Si llegan `stars`, hace upsert del rating del autor (misma validación que el endpoint de rating).
- Si **no** llegan `stars` y el autor no tiene un rating del objetivo → `400 { code: "REVIEW_REQUIRES_RATING" }`.
- Crea o **reemplaza** la reseña propia del objetivo (idempotente). Devuelve `201 { review }`.
- En esta versión solo se aceptan objetivos `release-group`; `artist` y `recording` → `400 { code: "REVIEW_TARGET_NOT_SUPPORTED" }`. El listado responde `200` con lista vacía para esos objetivos.

### `PATCH/DELETE /api/catalog/reviews/{reviewId}` (cambio `add-album-review`)

`PATCH` recibe `{ title?, body?, stars?, detailedScore? }` (al menos un campo); `title: null` o `""`
borra el título; si llegan `stars`, hace upsert del rating. Solo la reseña propia. `DELETE` borra
físicamente la reseña propia y devuelve `204`; **no toca el `rating`** del autor. `404
{ code: "REVIEW_NOT_FOUND" }` si no existe (o el id no es UUID); `403 { code: "PERMISSION_DENIED" }`
si es de otro usuario.

**Feed:** las reseñas **no** entran todavía en `GET /api/me/feed` — la integración es un cambio
posterior (Fase 2 de `redefine-content-hierarchy`).

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

Cambia la audiencia de uno o varios favoritos propios (cambio `rework-favorites-section`).

**Body (individual):** `{ id, audience }` → **200 OK:** `{ favorite }`. **404** con
`FAVORITE_NOT_FOUND` si el favorito no existe o no es del usuario.
**Body (en lote):** `{ ids: string[] (1..50), audience }` → **200 OK:** `{ updatedIds }` con los
ids efectivamente actualizados; los ids ajenos o inexistentes del conjunto se ignoran. **404** con
`FAVORITE_NOT_FOUND` si ningún id es del usuario. **400** con `VALIDATION_ERROR` si el conjunto
está vacío, excede 50, o la audiencia es inválida.
**401** con `AUTH_REQUIRED` sin sesión.

### `GET /api/me/favorites?page=&pageSize=&q=&type=&audience=&sort=`

Lista paginada de los favoritos propios. Orden por rango de tipo (artista → álbum → canción) y,
dentro de cada tipo, por `sort` (cambio `rework-favorites-section`). Parámetros opcionales,
combinables, aplicados en el servidor sobre el conjunto completo:
- `q`: búsqueda parcial (sin distinguir mayúsculas) sobre el título del objetivo **o el nombre del
  artista principal acreditado** de álbumes y canciones (cambio `improve-favorites-picker`); los
  favoritos de artista coinciden por su nombre. También aplica a `GET /api/users/[username]/favorites`.
- `type`: `artist` | `release-group` | `recording`.
- `audience`: `private` | `followers` | `public`.
- `sort`: `recent` (default) | `alpha` (alfabético por título del objetivo).

**200 OK:** `{ favorites: [{ id, targetType, audience, createdAt, target: { id, title, coverThumbUrl } }], page, pageSize, hasNext, counts: { artist, "release-group", recording } }`.
`counts` refleja `q`/`audience` pero no `type`. **400** con `VALIDATION_ERROR` si un parámetro es
inválido.

### `GET /api/users/[username]/favorites?page=&pageSize=`

Favoritos de un usuario visibles para un lector. La sesión es opcional. Aplica la matriz de
visibilidad (bloqueos, perfil privado, relación de seguimiento); sin permiso devuelve lista vacía
sin revelar si el usuario tiene favoritos. Mismo orden por rango de tipo que el listado propio.

**200 OK:** `{ favorites: [...], page, pageSize, hasNext, counts }`. **404** con `USER_NOT_FOUND`
si el username no existe.

## Want to Listen (cambio `add-want-to-listen`)

Señal prospectiva "quiero escuchar" sobre artista o álbum — **nunca canción**. Toggle
idempotente: un usuario tiene a lo sumo una entrada por objetivo. Sin audiencia ni superficie
pública: es una lista de gestión personal. Registrar una escucha (`POST /api/me/diary`) del
mismo objetivo retira automáticamente la entrada correspondiente, si existe. Las mutaciones y
lecturas requieren sesión.

### `POST /api/me/want-to-listen`

Marca un objetivo (toggle on). Idempotente: si ya está en la lista, devuelve la entrada existente
sin duplicar.

**Body:** `{ target: { type: "artist" | "release-group", id } }`.
**201 OK:** `{ entry }` si se creó. **200 OK:** `{ entry }` si ya existía. **400** con
`VALIDATION_ERROR` si `type` es `recording` u otro valor inválido. **404** con
`WANT_TO_LISTEN_TARGET_INVALID` si el objetivo no existe. **401** con `AUTH_REQUIRED` sin sesión.

### `DELETE /api/me/want-to-listen`

Quita una entrada (toggle off). Idempotente: si no existe, responde `204` igual.

**Body:** `{ target: { type, id } }`. **204.** **401** con `AUTH_REQUIRED` sin sesión.

### `GET /api/me/want-to-listen?page=&pageSize=`

Lista paginada de la lista propia, orden cronológico descendente.

**200 OK:** `{ items: [{ id, targetType, createdAt, target: { id, title, coverThumbUrl } }], page, pageSize, hasNext }`.
**401** con `AUTH_REQUIRED` sin sesión.

## Listas (Fase 5.5, cambio `add-favorites-and-lists`)

Colecciones curadas de un solo tipo de entidad (`artist`/`release-group`/`recording`), propiedad de
un único usuario. Título obligatorio (≤100), descripción opcional (≤500), audiencia propia,
orden manual de ítems. Las mutaciones requieren sesión; las lecturas propias requieren sesión y las
ajenas aplican la matriz de visibilidad.

### `POST /api/me/lists`

Crea una lista vacía. `entityType` queda fijo y no es modificable después.

**Body:** `{ entityType, title, description?, audience? }`.
**201 OK:** `{ list }` con `{ id, entityType, title, description, audience, createdAt, updatedAt, items: [] }`.

### `GET /api/me/lists?page=&pageSize=&q=&entityType=&sort=`

Lista paginada de las listas propias (cambio `rework-lists-section`). Query params opcionales:
`q` (búsqueda parcial por título), `entityType` (`artist`/`release-group`/`recording`), `sort`
(`recent` por defecto, o `alpha`). Un `entityType` o `sort` fuera de vocabulario responde `400`
con `VALIDATION_ERROR`. Las listas **fijadas** aparecen primero. Cada lista incluye `itemCount`,
`coverThumbs` (hasta 4 carátulas de sus ítems) y `pinned`.

**200 OK:** `{ lists: [{ id, entityType, title, description, audience, createdAt, updatedAt, itemCount, coverThumbs, pinned }], page, pageSize, hasNext }`.

### `POST` / `DELETE /api/me/lists/{listId}/pin`

Fija / desfija una lista propia (cambio `rework-lists-section`). Idempotente. Escribe solo en
`user_list_pin` — no toca `user_list.updated_at`. **204.** **404** con `LIST_NOT_FOUND` si no es
del usuario. **401** con `AUTH_REQUIRED` sin sesión.

### `GET /api/me/lists/{listId}`

Detalle de una lista propia, con sus ítems ordenados por posición.

**200 OK:** `{ list }` con `items: [{ id, position, target: { id, title, artistName, coverThumbUrl } }]`.
`artistName` (campo aditivo de `rework-list-detail`) es el artista principal acreditado de un
álbum o canción, `null` para ítems de tipo artista. `coverThumbUrl` de un ítem de canción es la
carátula de un álbum representativo que la contiene, `null` si ninguna edición tiene arte.
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
visibilidad; sin permiso devuelve lista vacía. Desde `rework-lists-section` cada lista incluye
`itemCount` y `coverThumbs` (igual que la superficie propia; `pinned` siempre `false`).

**200 OK:** `{ lists: [...], page, pageSize, hasNext }`. **404** con `USER_NOT_FOUND`.

### `GET /api/users/[username]/lists/{listId}`

Detalle de una lista ajena visible, con sus ítems ordenados por posición. Si la lista no es
visible para el visitante, se comporta como inexistente. La página
`/<locale>/users/[username]/lists/[listId]` (cambio `rework-list-detail`) consume este endpoint.

**200 OK:** `{ list }` con `items: [{ id, position, target: { id, title, artistName, coverThumbUrl } }]`
(misma forma que el detalle propio). **404** con `LIST_NOT_FOUND` o `USER_NOT_FOUND`.

## Guardar / descubrir listas (Fase 5.5, cambio `rework-lists-section`)

Guardar una lista ajena es un marcador privado por `(saver, list)` con un eje `following`.
Descubrir lista las listas públicas de la comunidad. Ambas superficies requieren sesión.

### `POST /api/me/saved-lists`

Guarda (o actualiza `following` de) una lista ajena visible. Idempotente por `(saver, list)`.

**Body:** `{ listId, following? }` (`following` por defecto `false`; no toca `tracking`).
**201 OK:** `{ list }` con `{ id, entityType, title, description, createdAt, updatedAt, itemCount, coverThumbs, owner: { id, username, displayName }, following, tracking, unavailable }`.
**400** con `VALIDATION_ERROR` si el body no es válido o la lista es propia.
**404** con `LIST_NOT_FOUND` si la lista no existe o no es visible.
**401** con `AUTH_REQUIRED` sin sesión.

### `DELETE /api/me/saved-lists/{listId}`

Quita el guardado (y su tracking, si estaba activo). Idempotente. **204.** **400** si el id no
es UUID. **401** sin sesión.

### `PATCH /api/me/saved-lists/{listId}` (cambio `add-camino`)

Activa o desactiva el tracking de progreso propio sobre una lista ajena de álbumes
(`entityType = 'release-group'`), sin tocar `following`. Crea el guardado si todavía no existía.

**Body:** `{ tracking: boolean }`.
**200 OK:** `{ list }` — mismo `SavedListSummary` que `POST`, con el campo `tracking` actualizado.
**400** con `VALIDATION_ERROR` si el body no es válido o la lista no es de álbumes.
**404** con `LIST_NOT_FOUND` si la lista no existe o no es visible.
**401** con `AUTH_REQUIRED` sin sesión.

### `GET /api/me/saved-lists?page=&pageSize=`

Listas guardadas del usuario, orden por fecha de guardado descendente. Una lista que dejó de ser
visible se marca `unavailable: true` en vez de filtrarse.

**200 OK:** `{ lists: [SavedListSummary], page, pageSize, hasNext }`. **401** sin sesión.

### `GET /api/lists/discover?page=&pageSize=&q=&entityType=&sort=` (cambio `rework-public-lists-surface`)

Listas de audiencia `public` de perfiles `public`, excluyendo cualquier bloqueo y —con
sesión— las propias, en orden cronológico descendente (sin recomendación algorítmica).
**Público** (cambio `add-community-lists-surface`): alimenta la pestaña "Descubrir" de
`/me/lists`, la sección "Recientes" de `/lists` y el modo explorar de `/lists`.

Parámetros opcionales (cambio `rework-public-lists-surface`):

- `q` — texto libre; coincide con título **y** descripción de la lista.
- `entityType` — `artist` | `release-group` | `recording`.
- `sort` — `recent` (default, cronológico) | `popular`.

Sin filtros, el contrato y la respuesta no cambian. Con `sort=popular` se ordena por conteo
agregado de guardados descendente (a igualdad, por creación) e **incluye** las listas sin
guardados al final; esto difiere de la sección "Populares" (`/api/lists/popular`), que exige
al menos un guardado. En ese orden, cada entrada incluye `saveCount`.

**200 OK:** `{ lists: [{ ..., owner, saved, following, saveCount? }], page, pageSize, hasNext }`. Sin
sesión, `saved`/`following` son `false`.
**400** con `VALIDATION_ERROR` si la paginación es inválida o si `entityType`/`sort` no están
soportados.

### `GET /api/lists/popular?page=&pageSize=` (cambio `add-community-lists-surface`)

Sección "Populares" de `/lists`: listas públicas de perfiles públicos con al menos un
guardado, ordenadas por conteo agregado de guardados descendente (a igualdad, por fecha de
creación). **Público**; con sesión excluye las listas propias.

**200 OK:** `{ lists: [{ ..., owner, saved, following, saveCount }], page, pageSize, hasNext }`.
**400** con `VALIDATION_ERROR` si la paginación es inválida.

### `GET /api/lists/from-following?page=&pageSize=` (cambio `add-community-lists-surface`)

Sección "De la gente que seguís" de `/lists`: listas de audiencia `public` o `followers` de
usuarios que el lector sigue con relación aceptada, orden cronológico descendente, excluyendo
bloqueos y las listas propias.

**200 OK:** `{ lists: [{ ..., owner, saved, following }], page, pageSize, hasNext }`.
**400** con `VALIDATION_ERROR` si la paginación es inválida. **401** con `AUTH_REQUIRED` sin sesión.

## Camino (cambio `add-camino`)

Generaliza el mecanismo de progreso derivado de "Recorrido de artista" más allá de un artista: un
Camino es un `user_list` con `kind = 'custom_journey'`, siempre `entityType = 'release-group'`,
sin discografía de fondo — el Camino ES el conjunto de álbumes que su dueño agregó. Todos los
endpoints propios requieren sesión; el progreso (`{ selectedCount, listenedCount }`) se deriva en
cada lectura, nunca se persiste.

### `GET /api/me/caminos`

Listado combinado: Caminos dinámicos propios + listas ajenas trackeadas.

**200 OK:** `{ caminos: [CaminoSummary], trackedLists: [TrackedListSummary] }`, donde
`CaminoSummary = { id, title, state, progress, coverThumbUrl, updatedAt }` y
`TrackedListSummary = { id, title, kind, owner, state, progress, updatedAt }` (`kind` distingue
`standard` de `custom_journey` para resolver la ruta de lectura correcta). **401** sin sesión.

### `POST /api/me/caminos`

Crea un Camino vacío.

**Body:** `{ title, description?, audience? }` (mismos límites que Listas: título ≤100,
descripción ≤500).
**201 OK:** `{ camino: CaminoDetail }`, con
`CaminoDetail = { id, title, description, audience, state, createdAt, updatedAt, progress, albums }`
y `albums: [{ id, title, coverThumbUrl, listened }]`.
**400** con `VALIDATION_ERROR`. **401** sin sesión.

### `GET /api/me/caminos/{caminoId}` · `DELETE /api/me/caminos/{caminoId}`

Detalle propio; borrado físico e irreversible. **200** / **204**.
**404** con `CAMINO_NOT_FOUND` si no existe o no es propio. **401** sin sesión.

### `POST /api/me/caminos/{caminoId}/archive` · `DELETE /api/me/caminos/{caminoId}/archive`

Archiva / desarchiva, conservando contenido y progreso. **200 OK:** `{ camino }`.
**404** con `CAMINO_NOT_FOUND`. **401** sin sesión.

### `POST /api/me/caminos/{caminoId}/albums`

Agrega un álbum al final del Camino propio. Idempotente.

**Body:** `{ releaseGroupId }`. **201 OK:** `{ camino }`.
**400** con `VALIDATION_ERROR` si el álbum no existe. **404** con `CAMINO_NOT_FOUND`. **401** sin sesión.

### `DELETE /api/me/caminos/{caminoId}/albums/{releaseGroupId}`

Quita un álbum del Camino propio. Idempotente. **200 OK:** `{ camino }`.
**404** con `CAMINO_NOT_FOUND` o `ALBUM_NOT_FOUND` según qué id no es válido. **401** sin sesión.

### `GET /api/caminos/discover?page=&pageSize=&genre=&artist=`

Descubrimiento público de Caminos populares — **sin sesión**. Lista las listas de álbumes
visibles (`public`, `kind` `standard` o `custom_journey`) con al menos un trackeo activo,
ordenadas por conteo de trackeo descendente (no por guardado simple). `genre` filtra por
coincidencia de al menos un álbum etiquetado; `artist` busca por nombre de artista acreditado
en al menos un álbum (sin distinguir mayúsculas), no por id.

**200 OK:** `{ caminos: [{ id, title, kind, owner, itemCount, coverThumbs, trackingCount }], page, pageSize, hasNext }`.
**400** con `VALIDATION_ERROR` si la paginación es inválida.

## Colección física (Fase 5.5, cambios `add-physical-collection` y `rework-collection-section`)

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

### `GET /api/me/collection?page=&pageSize=&format=&attribute=&q=&sort=&group=`

Colección propia paginada. Parámetros opcionales, combinables y aplicados en servidor sobre el
conjunto completo (aditivo en `rework-collection-section`):

- `format`, `attribute` — filtran por un valor cada uno.
- `q` — búsqueda parcial sin distinguir mayúsculas sobre el **título del álbum y el nombre del
  artista acreditado** (a diferencia de listas/favoritos, que solo buscan por título).
- `sort` — `recent` (default) · `alpha` (título) · `artist` · `format`.
- `group` — `none` (default) · `format` · `artist`. Solo afecta al orden; el cliente secciona.

**200 OK:** `{ entries: [...], page, pageSize, hasNext, counts: { vinyl, cd, cassette, other } }`.
`counts` se calcula tras aplicar `q` y `attribute` pero **ignorando** `format`, de modo que el
encabezado siempre muestre la distribución completa entre formatos. **400** con `VALIDATION_ERROR`
si la paginación, un filtro, el orden o la agrupación no son válidos.

### `PATCH /api/me/collection`

Cambio de audiencia en lote de entradas propias (aditivo en `rework-collection-section`). **Body:**
`{ ids: string[] (1..50), audience: "private"|"followers"|"public" }`. Idempotente; los ids ajenos
o inexistentes del conjunto se ignoran. **200 OK:** `{ updatedIds: [...] }`. **400** con
`VALIDATION_ERROR` si el lote está vacío o supera 50. **404** con `COLLECTION_ENTRY_NOT_FOUND` si
ningún id corresponde a una entrada propia.

### `PATCH /api/me/collection/{entryId}`

Modifica `format`, `attributes`, `note` o `audience` de una entrada propia. Al menos un campo
obligatorio. `note: null` limpia la nota.

**Body:** `{ format?, attributes?, note?, audience? }`. **200 OK:** `{ entry }`. **404** con
`COLLECTION_ENTRY_NOT_FOUND` si no existe o no es del usuario.

### `DELETE /api/me/collection/{entryId}`

Borra una entrada propia. **204.** **404** con `COLLECTION_ENTRY_NOT_FOUND`.

### `GET /api/users/[username]/collection?page=&pageSize=&format=&attribute=&q=&sort=&group=`

Colección de un usuario visible para un lector. Sesión opcional. Aplica la matriz de visibilidad
por entrada; sin permiso devuelve lista vacía sin revelar si el usuario tiene colección. Acepta los
mismos parámetros opcionales que la lectura propia.

**200 OK:** `{ entries: [...], page, pageSize, hasNext, counts: { vinyl, cd, cassette, other } }`.
**404** con `USER_NOT_FOUND`.

## Wishlist de colección (`add-collection-wishlist`)

Señal prospectiva ("quiero conseguir este álbum"), independiente de la colección física
(`collection_entry`): tener una entrada en una no impide tener el álbum en la otra, y viceversa.
A diferencia de `collection_entry`, `format` es **opcional** (`null` = "cualquier formato") y no
hay `audience` — la wishlist es privada del dueño, sin lectura por `username`. Mismo vocabulario
cerrado de `format`/`attributes` que la colección física. **No es un toggle idempotente:** `POST`
siempre crea entradas nuevas, y se permiten varias entradas por álbum sin deduplicar.

Forma de `entry`: `{ id, format, attributes: [...], note, createdAt, updatedAt,
album: { id, title, coverThumbUrl, artistId, artistName } }`.

### `POST /api/me/collection/wanted`

Crea una o varias entradas de deseo para un mismo álbum en una sola operación (transacción
atómica). **Body:** `{ releaseGroupId, entries: [{ format?, attributes?, note? }] (1..10) }`.
**201 OK:** `{ entries: [...] }`. **400** con `VALIDATION_ERROR` si el lote está vacío, supera 10
variantes, o alguna variante tiene un `format`/`attribute` fuera del vocabulario o una `note` de
más de 140 caracteres (ninguna entrada del lote se crea). **404** con `ALBUM_NOT_FOUND` si el
álbum no existe.

### `GET /api/me/collection/wanted?page=&pageSize=&q=&sort=`

Wishlist propia paginada. `q` busca parcialmente sobre el título del álbum y el artista
acreditado; `sort` es `recent` (default) o `alpha`. **200 OK:**
`{ entries: [...], page, pageSize, hasNext }`. **400** con `VALIDATION_ERROR` si la paginación o
el orden no son válidos.

### `PATCH /api/me/collection/wanted/{entryId}`

Modifica `format`, `attributes` o `note` de una entrada de deseo propia. Al menos un campo
obligatorio. `format: null` vuelve la entrada a "cualquier formato"; `note: null` limpia la nota.

**Body:** `{ format?, attributes?, note? }`. **200 OK:** `{ entry }`. **404** con
`WANTED_ENTRY_NOT_FOUND` si no existe o no es del usuario.

### `DELETE /api/me/collection/wanted/{entryId}`

Borra una entrada de deseo propia. **204.** **404** con `WANTED_ENTRY_NOT_FOUND`.

## Moderación

### `POST /api/moderation/reports`

Requiere sesión. Crea un reporte pendiente sobre un comentario, una reseña o el perfil de un usuario.

**Body:** `{ targetType: "comment" | "review" | "user", targetId, reason }`.
**201:** `{ report }` cuando se crea un reporte nuevo. **200:** `{ report: null }` cuando ya existe
un reporte pendiente del mismo usuario sobre el mismo objetivo. **400** con `VALIDATION_ERROR` para
un body inválido (o un auto-reporte de perfil), **404** con `COMMENT_NOT_FOUND`/`REVIEW_NOT_FOUND`/
`USER_NOT_FOUND` si el objetivo no existe y **401** con `AUTH_REQUIRED` sin sesión.

La asignación y revocación de roles continúa siendo una operación interna; las acciones de
ocultar/restaurar contenido, aplicar restricciones sociales y gestionar listas editoriales se
exponen en las superficies protegidas descritas abajo.
## Moderación y administración editorial

### `GET /api/moderation/reports`

Requiere `moderation.review_content`. Devuelve reportes paginados; acepta `status` (`pending` |
`resolved` | `dismissed`, default `pending`), `targetType` (`comment` | `review` | `user`), `page`
y `pageSize` (máx. 50). La respuesta contiene `reports`, `status`, `page`, `pageSize` y `hasNext`.
Un `reportId`, `targetId` o `userId` no-UUID devuelve `400 VALIDATION_ERROR` (o `INVALID_TARGET`
en el endpoint de contenido).

### `PATCH /api/moderation/reports/[reportId]`

Requiere `moderation.review_content`. Recibe `{ "status": "resolved" | "dismissed" }` y actualiza
el actor y la fecha de resolución. Solo puede resolver/descartar un reporte `pending` (uno ya
resuelto o descartado devuelve `404 MODERATION_REPORT_NOT_FOUND`). Cada resolución o descarte
registra una fila de auditoría `moderation_action` (`report_resolve` / `report_dismiss`).

### `PATCH /api/moderation/content/[targetType]/[targetId]`

Requiere `moderation.review_content`. `targetType` es `comment`, `review` o `list`; recibe
`{ "action": "hide" | "restore", "reason": "string" }`. El objetivo inexistente devuelve
`404 COMMENT_NOT_FOUND` / `REVIEW_NOT_FOUND` / `LIST_NOT_FOUND`.

### `GET|POST /api/moderation/restrictions`

Requiere `moderation.suspend_social`. `GET` lista restricciones y acepta `userId` (no-UUID →
`400 VALIDATION_ERROR`). `POST` recibe `{ "userId": "uuid" }` **o** `{ "identifier":
"username|email" }` (se resuelve server-side), más `{ "reason": "string", "expiresAt": "ISO-8601"
}`. Usuario inexistente → `404 USER_NOT_FOUND`. Si faltan ambos `userId` e `identifier`, o llegan
los dos, la respuesta es `400 VALIDATION_ERROR`.

### `DELETE /api/moderation/restrictions/[restrictionId]`

Requiere `moderation.suspend_social` y revoca una restricción social activa. Si la restricción no
existe o ya fue revocada devuelve `404 RESTRICTION_NOT_FOUND`.

### `GET /api/admin/editorial/lists`

Requiere `editorial.author`. Devuelve las listas administrables de la **cuenta curadora
`@exploracion`** (las listas generales de `/explore`); las listas personales de otros usuarios no
aparecen ni pueden publicarse. Cada lista incluye `author` (la persona que la creó, o `null` para
listas legadas) y `state` (`draft` | `submitted` | `published` | `withdrawn` | `personal`). Acepta
`status=draft|submitted|published|withdrawn`: `draft` filtra borradores nunca publicados sin
propuesta, `submitted` los propuestos para revisión, `published` las oficiales y `withdrawn` las
retiradas por un administrador.

### `POST /api/admin/editorial/lists`

Requiere `editorial.author`. Recibe `{ entityType, title, description? }` y crea un **borrador**
propiedad de `@exploracion`, con audiencia `public` y autoría registrada. Devuelve `{ list }` con
`201`.

### `PATCH /api/admin/editorial/lists/[listId]`

Requiere `editorial.author`. Recibe `{ title?, description? }` y edita un borrador nunca publicado
(la audiencia se fuerza a `public`). Devuelve `{ list }`. Una lista personal, publicada o retirada
responde `404 LIST_NOT_FOUND`.

### `DELETE /api/admin/editorial/lists/[listId]`

Requiere `editorial.author`. Borra un borrador que nunca fue publicado ni retirado (responde `204`).
Una lista personal, publicada o retirada responde `404 LIST_NOT_FOUND`. Sin permiso, `403`.

### `POST /api/admin/editorial/lists/[listId]/submit`

Requiere `editorial.author`. Propone un borrador para publicación (registra actor y fecha); no lo
publica. Responde `{ ok: true }`.

### `POST /api/admin/editorial/lists/[listId]/publish` · `POST /api/admin/editorial/lists/[listId]/withdraw`

Requieren `editorial.publish`. Publican o retiran una lista oficial de `@exploracion` (retirar deja
de mostrarla como contenido editorial, sin borrarla). Responden `{ ok: true }`. Publicar una lista
personal de otro usuario responde `404 LIST_NOT_FOUND`; sin `editorial.publish`, `403`.

### `POST|PUT /api/admin/editorial/lists/[listId]/items` · `DELETE /api/admin/editorial/lists/[listId]/items/[itemId]`

Requieren `editorial.author`. `POST` agrega un `{ target: { type, id } }` a un borrador, `PUT`
recibe `{ itemIds }` y reordena, `DELETE` quita un ítem. Devuelven `{ list }` (el detalle actualizado).

Ninguno de estos endpoints borra la lista subyacente salvo el `DELETE` de un borrador nunca
publicado. Un `listId` o `itemId` no-UUID devuelve `404`.

Todos estos endpoints devuelven el formato uniforme `{ error, code }` ante errores y no exponen
credenciales, roles internos ni datos privados innecesarios.
