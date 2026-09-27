## 1. Esquema: retirar las variantes muertas

- [x] 1.1 Crear `drizzle/0052_drop_recording_variant.sql`: bloque `DO` que aborta si alguna grabación tiene `variant_type <> 'original'` o `variant_of_id` no nulo; después `DROP INDEX idx_recording_variant_of`, los dos `CHECK` de variante y las columnas `variant_type` y `variant_of_id`
- [x] 1.2 Quitar `variantType`, `variantOfId`, su índice y su `CHECK` de `src/db/schema.ts`; corregir fixtures de tests que los incluyen
- [x] 1.3 Actualizar `docs/03-data/sql-model.md` (columnas y restricciones retiradas, la obra como vínculo entre versiones)
- [x] 1.4 Aplicar la migración en la base de scratch y verificar que el bloque `DO` pasa (verificada el 2026-09-27; a pedido del usuario se revirtió en scratch — columnas recreadas y `0052` desregistrada — porque el checkout principal comparte esa base; se vuelve a aplicar al integrar)

## 1b. Clasificación de tipo de disco (design D13)

- [x] 1b.1 `mapReleaseGroupCategory`: `studio` solo para `Album` sin tipos secundarios; cualquier otro tipo secundario (salvo `Compilation`/`Live`) a `live_other`; tests en `mappers.test.ts`
- [x] 1b.2 Ajustar `CATEGORY_CLAUSE` en `search/mb-query.ts` con la lista explícita de tipos secundarios; tests
- [x] 1b.3 Crear `scripts/backfill-release-group-category.ts` (`--dry-run`, `--limit`): paso por artista sincronizado y paso por disco `studio` no cubierto; solo escribe categorías que cambian; reporta los cambios
- [x] 1b.4 Correr el script en la base de scratch (primero `--dry-run`) y verificar que "Studio Demos" pasa a `live_other` y que *Use Your Illusion I* sigue en `studio`
- [x] 1b.5 Documentar el script en `docs/` (scripts operativos del catálogo) y la regla en `code-walkthrough.md`

## 2. Versiones por obra (servicio)

- [x] 2.1 Crear `src/services/catalog/recording-versions.ts` con la función pura `compareDiscs` (estudio primero, fecha de primer lanzamiento ascendente con nulos al final, id) y tests
- [x] 2.2 Implementar la lectura en lote de `versionAttributes` (unión ordenada y sin repetidos de los atributos de `recording_work`) para un conjunto de grabaciones, con tests
- [x] 2.3 Implementar la resolución en lote de la grabación original por obra (sin `live` ni `cover`, mejor disco según `compareDiscs`, sin original si ninguna califica), en una consulta, con tests
- [x] 2.4 Implementar la función pura `groupVersions` (covers / live / others, orden por disco más temprano, excluida la grabación actual) y la lectura `getRecordingVersions(recordingId)` con título, artista principal, duración, atributos y disco más temprano de cada grabación; tests
- [x] 2.5 Medir en la base de scratch la obra con más grabaciones y aplicar el corte por grupo (200 con "y N más") solo si hace falta (medido 2026-09-27: la obra más grande de scratch tiene 47 grabaciones — "Stairway to Heaven", "Welcome to the Jungle"; no hace falta corte)

## 3. Contratos y álbum: de `variantType` a `versionAttributes`

- [x] 3.1 `album-detail.ts`: reemplazar `variantType` / `variantOf` de cada pista por `versionAttributes` y `versionOf` (original de la obra cuando hay `live` o `cover` y es otra grabación), usando las lecturas en lote de 2.2 y 2.3; actualizar tests
- [x] 3.2 `album-editions.ts`: pistas adicionales con `versionAttributes`; actualizar tests del servicio y del endpoint de pistas adicionales
- [x] 3.3 Actualizar `src/lib/api/schemas.ts` (pistas adicionales y grabación; la respuesta del álbum no cambia) y los tests de las rutas `release-group/[id]` y `recording/[id]`
- [x] 3.4 `TrackList` y `EditionExtraTracks`: una etiqueta traducida por atributo (texto de MusicBrainz si no hay traducción) y enlace "versión de X" desde `versionOf`; tests
- [x] 3.5 Mensajes `catalog` en `es` y `en`: atributos de versión (`live`, `cover`, `instrumental`, `medley`, `partial`, …); la prueba de paridad de claves pasa
- [x] 3.6 Actualizar `docs/04-api/contracts.md` (tres respuestas; **BREAKING** marcado)

## 4. Read-model de la canción

- [x] 4.1 Extender `getRecordingDetail`: artistas principales con `joinPhrase`, discos que contienen la grabación (una vez por release-group, con categoría, año y carátula), disco principal (regla de D3), primera aparición y `versionAttributes`; tests
- [x] 4.2 Función pura `groupAppearances` (grupos por tipo de disco en orden fijo, marca "original" en el más temprano, 3 visibles + "+N"); tests
- [x] 4.3 Tira de pistas: leer la lista de la edición representativa del disco principal y devolver posición, total, anterior y siguiente cruzando discos, o nada si la grabación no está; tests
- [x] 4.4 Línea de versión: original de la obra de la grabación cuando sus atributos incluyen `live` o `cover` y es otra grabación; tests
- [x] 4.5 Exportar `schedulePersonnelSync` (o equivalente) de `album-detail.ts` y programarla desde la canción para la release representativa del disco principal cuando falten créditos o autoría; test de que no se agenda si ya está sincronizada
- [x] 4.6 Actualizar la respuesta de `GET /api/catalog/recording/[id]` según 3.3

## 5. Créditos y comunidad de la canción

- [x] 5.1 `getRecordingCredits(recordingId, principalReleaseGroupId)`: `groupCreditsByTrack` con los créditos de la grabación y su autoría, integrantes marcados con las pertenencias de los artistas principales, y bandera de créditos de nivel edición del disco principal; tests
- [x] 5.2 Crear `src/services/catalog/song-community.ts`: media con umbral (sin histograma), reacción predominante con umbral de 5 sobre entradas `public`, favoritas por personas distintas con `thresholdCount` y conteo de listas visibles (generalizar el del álbum por tipo de objetivo); tests

## 6. Panel "Tu relación" de la canción

- [x] 6.1 Generalizar `AlbumListPicker` para recibir el objetivo `{ type, id }` y filtrar por tipo de entidad de lista; mantener el comportamiento y los tests del álbum
- [x] 6.2 Crear `src/components/song/SongRelationPanel.tsx`: estados anónimo / sin interacción / con interacción; Nota con `StarRatingInput` y `RatingDetailDialog`; Escuchas con `ListenEntryForm` y la línea "N escuchas · última: reacción, fecha" con enlace al diario; Favorita; Listas; áreas táctiles de 40 px en móvil
- [x] 6.3 Servicio de estado personal de la canción (valoración, escuchas con la última reacción, favorito, listas propias que la contienen); tests
- [x] 6.4 Tests del panel: valorar, error al guardar, registrar escucha con reacción, favorito, selector de listas, anónimo

## 7. Página de canción

- [x] 7.1 Crear `song/[id]/song-data.ts` con loaders `cache()` compartidos por la página y `generateMetadata`
- [x] 7.2 Componentes en `src/components/song/`: cabecera (carátula ≤250 px, antetítulo, título, artistas, ficha técnica, bloque de comunidad con resumen en una línea en móvil), tira de pistas, Composición, Créditos de esta grabación, "Esta grabación aparece en", "Otras versiones de la canción" (grupos contraídos, estado local)
- [x] 7.3 Reescribir `song/[id]/page.tsx` con las zonas y el orden de `song-page-layout`, migas con el disco principal y comentarios al final; ninguna zona vacía se renderiza
- [x] 7.4 Retirar `SongSections.tsx`, `SongStarDisclosure` y sus mensajes si no quedan usos; actualizar `loading.tsx`
- [x] 7.5 Mensajes `catalog.song.*` en `es` y `en` (voseo, sin posesivo en las filas del panel)
- [x] 7.6 Tests de la página: canción completa, sin créditos ni versiones, versión en vivo con línea de versión, anónimo, tira ausente, grupos de discos

## 8. Documentación

- [x] 8.1 ADR `docs/02-architecture/adr/0020-versiones-por-obra.md` (página por grabación, obra como familia, retiro de `variant_type`, regla de disco principal y original)
- [x] 8.2 `docs/05-features/catalog-browsing.md`: reescribir la sección 3b y los casos límite de versiones
- [x] 8.3 `docs/00-product/content-hierarchy.md`: rating de canción visible en el panel; `docs/01-domain/domain-model.md` y `business-rules.md`: la obra conecta las versiones
- [x] 8.4 `docs/02-architecture/code-walkthrough.md`: servicios nuevos (`recording-versions.ts`, `song-community.ts`) y componentes de canción

## 9. Verificación

- [x] 9.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 9.2 Smoke tests de catálogo relevantes contra la base de scratch (`ALLOW_SMOKE_ON_REAL_DB=1`), con limpieza de fixtures
- [x] 9.3 Verificar en el navegador con datos reales: canción de estudio con muchas versiones, versión en vivo, cover, canción sin obra, recorrido con la tira de pistas, escritorio y móvil sin desbordamiento
- [ ] 9.4 Al archivar: reescribir el `## Purpose` de `openspec/specs/catalog-song/spec.md` (ya no es una página mínima)
