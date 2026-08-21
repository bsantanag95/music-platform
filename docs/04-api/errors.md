# Convención de errores — `/api/*`

**Estado: ✅ Implementada.** Los route handlers de la API devuelven `code` en cada respuesta de
error y están envueltos con `withErrorHandling` (`src/lib/with-error-handling.ts`) para capturar
errores no controlados como `INTERNAL_ERROR` en vez de un 500 sin body.

## Forma actual (hoy)

Todos los errores devuelven `{ "error": "mensaje", "code": "CODIGO" }` con el status HTTP
correspondiente. El string de `error` **no** es estable — es un mensaje para debugging manual, no
un contrato para el frontend (ver `03-best-practices.md`: nunca mostrarlo directo en la UI ni
hacer *string-matching* sobre él).

## Forma implementada

Todo error de los route handlers devuelve un campo `code` machine-readable, estable,
además del `error` legible:

```json
{ "error": "No se encontró ningún artista", "code": "ARTIST_NOT_FOUND" }
```

### Catálogo de códigos

| `code` | Status HTTP | Dónde ocurre |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `search`: falta el query param `q`; `recording/[id]`: el id no es UUID; comentarios: paginación inválida. |
| `ARTIST_NOT_FOUND` | 404 | `search` y `artist/[id]`: no se encontró el artista. |
| `ALBUM_NOT_FOUND` | 404 | `release-group/[id]`: el `id` no corresponde a ningún `release_group`. |
| `NO_EDITIONS_FOUND` | 404 | `release-group/[id]`: MusicBrainz no tiene ninguna edición ingerible para ese álbum. |
| `RECORDING_NOT_FOUND` | 404 | No existe la grabación solicitada. |
| `AUTH_REQUIRED` | 401 | Falta una sesión válida para una operación protegida. |
| `INVALID_CREDENTIALS` | 401 | Login fallido; no revela si falló el identificador o la contraseña. |
| `USERNAME_TAKEN` / `EMAIL_TAKEN` | 409 | El registro duplicaría una cuenta existente. |
| `RATE_LIMITED` | 429 | Se superó el límite temporal de login o registro, o del flujo OAuth de Google (`/start` y `/callback` limitan por IP; el callback redirige a la página de error con este código). |
| `PERMISSION_DENIED` | 403 | El usuario no puede modificar el recurso. |
| `INVALID_TARGET` | 400/404 | Tipo, UUID u objetivo inexistente. |
| `INVALID_RATING` / `INVALID_COMMENT` | 400 | Entrada social inválida. |
| `RATING_NOT_FOUND` | 404 | No existe un rating propio para borrar. |
| `COMMENT_NOT_FOUND` | 404 | No existe el comentario solicitado. |
| `INTERNAL_ERROR` | 500 | Cualquier error no controlado (ej. MusicBrainz caído durante la ingesta fría, timeout, error de base de datos) — capturado por `withErrorHandling`, que devuelve este shape en vez de un 500 sin body. La marca de memberships no se escribe ante este error. |
| `EMAIL_TAKEN_BY_LOCAL` | 409 | Google OAuth: el email del ID token coincide con una cuenta local existente sin esa identidad vinculada, por conflicto de la restricción `UNIQUE(email)` (`auth.md` sección 6). Aplica sin importar `email_verified`. |
| `OAUTH_CONFIG_MISSING` | 503 | `GET /api/auth/google/start`: faltan variables de entorno de Google al iniciar el flujo (fail-closed). |
| `OAUTH_STATE_INVALID` | 400 | `GET /api/auth/google/callback`: el `state` del callback no coincide con la cookie, o la cookie expiró/no existe. |
| `OAUTH_CANCELLED` | 400 | `GET /api/auth/google/callback`: Google devolvió `error=access_denied` u otro `error` indicando que el usuario canceló el consentimiento. |
| `OAUTH_CALLBACK_INVALID` | 400 | `GET /api/auth/google/callback`: parámetros del callback malformados o el intercambio del authorization code falló. |
| `OAUTH_TOKEN_INVALID` | 400 | `GET /api/auth/google/callback`: el ID token de Google no pasó validación (issuer, audience, firma JWKS RS256, expiración o `nonce`). |
| `OAUTH_EMAIL_NOT_VERIFIED` | 400 | `GET /api/auth/google/callback`: el ID token trae `email_verified=false`/ausente y no existe identidad vinculada, por lo que no se crea la cuenta nueva (`auth.md` sección 6). |
| `USER_NOT_FOUND` | 404 | Perfil, búsqueda o destino de una relación: el username no corresponde a ningún usuario. |
| `RELATION_INVALID` | 400 | Operación de seguimiento o bloqueo inválida (ej. intentar seguirse o bloquearse a sí mismo). |
| `REQUEST_NOT_FOUND` | 404 | La solicitud de seguimiento no existe o ya fue resuelta (aprobada, rechazada o cancelada). |
| `BLOCKED` | 403 | La operación de seguimiento está impedida por un bloqueo existente entre las cuentas. |

### Implementación

Cada route handler exporta sus métodos HTTP envueltos en `withErrorHandling(...)`
(`src/lib/with-error-handling.ts`), que hace `try/catch` alrededor de la lógica real y
devuelve `INTERNAL_ERROR` ante cualquier excepción no manejada explícitamente.

### Implicancia para el frontend

`src/lib/api/schemas.ts` (Etapa 3.0) define `ApiErrorSchema` con `code` como enum de los
valores de la tabla de arriba. `src/lib/api/client.ts` parsea toda respuesta no-2xx contra
ese schema y lanza un `ApiError` tipado con `.code`, nunca el string de `error` crudo.

### Excepción: errores de `GET /api/auth/google/callback`

Los códigos `OAUTH_*`, `EMAIL_TAKEN_BY_LOCAL` y `RATE_LIMITED` originados en el callback de
Google **no** se devuelven como el shape JSON `{ error, code }` de la tabla anterior. El callback
es una navegación completa del navegador (el usuario llega ahí redirigido por Google, no vía
`fetch`), así que un body JSON no es visible ni útil. En su lugar, el route handler redirige a una
página localizada de error (`/{locale}/auth/error?code=OAUTH_STATE_INVALID`, por ejemplo), y esa
página resuelve el texto contra el mismo namespace `messages/{locale}/errors.json` que usa el resto
de la app. El `code` sigue siendo el mismo valor estable del enum — cambia el transporte, no el
catálogo. `GET /api/auth/google/start` usa el mismo mecanismo de redirect para `RATE_LIMITED` (la
página de error), mientras que `OAUTH_CONFIG_MISSING` desde `/start` se mantiene como JSON 503 (el
flujo nunca arranca).

### Mapeo de `code` a texto visible (i18n)

**Actualizado tras ADR 0007 / `02-architecture/i18n.md`.** El mapeo de cada `code` a un mensaje
legible para el usuario ya no vive como un objeto TypeScript local dentro de cada componente
(como ocurría en la versión inicial de `SearchForm.tsx`, Etapa 3.1). Vive en
`messages/{locale}/errors.json`, indexado 1:1 por el mismo `ErrorCode` que exporta
`schemas.ts`:

```json
{
  "ARTIST_NOT_FOUND": { "title": "No se encontró el artista", "description": "..." }
}
```

Cualquier componente que consuma `ApiError.code` (`SearchForm` hoy; los componentes de perfil de
artista y detalle de álbum de las Etapas 3.2/3.3 después) resuelve el texto vía
`useTranslations()` contra este namespace — nunca duplicando el mapeo localmente. Esto
centraliza el catálogo de mensajes de error una sola vez, coherente con que el catálogo de
`code` en sí (`ErrorCodeSchema`) también vive en un único lugar (`schemas.ts`).
