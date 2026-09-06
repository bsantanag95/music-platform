# Tasks â€” add-recording-album-search

## 1. Cliente de MusicBrainz

- [x] 1.1 Tipos en `src/services/musicbrainz/types.ts`: `MBRecordingSearchItem` (id, title,
      length?, artist-credit?, first-release-date?, score?), `MBRecordingSearchResponse`,
      `MBReleaseBrowseByRecordingResponse` (releases[] con `release-group` embebido: id, title,
      primary-type, secondary-types).
- [x] 1.2 `musicbrainz.searchRecording(query)`: `/recording?query=&limit=25&inc=artist-credits`,
      envuelto en `cachedSearch` (misma TTL que las otras bÃºsquedas).
- [x] 1.3 `musicbrainz.browseReleasesByRecording(recordingMbid)`: `/release?recording=&limit=100
      &inc=release-groups`, envuelto en `cachedSearch` (clave por mbid; es contexto de bÃºsqueda,
      no ingesta â€” documentar el porquÃ© en el comentario del cachÃ©).
- [x] 1.4 Tests de cliente en `client.test.ts` (URLs, params, cachÃ© TTL para ambos mÃ©todos).

## 2. Ingesta de grabaciÃ³n suelta (`catalog-recording-ingestion`)

- [x] 2.1 Crear `src/services/catalog/ingest-recording.ts` con `findOrIngestRecording(mbid, seed)`
      (idempotente: upsert `recording` + `ingestCredits` + `upsertReleaseGroupStubs` de las
      apariciones; NUNCA escribe `release`/`track`).
- [x] 2.2 Helper `findLocalRecordingAppearances(recordingId)`: apariciones locales
      (`track â†’ release â†’ release_group` deduplicados por release_group, con aÃ±o mÃ­nimo por
      grupo), reutilizable del estilo de `recording-detail.ts`.
- [x] 2.3 Tests unitarios con db/mÃºsica mockeada: alta nueva, grabaciÃ³n existente (no pisa
      enriquecido), apariciÃ³n que ya existe como release_group no duplica, cero escrituras a
      release/track.

## 3. ResoluciÃ³n canciÃ³nâ†’Ã¡lbumes en `searchCatalog`

- [x] 3.1 Extraer tipo `CatalogSongContext` (recordingId, mbid, title, artistName, albums[]) con
      orden/dedupe/excluidos de `results`/techo de 12 (design D5).
- [x] 3.2 Pata local: coincidencia `recording.title ILIKE` con apariciones â†’ contexto sin llamar
      a MusicBrainz (solo si el filtro de relevancia D4 pasa sobre el tÃ­tulo local).
- [x] 3.3 Pata frÃ­a: top-1 de `searchRecording` + filtro de contenciÃ³n de tÃ­tulo D4 +
      `browseReleasesByRecording` â†’ `findOrIngestRecording` â†’ contexto en vivo; fallo de esta pata
      = omitir `songContext` sin afectar `results` ni el 502 existente.
- [x] 3.4 Cambiar la firma de `searchCatalog` a `{ results, songContext? }`; actualizar route
      handler `api/catalog/search` (json `{ results, songContext }`) y page `/search`.
- [x] 3.5 Tests de `search-catalog.test.ts`: artista+canciÃ³n en frÃ­o, canciÃ³n local cacheada,
      candidato rechazado por relevancia, fallo de la pata recording degrada a bÃºsqueda actual,
      dedupe de releases por release_group y exclusiÃ³n de Ã¡lbumes ya presentes en `results`.

## 4. Frontend

- [x] 4.1 `src/lib/api/schemas.ts`: `CatalogSongContextAlbumSchema` +
      `CatalogSongContextSchema`; `CatalogSearchResponseSchema` con `songContext` opcional;
      re-exportar tipos.
- [x] 4.2 `src/lib/api/catalog.ts` (`searchCatalog` cliente): propagar `songContext` si la pÃ¡gina
      o algÃºn componente lo consume vÃ­a API (adaptar tipo de retorno).
- [x] 4.3 `SearchResults.tsx`: secciÃ³n contextual "Ãlbumes que contienen Â«tÃ­tuloÂ»" sobre las
      pestaÃ±as, filas de Ã¡lbum reutilizando el render existente con `LazyCoverImage`; accesible
      (heading de secciÃ³n).
- [x] 4.4 Mensajes i18n en `catalog` (es/en): tÃ­tulo de la secciÃ³n con interpolaciÃ³n; verificar
      coherencia con `src/test/messages.*.test.ts`.

## 5. DocumentaciÃ³n

- [x] 5.1 `docs/04-api/contracts.md`: documentar `songContext` (forma, opcionalidad, lÃ­mites:
      top-1, 100 releases/12 Ã¡lbumes, presupuesto de requests, exclusiÃ³n de duplicates).
- [x] 5.2 `docs/02-architecture/code-walkthrough.md`: nuevos mÃ©todos del cliente,
      `ingest-recording.ts`, flujo extendido de bÃºsqueda.
- [x] 5.3 `docs/00-product/roadmap.md`: nota en "Diferidos de bÃºsqueda" â€” D2 resuelto en parte
      (existe `findOrIngestRecording`; la canciÃ³n resuelve a Ã¡lbumes; pestaÃ±a Canciones sigue
      diferida por decisiÃ³n de producto).

## 6. VerificaciÃ³n

- [x] 6.1 Smoke test `scripts/smoke-test-recording-search.ts` (patrÃ³n de
      `assert-smoke-allowed`, fetch mockeado, BD de scratch): alta en frÃ­o + idempotencia +
      cero escrituras a release/track + limpieza de fixtures al terminar.
- [x] 6.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` en verde.
- [x] 6.3 `openspec validate add-recording-album-search` OK.

## 7. Corrección post-validación con datos reales (Sabrina Carpenter taste)

- [x] 7.1 Hint de artista desde los candidatos ya reconocidos en la búsqueda -> query estructurada `"<canción>" AND artist:"<artista>"` (los bootlegs homónimos puntuaban 100 por texto libre).
- [x] 7.2 Filtro de título con tope de 2 tokens extra (rechaza "sabrina carpenter - taste (dudda bootleg)" ante "taste").
- [x] 7.3 Recorrido del clúster de duplicados (tope 4 browses, corte ante dominante >=10) eligiendo por `release-count`: la grabación canónica no es la primera del lote.
- [x] 7.4 Sincronizar design.md (D2/D4/riesgos), deltas de specs, proposal y docs/04-api/contracts.md con la selección corregida.

## 8. Corrección Led Zeppelin Stairway to Heaven (2026-09-06)

- [x] 8.1 Descubrimiento por `rgid:`: con hint de artista, la búsqueda de recordings se acota a sus release-groups propios (créditos locales o browse de discografía) — `artist:""`/`arid:` descartados empíricamente (covers con el nombre literal acreditado; la grabación de estudio de Stairway no tiene artist-credit).
- [x] 8.2 Lista de rgids ordenada por categoría (estudio primero) antes del tope 120 — el corte arbitrario en orden de uuid dejaba fuera [Led Zeppelin IV] / Short n' Sweet.
- [x] 8.3 Umbral de candidato dominante 10 -> 50: la versión live de Stairway (18 apariciones) ganaba antes de explorar la de estudio (195).
- [x] 8.4 Tests unitarios de las tres reglas + verificación E2E real (ambos casos correctos) + smoke en verde.
- [x] 8.5 Sincronizar design.md (D2/D4), deltas de specs, contracts.md y proposal.

## 9. Unión de apariciones (Opción A aprobada 2026-09-06)

- [x] 9.1 Clúster = primeros 4 candidatos relevantes (el crédito deja de separar versiones; sin corte por dominante); browse de cada uno (cacheado por mbid) y UNIÓN de release-groups deduplicada conservando el año mínimo.
- [x] 9.2 La pata local deja de ser camino exclusivo: sus apariciones se fusionan como fuente más (rescatan grupos truncados por la página de 100); si MusicBrainz falla, la sección degrada a solo-apariciones locales explícitamente.
- [x] 9.3 Identidad del contexto (recordingId/title/artistName) = la contribución de mayor release-count; la ingesta de grabación sigue siendo UNA por búsqueda (solo la ganadora).
- [x] 9.4 Tests: unión cross-candidatos, merge local+cold, fallback MB-caído a local, identidad por count; smoke test con unión de 2 recordings.
- [x] 9.5 Sincronizar design (D4/D5), delta catalog-search (escenario "la sección no encoge"), contracts.md.
