## 1. Migración y schema

- [x] 1.1 Escribir `drizzle/NNNN_release_group_canonical_date.sql`: `ALTER TABLE release_group ADD COLUMN first_release_date DATE`, `ADD COLUMN first_release_year SMALLINT`, `CREATE INDEX idx_release_group_first_year ON release_group (first_release_year)`
- [x] 1.2 Reflejar las columnas nuevas y el índice en `src/db/schema.ts` (`releaseGroup`) y actualizar el comentario de sincronización
- [x] 1.3 Correr la migración en local y verificar `\d release_group`

## 2. Tipos y cliente MusicBrainz

- [x] 2.1 Ampliar `MBReleaseGroupWithReleases` en `src/services/musicbrainz/types.ts`: `first-release-date?`, y por `release` los campos `status`, `date`, `country`/`release-events`, `packaging`, `disambiguation`, `title`, `media` (para `track-count`)
- [x] 2.2 Cambiar el `inc` de `getReleaseGroup` en `client.ts` a `releases+release-groups` con los subcampos necesarios; verificar contra una respuesta real que los campos llegan
- [x] 2.3 Anotar en un comentario qué subcampos NO llegan en el browse de release-group (para degradar el criterio 6 según D2)

## 3. Función de selección de edición representativa

- [x] 3.1 Crear `pickRepresentativeRelease(releases)` como función pura en `src/services/catalog/` (nuevo archivo, p. ej. `representative-release.ts`) con los 7 criterios ordenados del spec `album-edition-selection`
- [x] 3.2 Constante de marcadores de edición no estándar (`deluxe`, `expanded`, `anniversary`, `remaster`, `remastered`, `super deluxe`, `special edition`, …) junto a la función
- [x] 3.3 Helper `deriveEditionLabel(chosenRelease)`: `disambiguation` → sufijo de título → `"standard"`
- [x] 3.4 Tests con fixtures: original vs deluxe, sin ediciones oficiales, edición regional, orden de entrada indiferente (determinismo), grupo sin ediciones, empate resuelto por mbid
- [x] 3.5 Tests de `deriveEditionLabel` para los tres caminos

## 4. Ingesta

- [x] 4.1 `findOrIngestTracklist` (`ingest-release.ts`): reemplazar el `chosen = find(Official) ?? [0]` por `pickRepresentativeRelease`; usar `deriveEditionLabel` en vez de `"original"` fijo
- [x] 4.2 Poblar `release_group.first_release_date` / `first_release_year` desde `first-release-date` del grupo completo en `findOrIngestTracklist` (fuente autoritativa)
- [x] 4.3 Poblar fecha/año canónico en `upsertReleaseGroupStub` y `upsertReleaseGroupStubs` cuando la búsqueda trae `first-release-date` (sin sobrescribir un valor ya presente con uno nulo)
- [x] 4.4 Poblar fecha/año canónico en `ingest-discography.ts` al hacer upsert de release-groups de la discografía
- [x] 4.5 Ajustar/añadir tests de `ingest-release.test.ts` e `ingest-release-group.test.ts` para la edición elegida, el label y la fecha canónica

## 5. Read-model, API y contrato

- [x] 5.1 `getAlbumDetail` (`album-detail.ts`): incluir `category`, `firstReleaseDate`, `firstReleaseYear` del release-group en `AlbumDetail`; documentar que la fecha del álbum es la del grupo, no la de la edición
- [x] 5.2 `src/lib/api/schemas.ts`: añadir `firstReleaseDate` / `firstReleaseYear` a `ReleaseGroupSchema`; extender `ReleaseWithTracksSchema` con `category` + fecha canónica (o exponer el `releaseGroup` completo en la respuesta)
- [x] 5.3 `GET /api/catalog/release-group/[id]/route.ts`: incluir los campos nuevos en el JSON de respuesta
- [x] 5.4 Actualizar la documentación del endpoint en `docs/` (contrato REST) y marcar el cambio de `editionLabel`
- [x] 5.5 Tests del endpoint y del read-model para los campos nuevos y el escenario "fecha del álbum ≠ fecha de la edición"

## 6. UI — página de álbum

- [x] 6.1 Mensajes i18n en el namespace `album` (es/en): etiquetas de tipo de obra para `compilation`, `live_other`, `single_ep`
- [x] 6.2 Componente/badge de tipo de obra en la página de álbum (`src/app/[locale]/(catalog)/album/[id]` + `src/components/catalog`), oculto para `studio`
- [x] 6.3 Mostrar el año canónico del álbum en el encabezado; si solo hay año (sin fecha exacta), mostrar el año sin inventar mes/día
- [x] 6.4 Verificación visual en el navegador: álbum de estudio (sin badge), recopilación (con badge), álbum con reissue (año correcto), cambio de locale

## 7. UI — discografía de artista

- [x] 7.1 Ordenar las tarjetas por `first_release_year` ascendente dentro de cada categoría; grupos sin año al final con orden estable
- [x] 7.2 Mostrar el año en cada tarjeta de discografía cuando exista
- [x] 7.3 Tests del servicio de discografía (orden) y verificación visual

## 8. Script de re-canonicalización

- [x] 8.1 `recanonicalizeReleaseGroup(releaseGroupId, { dryRun })` en servicio: reevalúa con `pickRepresentativeRelease`, y si difiere reemplaza `release` + `track` en una transacción sin tocar tablas sociales
- [x] 8.2 `scripts/recanonicalize-release-group.ts`: acepta un id, lista de ids, o `--all` (por lotes, con pausa para el rate limit); `--dry-run` reporta sin escribir
- [x] 8.3 Fase de backfill de fecha/año canónico para release-groups existentes (en el mismo script o hermano)
- [x] 8.4 Test de `recanonicalizeReleaseGroup`: corrección real conserva ratings/escuchas/favoritos/listas/colección; re-canonicalización sin cambios no escribe; dry-run no escribe
- [x] 8.5 Nota en `docs/` sobre cuándo correr el script y su relación con `scripts/backfill-release-credits.ts`

## 9. Cierre

- [x] 9.1 `openspec validate canonicalize-release-group --strict` pasa
- [x] 9.2 `typecheck`, `lint`, `test`, `build` en verde
- [x] 9.3 Revisar que ningún consumidor hacía match exacto contra `editionLabel === "original"`
- [x] 9.4 Actualizar `openspec/specs/` vía `openspec archive` cuando el cambio esté implementado y aprobado
