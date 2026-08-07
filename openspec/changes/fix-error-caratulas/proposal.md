## Why

El detalle de álbum arma la URL de carátula a partir del **release** MBID (`coverartarchive.org/release/{mbid}/front-250`), pero Cover Art Archive solo responde para la release que realmente lleva el arte. Como la ingesta elige la primera edición "Official" de MusicBrainz — que a menudo no es la que tiene la portada — muchos álbumes oficiales devuelven 404 en el navegador (p. ej. "emails I can't send" de Sabrina Carpenter, "Night of the Crime" de Icon). Los álbumes sin carátula (demos/outtakes) también generan el mismo 404 e imagen rota porque siempre se devuelve una URL.

## What Changes

### Goals

- Que todo álbum con carátula en Cover Art Archive la muestre, independientemente de qué release se ingirió (resolver a nivel de release-group).
- Que los álbumes sin carátula devuelvan `cover: null` y el frontend muestre el placeholder, sin 404 en consola ni imagen rota.

### Non-Goals

- No cambiar el shape del contrato REST (`cover` sigue siendo `string | null`).
- No introducir carátulas en la respuesta de discografía (`search`/`artist/[id]`) — sigue la decisión de `00-backend-analysis.md`.
- No resolver carátulas a resolución completa (se mantiene la política de 250px).
- No agregar migración de esquema: la columna `release.cover_thumb_url` ya existe.

### Cambios

- `coverThumbUrl` pasa a construir la URL a nivel de **release-group** (`coverartarchive.org/release-group/{mbid}/front-250`).
- Nueva función `resolveCoverThumbUrl(releaseGroupMbid)` que hace un `HEAD` a Cover Art Archive y decide si existe carátula (responde `null` ante 404/5xx/error de red).
- La ingesta de ediciones (`findOrIngestTracklist`) resuelve la carátula y la cachea en `release.cover_thumb_url`.
- Self-heal: si una release ya cacheada tiene `cover_thumb_url` nulo, se re-resuelve antes de devolverla (recupera álbumes cacheados antes del fix y portadas que CAA agregue después).
- El read-model `album-detail` devuelve el valor cacheado; `null` cuando no hay carátula.
- Actualización de smoke test, fixtures de tests y documentación en `/docs`.

## Capabilities

### New Capabilities

- `cover-art-resolution`: resolución y cacheo de la carátula miniatura de un álbum contra Cover Art Archive a nivel de release-group, con valor nulo cuando no existe.

### Modified Capabilities

- `catalog-album`: el requisito "Carátula y fallback" cambia su fuente de carátula — ahora proviene de la resolución cacheada a nivel de release-group (`cover` nulo cuando no hay arte), en lugar de armarse desde el release MBID.

## Impact

- `src/services/cover-art.ts` — URL por release-group + `resolveCoverThumbUrl`.
- `src/services/catalog/ingest-release.ts` — resolver y cachear `cover_thumb_url` al ingestar, con self-heal.
- `src/services/catalog/album-detail.ts` — devolver el valor cacheado en `cover`.
- `scripts/smoke-test-ingestion.ts` — mock de Cover Art Archive para `global.fetch`.
- Tests: `ingest-release.test.ts`, `route.test.ts`, `album/page.test.tsx`, `AlbumCover.test.tsx`, `LazyCoverImage.test.tsx`.
- Docs: `04-api/contracts.md`, `03-data/sql-model.md`, `02-architecture/code-walkthrough.md`.
- Sin migraciones SQL nuevas.
