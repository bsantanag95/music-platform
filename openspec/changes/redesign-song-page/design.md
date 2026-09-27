## Context

La página de canción (`src/app/[locale]/(catalog)/song/[id]/page.tsx`) es la versión mínima
de `rebalance-catalog-detail-pages`: secciones apiladas de `SongSections.tsx`, cinco botones
sueltos, estrellas tras una divulgación (`SongStarDisclosure`) y una ficha técnica plegada.
El álbum ya es una ficha de biblioteca (`redesign-album-page`, `rework-album-relation-panel`,
`rework-album-tracklist`, `album-credits-by-song`, `add-songwriter-credits`) y dejó piezas
reutilizables: el panel "Tu relación" y sus controles (`StarRatingInput`,
`RatingDetailDialog`, `AlbumListPicker`, `ListenEntryForm`), los agregados con umbral
(`album-community-shared.ts`), los créditos por pista (`groupCreditsByTrack`,
`getRecordingSongwriters`) y los loaders cacheados (`album-data.ts`).

Datos medidos en la base de scratch (2026-09-27):

- `recording.variant_type` es `original` en las 21 372 grabaciones y `variant_of_id` es nulo
  en todas: ningún código las escribe. En la base real, 14 101 grabaciones, igual.
- `recording_work` cubre 11 896 grabaciones (56 %). Atributos: `[]` 6 766, `[live]` 3 300,
  `[cover]` 1 340, `[cover, live]` 336, `[cover, instrumental]` 108, `medley`, `partial`…
- La obra "November Rain" reúne 37 grabaciones: la de estudio (en 12 discos: 1 de estudio, 2
  singles, 9 recopilaciones), 16 `live`, 4 `cover` y ~16 sin atributos (demos de 1986,
  en vivo sin marcar, masters de recopilaciones).

Decisiones de producto ya tomadas con el usuario: ficha compacta sin pestañas (opción B);
estrellas visibles en el panel y reacción en el diario; sin reseñas de canción; tira de
pistas; página por grabación con la obra como familia (opción A); retirar `variant_type` y
`variant_of_id`; disco principal = primer disco de estudio, si no el más temprano; las
grabaciones sin marca van a "Otras grabaciones" sin deducir su tipo; historial en el panel.

## Goals / Non-Goals

**Goals:**

- Ficha de canción coherente con el álbum, reutilizando sus componentes y servicios.
- Una sola fuente de verdad para "qué versión es" (atributos del vínculo con la obra),
  compartida por la canción, la lista de canciones del álbum y las pistas adicionales.
- Toda la página se sirve con consultas de lectura sobre la base propia.

**Non-Goals:**

- Páginas por obra, fusión de versiones o migración de estrellas, diario o favoritos.
- Requests nuevas a MusicBrainz (por ejemplo, todas las grabaciones de una obra).
- Reseñas de canción, "Pendiente" para canciones, letras.
- Página de artista.

## Decisions

### D1. Página por grabación; la obra es la familia

Cada grabación conserva su página, y la obra conecta sus versiones. Estrellas, diario,
favoritos, listas y comentarios ya apuntan a `recording`; una página por obra obligaría a
migrar todo lo social y mezclaría en una misma valoración una toma en vivo de 14 minutos con
la de estudio. **Alternativa descartada:** página por obra con las versiones adentro.

### D2. Retirar `variant_type` / `variant_of_id` y derivar `versionAttributes` al leer

Migración `drizzle/0052_drop_recording_variant.sql`: un bloque `DO` que aborta si alguna fila
tiene `variant_type <> 'original'` o `variant_of_id` no nulo (protección: no se pierde
ningún dato real), y después `DROP INDEX idx_recording_variant_of`, los dos `CHECK` y las dos
columnas. Espejo en `schema.ts` y en `sql-model.md`.

`versionAttributes` se calcula al leer: `array_agg(DISTINCT attr ORDER BY attr)` sobre
`unnest(recording_work.attributes)` de la grabación. **Alternativas descartadas:** completar
las columnas con una heurística y un backfill (duplica el dato de la obra y exige mantenerlo
sincronizado), o una columna materializada nueva (mismo problema, sin beneficio medible: la
lectura usa la PK de `recording_work`).

### D3. Disco principal y grabación original: una misma regla de orden

Ambas reglas ordenan discos por `(category = 'studio') DESC, first_release_date ASC NULLS
LAST, release_group.id`. Se implementan como SQL de lectura en un servicio nuevo
`src/services/catalog/recording-versions.ts`:

- **Disco principal** de una grabación: `DISTINCT ON` sobre los release-groups que la
  contienen vía `track → release → release_group`, con ese orden.
- **Original de una obra**: entre las grabaciones de la obra cuyos atributos no incluyen
  `live` ni `cover`, la de mejor disco según el mismo orden (primer disco de estudio más
  temprano, si no el más temprano). Para la lista de canciones del álbum se resuelve en lote
  para todas las obras del álbum con `DISTINCT ON (work_id)`, en una consulta.

Una función pura `compareDiscs` define el orden para los tests y para desempatar en memoria.

### D4. "Esta grabación aparece en" y "Otras versiones": lectura + agrupación pura

- **Apariciones**: extiende `getRecordingDetail` (ya une `track → release → release_group`)
  para devolver cada release-group una vez con `category`, año y carátula; la agrupación
  por tipo de disco, la marca "original" (más temprano) y el corte "3 + N" son una función
  pura `groupAppearances`.
- **Otras versiones**: una consulta trae las grabaciones que comparten obra (excluida la
  actual) con sus atributos, artista principal, duración y su disco más temprano; una
  función pura `groupVersions` las reparte en `covers` / `live` / `others` según D2 y las
  ordena por fecha del disco. Todo se envía renderizado desde el servidor; desplegar un
  grupo es estado local del cliente (sin requests).

### D5. Tira de pistas desde la edición representativa del disco principal

Se lee la lista de canciones de la release `is_representative` del disco principal
(`disc_number, position`), se ubica la grabación y se toman la anterior y la siguiente en el
orden global (cruzando discos). La numeración visible sigue la del álbum (`disco-pista` en
discos múltiples). Si la grabación no está en esa lista, no hay tira. No se usa el disco
desde el que llegó la persona (decisión de producto: sin parámetro de contexto).

### D6. Créditos: reutilizar la vista por canción del álbum

Los créditos de la grabación se leen de `personnel_credit.recording_id` y la autoría con
`loadSongwriterRows`; `groupCreditsByTrack(credits, [{ recordingId }], songwriters)` devuelve
los mismos grupos que la vista por canción del álbum (Composición, Producción, Intérpretes,
Sonido, Otros). Composición se muestra como bloque propio; el resto en "Créditos de esta
grabación". Los integrantes se destacan con el mismo conjunto de pertenencias que usa
`getAlbumPersonnel` para los artistas principales. Si la release representativa del disco
principal tiene créditos de nivel edición, se muestra un enlace "Créditos de todo el disco"
a `/album/{id}/credits` en lugar de repetirlos.

### D7. Sincronización en segundo plano desde la canción

Créditos y autoría se ingieren por disco (`personnel_synced_at`, `works_synced_at`), hoy solo
al visitar el álbum. Si alguien llega a la canción desde la búsqueda sin pasar por el
álbum, la página los programa con `after()` para la release representativa del disco
principal, reutilizando las mismas funciones y locks de `album-detail.ts`. La página del
primer visitante se muestra sin esos datos y la siguiente ya los trae, como en el álbum.
**Alternativa descartada:** sincronizar en la request (bloquearía la página con las
requests a MusicBrainz).

### D8. Comunidad: servicio nuevo sobre las piezas del álbum

`src/services/catalog/song-community.ts` reutiliza `thresholdCount`, `summarizeRatings` (sin
histograma) y `getRecordingReactionSummary` (con umbral de 5 para la predominante), cuenta
favoritas por personas distintas de cualquier audiencia y reutiliza el conteo de listas
visibles del álbum generalizado por tipo de objetivo. El enlace de listas apunta a la
subpágina existente `/song/{id}/lists`.

### D9. Panel: componentes del álbum generalizados, panel propio

`SongRelationPanel` (cliente) compone `StarRatingInput`, `RatingDetailDialog`,
`ListenEntryForm` y el conmutador de favoritos. `AlbumListPicker` pasa a recibir el objetivo
`{ type, id }` (hoy fija `release-group`) y filtra las listas por tipo de entidad; se evalúa
renombrarlo a `ListPicker` si el diff queda chico. No se generaliza `AlbumRelationPanel`:
sus filas de colección, Pendiente y reseña no aplican y el panel de canción es corto.

### D10. Ruta y carga

Una sola página `song/[id]/page.tsx` con loaders cacheados en `song/[id]/song-data.ts`
(`cache()`, como `album-data.ts`) compartidos con `generateMetadata`. Se retiran
`SongSections.tsx` y `SongStarDisclosure` si no quedan usos. La subpágina `lists` se
mantiene. Componentes nuevos en `src/components/song/`.

### D11. Contratos

`variantType` sale de `GET /api/catalog/recording/[id]` y de las pistas adicionales; entra
`versionAttributes: string[]` (las pistas adicionales suman también `versionOf`). `GET
/api/catalog/release-group/[id]` **no cambia**: nunca expuso los datos de variante (el route
los descarta y un test lo asegura); `versionAttributes` y `versionOf` (hoy `variantOf`) viven
solo en el read-model de la página (`AlbumTrack`). Se actualizan `schemas.ts` y
`contracts.md`. Los únicos consumidores son la propia interfaz.

### D12. Documentación

ADR nuevo `0020-versiones-por-obra.md` (D1, D2, D3). Actualizar `sql-model.md`,
`contracts.md`, `catalog-browsing.md` (sección 3b y casos límite), `content-hierarchy.md`
(rating de canción visible en el panel), `domain-model.md` y `business-rules.md` (la obra
conecta las versiones; una versión sigue siendo una canción distinta).

### D13. Clasificación de discos: un `Album` con tipos secundarios no es de estudio

Hallazgo al implementar D3: `mapReleaseGroupCategory` solo excluía `Compilation` y `Live`,
así que un `Album` con `Demo`, `Remix`, `DJ-mix`, `Mixtape/Street`, `Soundtrack`,
`Spokenword`, `Interview`, `Audiobook`, `Audio drama` o `Field recording` quedaba como
`studio`. Verificado con "Studio Demos" (1986, `Official`, `Album` + `Demo`): la regla de
original elegía el demo antes que *Use Your Illusion I*. Nueva regla: `studio` solo para
`Album` **sin** tipos secundarios; cualquier otro tipo secundario (salvo `Compilation`, que
sigue siendo `compilation`) va a `live_other`. Singles y EP no cambian. Las cláusulas de
búsqueda por categoría (`mb-query.ts`) se ajustan con la lista explícita de tipos
secundarios; siguen siendo una aproximación que se refiltra localmente.

No guardamos los tipos secundarios, así que los discos existentes se reclasifican con
`scripts/backfill-release-group-category.ts` (`--dry-run`, `--limit`): primero una request por
artista con discografía sincronizada (`browseReleaseGroupsByArtist` trae los tipos de todos
sus discos); después, para los discos `studio` que ese paso no cubrió (stubs de apariciones),
una request por disco (`browseReleasesByReleaseGroup` trae los tipos del grupo). Solo se
actualiza `category`; el error solo podía clasificar de más como `studio`, así que el segundo
paso se limita a esos. **Alternativas descartadas:** guardar los tipos secundarios en una
columna nueva (más esquema sin un uso adicional hoy) o excluir los discos sin ediciones
oficiales (el demo del ejemplo es `Official`).

## Risks / Trade-offs

- [Soundtracks y remixes de un artista dejan "Álbumes de estudio"] → es lo que dice
  MusicBrainz; aparecen en "En vivo y otros" de la discografía.
- [Script con cientos de requests] → usa el cliente con rate limit, reanudable con `--limit`,
  y solo escribe filas cuya categoría cambia.

- [Cobertura de obras del 56 %] → sin obra no hay versiones ni línea "Versión de…"; la
  página no muestra bloques vacíos. La cobertura sube a medida que se visitan discos (D7).
- ["Otras grabaciones" ruidoso: en vivo sin marca, masters de recopilaciones] → es la
  decisión explícita de no adivinar; el grupo va contraído y cada fila muestra disco y año.
- [Obras muy populares con cientos de grabaciones] → la consulta usa
  `idx_recording_work_work` y `idx_track_recording`; si una obra supera 200 grabaciones se
  corta cada grupo en 200 con "y N más" (verificar en la base de scratch con la obra más
  grande antes de cerrar).
- [Migración irreversible por diseño] → el bloque `DO` garantiza que no hay datos que
  perder; rollback = migración nueva que recrea las columnas con su default.
- [Cambio de contrato BREAKING] → solo lo consume la interfaz del mismo repo; se cambia en el
  mismo commit que los esquemas Zod.
- [Primer visitante sin créditos (D7)] → mismo comportamiento que el álbum.

## Migration Plan

1. Aplicar `0052` en la base de scratch, correr los smoke tests de catálogo y la suite.
2. Aplicar en la base real (`pnpm run db:migrate`).
3. Rollback: revertir el commit y agregar una migración que recree `variant_type` (default
   `original`) y `variant_of_id`; no hay datos que restaurar.

## Open Questions

- Ninguna bloqueante. El corte por grupo de D4 se confirma al medir la obra más grande.
