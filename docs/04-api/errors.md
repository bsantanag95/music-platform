# Convención de errores — `/api/catalog/*`

**Estado: ✅ Implementada.** Los tres route handlers devuelven `code` en cada respuesta de
error, y están envueltos con `withErrorHandling` (`src/lib/with-error-handling.ts`) para
capturar errores no controlados como `INTERNAL_ERROR` en vez de un 500 sin body.

## Forma actual (hoy)

Todos los errores devuelven `{ "error": "mensaje en español" }` con el status HTTP
correspondiente. El string de `error` **no** es estable — es un mensaje para debugging
manual, no un contrato para el frontend (ver `03-best-practices.md`: nunca mostrarlo
directo en la UI ni hacer *string-matching* sobre él).

## Forma implementada

Todo error de los tres route handlers devuelve un campo `code` machine-readable, estable,
además del `error` legible:

```json
{ "error": "No se encontró ningún artista", "code": "ARTIST_NOT_FOUND" }
```

### Catálogo de códigos

| `code` | Status HTTP | Dónde ocurre |
|---|---|---|
| `VALIDATION_ERROR` | 400 | `search`: falta el query param `q`. |
| `ARTIST_NOT_FOUND` | 404 | `search` y `artist/[id]`: no se encontró el artista. |
| `ALBUM_NOT_FOUND` | 404 | `release-group/[id]`: el `id` no corresponde a ningún `release_group`. |
| `NO_EDITIONS_FOUND` | 404 | `release-group/[id]`: MusicBrainz no tiene ninguna edición ingerible para ese álbum. |
| `INTERNAL_ERROR` | 500 | Cualquier error no controlado (ej. MusicBrainz caído, timeout, error de base de datos) — capturado por `withErrorHandling`, que envuelve los tres handlers y devuelve este shape en vez de un 500 sin body. |

### Implementación

Cada route handler exporta `GET` envuelto en `withErrorHandling(...)`
(`src/lib/with-error-handling.ts`), que hace `try/catch` alrededor de la lógica real y
devuelve `INTERNAL_ERROR` ante cualquier excepción no manejada explícitamente.

### Implicancia para el frontend

`src/lib/api/schemas.ts` (Etapa 3.0) define `ApiErrorSchema` con `code` como enum de los
valores de la tabla de arriba. `src/lib/api/client.ts` parsea toda respuesta no-2xx contra
ese schema y lanza un `ApiError` tipado con `.code`, nunca el string de `error` crudo.

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
