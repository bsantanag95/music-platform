## Context

`LazyCoverImage` (grilla del perfil de artista) resuelve la carátula de cada álbum llamando a `getReleaseGroupDetail` → `GET /api/catalog/release-group/{id}` → `getAlbumDetail` → `findOrIngestTracklist`. Esto ingesta el tracklist completo de la edición (2 llamadas a MusicBrainz: `getReleaseGroup` + `getRelease`, serializadas en la cola de `client.ts` a ≥1.1s) solo para devolver `cover`. La carátula, sin embargo, se resuelve con un `HEAD` a Cover Art Archive usando el `mbid` del release-group, que ya está cacheado en `release_group.mbid` desde la sincronización de discografía — no requiere MusicBrainz.

Consecuencia: un artista frío (discografía cacheada pero álbumes nunca abiertos) tarda ~2.2–3s por álbum en mostrar carátulas; artistas grandes acumulan 1–2 min. Hoy `ingest-release.ts` además resuelve la carátula y la persiste en `release.cover_thumb_url`, duplicando esa resolución.

Este cambio es cross-cutting (esquema + servicio + endpoint + frontend + docs), por eso requiere design.md.

## Goals / Non-Goals

**Goals:**
- Que la grilla resuelva carátulas con 0 llamadas a MusicBrainz (solo `HEAD` a CAA en paralelo).
- Una única fuente escribible para la carátula: `release_group.cover_thumb_url`.
- Mantener intacto el contrato REST de `GET /api/catalog/release-group/{id}` (`release.coverThumbUrl` y `cover` coherentes).
- Dejar la ingesta del tracklist exclusivamente para la página de detalle del álbum.

**Non-Goals:**
- No cambiar la resolución en sí (sigue siendo `HEAD` a `front-250`, misma política de licencia).
- No implementar lazy-load por viewport ni ingesta en background (alternativas descartadas en este cambio).
- No tocar el modelo de `release`/`track`/`recording` más allá de la deprecación de `release.cover_thumb_url`.

## Decisions

**D1 — `release_group.cover_thumb_url` como única fuente escribible; `release.cover_thumb_url` deprecado como lectura legada.**
El resolver nuevo (`cover.ts`) escribe solo en `release_group`. `ingest-release.ts` deja de resolver y self-healar carátulas. El read-model (`album-detail.ts`) usa `release_group.coverThumbUrl ?? release.coverThumbUrl`, donde el fallback existe únicamente para filas pre-migración, y normaliza el response para que `release.coverThumbUrl` y `cover` coincidan siempre.
- *Alternativa A (dos fuentes escribibles + `??` permanente):* rechazada — deja drift permanente entre columnas que hay que reconciliar en cada lectura.
- *Alternativa B1 (mirror: reescribir `release.cover_thumb_url` desde RG en cada insert):* rechazada — vuelve a duplicar la escritura sin aportar lectura nueva; nada fuera de `album-detail` consume esa columna.
- *Alternativa C (no persistir, resolver on-the-fly):* rechazada — viola el patrón central "cacheo bajo demanda" y agrega N `HEAD` por visita.
- Se hace **backfill** en la migración (copia `release.cover_thumb_url` → `release_group.cover_thumb_url` cuando no sea null), para que el fallback legado casi nunca se active.

**D2 — Resolver la carátula bajo demanda, re-resolviendo cuando la columna es null (self-heal).**
`findOrResolveCover(rg)`: si `rg.coverThumbUrl` está seteado → cache hit; si no → `resolveCoverThumbUrl(rg.mbid)` (CAA `HEAD`, 0 MB) y persiste en RG; `mbid` null → null. Un álbum sin carátula real re-hace 1 `HEAD` por visita, para siempre.
- Decisión consciente: `HEAD` es barato (~100ms), no está rate-limited y los álbumes sin carátula son minoría en CAA. Un flag tri-estado ("ya chequeado sin carátula") agrega complejidad de esquema desproporcionada al costo real.
- *Optimización futura anotada (no ahora):* si el costo se vuelve medible, agregar columna `cover_checked_at` o sentinel para no re-chequear.
- Consistente con el comportamiento actual de `ingest-release.ts` (self-heal de `cover_thumb_url` nulo).

**D3 — Endpoint cover-only `GET /api/catalog/release-group/{id}/cover` → `{ cover: string | null }`.**
Route handler con `withErrorHandling` y `params: Promise<{ id }>` (Next 15, `await params`). Resuelve el RG; si no existe → `ALBUM_NOT_FOUND`; si existe → `findOrResolveCover` → `{ cover }`. No ingesta tracklist, no toca MusicBrainz.
- *Alternativa (query param `?coverOnly=true` sobre el endpoint existente):* rechazada — ensucia el contrato existente; un endpoint dedicado es más limpio y cacheable.
- La carátula se devuelve aunque el RG no tenga release ingerido (el mbid del RG alcanza para CAA).

**D4 — `album-detail` y `ingest-release` convergen en D1.**
`ingest-release.ts` inserta `release` sin `coverThumbUrl` (columna nullable, sin cambios de esquema de release). `album-detail.ts` resuelve la carátula con `findOrResolveCover` (garantiza que una visita directa al álbum, sin pasar por la grilla, también la resuelva) y arma el response normalizado.

## Risks / Trade-offs

- [Dos columnas conviven temporalmente (`release_group.cover_thumb_url` nueva + `release.cover_thumb_url` legada)] → Mitigado por D1 + backfill: una sola escribible, fallback solo para pre-migración, response normalizado.
- [Álbum sin carátula real re-hace 1 `HEAD` por visita del perfil, indefinidamente] → Decisión consciente (D2): costo barato y acotado; optimización `cover_checked_at` documentada como futuro.
- [Endpoint nuevo sin cache HTTP explícito; el browser repite el request al navegar] → TanStack Query con su query key deduplica en la sesión; aceptable para el alcance.
- [Normalizar el response (`release.coverThumbUrl` = `cover`) desvía la lectura de la fila real] → Aceptable: la columna de release queda deprecada por diseño, y el contrato se vuelve más coherente (antes ya duplicaba `cover`).

## Migration Plan

1. Aplicar migración `0003_release_group_cover_thumb_url.sql` (ALTER + backfill) — aditiva, sin reescritura destructiva; `pnpm run db:migrate`.
2. Desplegar código: servicio cover, endpoint cover-only, frontend, docs.
3. Rollback: revertir el deploy de código; la columna extra es inocua (no se usa) y `ingest-release` reanuda su resolución previa si se revierte también ese commit. No hay datos que restaurar.

## Open Questions

- Ninguna pendiente: D1 (single source + backfill) y D2 (self-heal) fueron confirmadas por decisión de producto antes de este plan.
