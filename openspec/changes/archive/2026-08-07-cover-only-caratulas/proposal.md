## Why

La grilla del perfil de artista (`LazyCoverImage`) resuelve cada carátula con `getAlbumDetail`, que ingesta el tracklist completo de la edición (2 llamadas a MusicBrainz serializadas en la cola de ≥1.1s) solo para devolver `cover`. La carátula en sí se resuelve con un `HEAD` a Cover Art Archive usando el `mbid` del release-group que **ya está cacheado** en la discografía — no necesita tocar MusicBrainz. Resultado: un artista frío tarda ~2.2–3s por álbum en mostrar carátulas (1–2 min para artistas grandes), en vez de segundos.

## What Changes

- **Nueva fuente escribible única de carátula:** `release_group.cover_thumb_url`. Un nuevo servicio resuelve y cachea la carátula ahí, sin ingestar el tracklist.
- **`release.cover_thumb_url` queda deprecado como lectura legada:** solo fallback `??` en el read-model para filas pre-migración; `ingest-release.ts` deja de resolver y self-healar carátulas.
- **Nuevo endpoint cover-only:** `GET /api/catalog/release-group/{id}/cover` → `{ cover }`, 0 llamadas a MusicBrainz.
- **`LazyCoverImage` pasa a usar el endpoint cover-only** (misma UI: skeleton/placeholder intactos).
- **Backfill en migración** copia carátulas existentes de `release` a `release_group`.
- **No rompe contrato REST existente:** `GET /api/catalog/release-group/{id}` mantiene shape; `release.coverThumbUrl` y `cover` se normalizan al mismo valor en el response.

## Capabilities

### New Capabilities

- Ninguna (el endpoint cover-only se modela como requisito ADDED dentro de `cover-art-resolution`).

### Modified Capabilities

- `cover-art-resolution`: el cacheo de la resolución pasa de `release.cover_thumb_url` a `release_group.cover_thumb_url` como única fuente escribible (con `release` como fallback legado), y se agrega el endpoint cover-only.
- `catalog-artist`: "Carga progresiva de carátulas" cambia para resolver cada carátula vía el endpoint cover-only (sin ingestar el tracklist del álbum).

## Impact

- **Esquema:** migración `0003_release_group_cover_thumb_url.sql` (ALTER + backfill), espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`.
- **Servicios:** nuevo `src/services/catalog/cover.ts`; cambios en `ingest-release.ts` (deja de resolver carátula) y `album-detail.ts` (lee RG-first con fallback legado y normaliza el response).
- **API:** nuevo route handler `src/app/api/catalog/release-group/[id]/cover/route.ts` (Next 15: `params` Promise, `withErrorHandling`).
- **Frontend:** `src/lib/api/schemas.ts` (CoverSchema), `src/lib/api/catalog.ts` (`getReleaseGroupCover`), `src/lib/query/keys.ts`, `src/components/catalog/LazyCoverImage.tsx`.
- **Docs:** `docs/04-api/contracts.md`, `docs/02-architecture/code-walkthrough.md` (ambas decisiones: single source + self-heal).
- **Tests:** `cover.test.ts` (nuevo), `route.test.ts` del endpoint (nuevo), `ingest-release.test.ts` (actualizado), `LazyCoverImage.test.tsx` (mock cover-only), `smoke-test-routes.ts` (caso nuevo).
- **Sin dependencias nuevas.**
