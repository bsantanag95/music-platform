## Context

Hoy la ingesta de un álbum (`findOrIngestTracklist` en
`src/services/catalog/ingest-release.ts`) hace dos requests a MusicBrainz:

1. `GET /release-group/{mbid}?inc=releases+media` → lista de ediciones para
   `pickRepresentativeRelease` y `first-release-date` del grupo.
2. `GET /release/{mbid}?inc=recordings+artist-credits` → tracklist de la edición elegida.

Y guarda **una sola** fila `release` por release-group: `findOrIngestTracklist` lee
`release WHERE release_group_id = ? LIMIT 1` sin orden, y `recanonicalize.ts` borra todas
las filas `release` del grupo para reemplazarlas.

Verificación contra la API pública de MusicBrainz (2026-09-24, *The Dark Side of the Moon*,
release-group `f5093c06-…`):

| Hecho | Resultado |
|---|---|
| Lookup `inc=releases+media` | 25 ediciones (orden aparente: fecha ascendente) |
| Browse `/release?release-group=` | `release-count` = 150; 100 por página |
| Browse `inc=labels+media+release-groups` | `label-info[]` (sello + `catalog-number`), `media[].format`, `media[].track-count`, país, estado, embalaje, desambiguación, y `release-group.first-release-date` |
| Oficiales por total de pistas | 9 (39), 10 (65), 20 (4), 30 (8), 74 / 152 / 193 (1 c/u) |
| `GET /release/{id}?inc=…+artist-rels+recording-level-rels` (LP GB 1973) | Nivel edición: 3 relaciones (diseño, fotografía). Nivel grabación: 148 (instrument 59, vocal 49, engineer 20, producer 10, mix 10), con `attributes` (`["percussion","tape"]`, `["assistant"]`) |

Consumidor: `redesign-album-page` (pestañas Créditos y Ediciones, fila Sello, pistas
adicionales en Canciones). Ese cambio oculta esas zonas mientras no haya datos, así que
este cambio puede implementarse antes o después.

## Goals / Non-Goals

**Goals:**

- Conocer **todas** las ediciones de un álbum y elegir la representativa entre todas.
- Guardar sello y número de catálogo por edición.
- Detectar variantes con pistas adicionales y traer su lista bajo demanda.
- Guardar todos los créditos de personal disponibles, sin requests extra.
- Poblar álbumes ya ingeridos sin romper el camino de lectura.

**Non-Goals:**

- Interfaz (la hace `redesign-album-page`).
- Créditos de composición y letra (nivel obra, `work-rels`: otro nivel de request).
- Páginas de sello, género, numeración de vinilo (`track.number`).
- Cambiar los criterios de `pickRepresentativeRelease`.
- Re-canonicalizar álbumes automáticamente desde el camino de lectura.

## Decisions

### D1. Browse paginado en lugar del lookup

`/release?release-group={mbid}&inc=labels+media+release-groups&limit=100&offset=…` es el
único endpoint que devuelve todas las ediciones; además trae los sellos y la
`first-release-date` del grupo (vía `release-group` embebido), así que el lookup deja de
hacer falta. Nuevo método del cliente `browseReleasesByReleaseGroup(mbid, offset)` (el
cliente sigue siendo el único punto de salida a MusicBrainz).

En la **primera ingesta** de un álbum las páginas se piden en el camino de la request,
hasta un tope de **5 páginas (500 ediciones)**: la edición representativa necesita el
conjunto completo para ser correcta. Álbumes con ≤ 100 ediciones (la gran mayoría) cuestan
lo mismo que hoy (browse + release = 2 requests); DSOTM cuesta 3. Por encima del tope se
elige entre las 500 primeras y se registra un aviso en el log.
*Descartado*: primera página en el camino y el resto en `after()` con re-canonicalización
posterior — la edición representativa podría cambiar bajo los pies del usuario (y con ella
la tracklist) entre dos visitas.

### D2. Resumen de ediciones en tablas propias

```
release_group 1 ─── n release_edition n ─── m label
                       (resumen MB)    via release_edition_label
                                           (catalog_number)
release_group 1 ─── n release            (ediciones con tracklist ingerida)
                       ↑ release.mbid = release_edition.mbid
```

- `release_edition`: una fila por edición de MusicBrainz — `mbid` único, `release_group_id`
  (cascade), `title`, `disambiguation`, `status`, `release_date` (DATE, solo precisión
  diaria) + `release_year` (SMALLINT, cualquier precisión; mismo patrón que
  `first_release_year`), `country`, `packaging`, `formats TEXT[]` (uno por disco, en orden),
  `medium_count`, `track_count` (nulo si MusicBrainz no lo informa), `updated_at` por
  trigger.
- `label`: `mbid` único, `name`. Tabla propia (no JSONB) porque los sellos son entidades
  con identidad propia en MusicBrainz y porque una página de sello es una evolución
  natural de la biblioteca.
- `release_edition_label`: `release_edition_id` (cascade), `label_id` (nullable),
  `catalog_number` (nullable), `CHECK (num_nonnulls(label_id, catalog_number) >= 1)`.
- `release_group.editions_synced_at`: `NULL` = pendiente de sincronizar.

*Descartado*: guardar el resumen en `release`. `release` significa "edición con tracklist
ingerida"; mezclar 150 filas sin pistas con la que sí tiene pistas obligaría a cada lectura
a distinguirlas.

### D3. Varias `release` por álbum, con representativa marcada en SQL

`release.is_representative BOOLEAN NOT NULL DEFAULT false` +
`CREATE UNIQUE INDEX … ON release (release_group_id) WHERE is_representative` (regla en
SQL, no solo en la app). La migración marca como representativas las filas existentes,
previa verificación de que ningún release-group tiene más de una (si las hay, la migración
falla con un mensaje explícito en lugar de elegir una arbitraria).

Lecturas afectadas:
- `findOrIngestTracklist` y `recanonicalize.ts`: filtran `is_representative`.
- `recanonicalize.ts`: si la nueva representativa ya existe como `release` (variante
  ingerida), **intercambia la marca** en una transacción en lugar de borrar y re-ingerir;
  si no existe, ingiere la nueva y desmarca la anterior (la anterior queda como edición
  no representativa: su tracklist sigue siendo válida).
- `recording-detail.ts` / `ingest-recording.ts` (apariciones de una canción): con variantes
  ingeridas, una canción bonus aparece en su álbum con la etiqueta de su edición — es el
  comportamiento deseado; los agregados por álbum ya usan `DISTINCT` por release-group.
- `search-catalog.ts` ("álbum con contenido"): cualquier `release` sirve; sin cambios.

*Descartado*: `release_group.representative_release_id` — referencia circular
release-group ↔ release, y "a lo sumo una" se expresa igual de bien con el índice parcial.

### D4. Sincronización de álbumes existentes, sin tocar la representativa

- **Camino de lectura**: si `editions_synced_at` es `NULL` y el álbum ya tiene
  representativa, la página agenda la sincronización con `after()` (mismo patrón que el
  espejo de carátulas). Upsert idempotente del resumen; marca la fecha al final. Un fallo
  no afecta la respuesta.
- **Concurrencia**: `pg_advisory_xact_lock` por release-group, releyendo la marca dentro de
  la transacción (patrón de `ensureArtistMemberships`).
- **Nunca cambia la representativa**: si la elección sobre el conjunto completo difiere de
  la ingerida, solo lo registra. Corregirla es tarea explícita de
  `scripts/recanonicalize-release-group.ts`.
- **Script** `scripts/backfill-release-editions.ts`: recorre los álbumes pendientes,
  `--dry-run`, `--limit`, y un modo `--report-representative` que lista los álbumes cuya
  representativa cambiaría.

### D5. Detección de variantes: función pura

`detectEditionVariants(editions, representative)` sobre las filas de `release_edition`:

1. Solo ediciones `Official` con `track_count` conocido.
2. **Recuento efectivo**: un SACD híbrido informa cada capa (CD, SACD 2 canales, SACD
   multicanal) como un disco con el mismo programa. Sin recuento por disco, se asume el
   programa repartido en partes iguales y se cuenta una sola capa.
3. **Candidata** si el recuento efectivo > el de la representativa. Menos pistas no es
   variante (ej.: las 39 ediciones de 9 pistas de DSOTM fusionan dos canciones).
4. **Caja** si el embalaje contiene "box", o `medium_count` ≥ 4, o `track_count` > 3× el de
   la representativa.
5. **Agrupación** por (`track_count`, formatos). De cada grupo se elige una edición con los
   mismos criterios de `pickRepresentativeRelease` (adaptador de `release_edition` a
   `MBReleaseSummary`).
6. **Salida** por variante: edición elegida, nombre (título si difiere del álbum, si no la
   **primera frase** de la desambiguación; fallback "Edición {año} · {formato}"), año,
   sellos, formatos, países de las ediciones del grupo, cantidad de ediciones,
   `estimatedExtraTracks` (= recuento efectivo − el de la representativa) e `isBox`.

**Corrección durante la implementación (datos reales de DSOTM):** la primera versión
agrupaba por nombre y contaba todas las pistas. Con las 150 ediciones reales eso daba 6
"variantes" de la misma edición del 30 aniversario (la desambiguación trae detalles de
prensado: "printed in EU, stars in matrix") y presentaba los SACD de 3 capas como +20
pistas. Con recuento efectivo y agrupación por formatos, DSOTM da una sola variante real
(Experience Edition: 4 ediciones de BR, GB, JP y US, +10) y 3 cajas.

Es pura y determinista (mismas entradas → misma salida, sin importar el orden), y se testea
con los recuentos reales de DSOTM como fixture.

### D6. Lista de una variante bajo demanda

`GET /api/catalog/release-group/{id}/editions/{editionId}/extra-tracks` (ids propios
UUID, ADR 0003):

- Si la edición no tiene `release` ingerida: `getRelease` (misma función de ingesta,
  parametrizada con `representative: false`) — 1 request la primera vez, luego desde la
  base.
- **Diferencia**: pistas cuya grabación no está en la lista de la representativa y cuyo
  título normalizado tampoco coincide con uno de la lista. La normalización **solo quita
  marcas de remasterización** ("2011 Remaster", "(Remastered)", "- Remastered 2003"),
  minúsculas y acentos; conserva "(Live)", "(Demo)", "(Remix)": una versión en vivo sí es
  una pista adicional.
- Respuesta: pistas adicionales con disco, posición, título, duración, `recordingId` y
  tipo de variante. Una caja responde `EDITION_IS_BOX` (la UI enlaza a MusicBrainz);
  errores y contrato en `docs/04-api/contracts.md` / `errors.md`. Envuelto en
  `withErrorHandling`.

### D7. Créditos de personal en la request existente

`getRelease` pasa a `inc=recordings+artist-credits+artist-rels+recording-level-rels`: sin
requests extra (respuesta más grande). Se toman solo las relaciones con
`target-type = artist`.

Tabla `personnel_credit`:
- `artist_id` (cascade), `release_id` **o** `recording_id` (cascade;
  `CHECK (num_nonnulls(release_id, recording_id) = 1)`, mismo patrón que `credit`).
- `relation_type TEXT NOT NULL` — el tipo de MusicBrainz tal cual (`instrument`, `vocal`,
  `producer`, `engineer`, `mix`, `design/illustration`, …).
- `attributes TEXT[] NOT NULL DEFAULT '{}'` — instrumentos y matices (`guitar`,
  `lead vocals`, `assistant`), ordenados para que la unicidad sea estable.
- `credited_as TEXT` — `target-credit` cuando difiere del nombre del artista.
- Unicidad por (artista, destino, tipo, atributos) con índices únicos parciales.
- `release.personnel_synced_at` (distinto de `credits_synced_at`, que ya significa
  créditos `primary`/`featured`).

Los créditos de nivel grabación se comparten entre todas las ediciones que usan esa
grabación (correcto: la misma toma, los mismos músicos). Los artistas que no existen se
crean como stub (`type = 'unknown'`), patrón vigente.

*Descartado*: extender `credit`. Su `role` y su unicidad (un crédito por artista y destino)
modelan la autoría visible, no el personal; un músico tiene varias relaciones por pista.

### D8. Clasificación en niveles: tabla fija en código

Se guardan todos los tipos. La clasificación es de lectura, en
`src/services/catalog/personnel-levels.ts`:

| Nivel | Regla |
|---|---|
| 1. Integrantes de la banda | Cualquier crédito de una persona que es miembro (`membership`) de algún artista principal del álbum, o que es ella misma un artista principal (solista: no es "invitado" en su propio disco) |
| 2. Músicos invitados | Tipos de intérprete (`instrument`, `vocal`, `performer`, `performing orchestra`, `conductor`, `chorus master`, `concertmaster`) de no miembros |
| 3. Producción y sonido | `producer`, `engineer`, `audio`, `sound`, `recording`, `mix`, `mastering`, `programming`, `editor`, `balance` |
| 4. Arte y otros | Todo lo demás, incluidos tipos desconocidos |

Salida por persona: nivel más alto que le corresponde, todos sus roles, pistas en que
participa (o "todas"). Una persona aparece una sola vez.

Integrante = miembro del artista principal según `membership`, sin mirar fechas (las
fechas de pertenencia casi nunca están: `normalizeReleaseDate` descarta las parciales).
Por eso la sincronización de créditos llama a `ensureArtistMemberships` de los artistas
principales del álbum: sin eso, los integrantes aparecerían como invitados.

### D9. Sincronización de créditos de álbumes existentes

Igual que D4: `after()` en la página si la representativa tiene `personnel_synced_at`
nulo, con lock por release; reemplazo en transacción (borra y re-inserta los créditos de
personal de la edición y de sus grabaciones); marca al final. Script
`scripts/backfill-personnel-credits.ts` con `--dry-run` y `--limit`. Cuesta 1 request por
álbum (el `getRelease` ampliado).

## Risks / Trade-offs

- **[Latencia de la primera visita]** Álbumes con cientos de ediciones suman 1,1 s por
  página. → Tope de 5 páginas; la gran mayoría de los álbumes cabe en una página.
- **[Migración con duplicados]** Si algún release-group tiene hoy más de una `release`, el
  índice parcial no se puede crear. → La migración verifica antes y falla con mensaje;
  inspección previa en la BD de scratch.
- **[Lecturas que asumen una edición]** Cualquier consulta que tome "la release del álbum"
  sin filtrar puede leer una variante. → Revisar todas las lecturas de `release` (lista en
  D3) y cubrir con tests el caso "álbum con variante ingerida".
- **[Falsos positivos de pistas adicionales]** Remasters registrados como grabaciones
  nuevas. → Comparación por título normalizado limitada a marcas de remasterización.
- **[Crecimiento de datos]** ~150 filas de personal y hasta cientos de ediciones por álbum
  popular. → Volumen trivial para Postgres; índices por release-group y por destino.
- **[Cobertura desigual]** Muchos discos no tienen créditos en MusicBrainz. → La interfaz
  oculta la pestaña; no se rellena con datos aproximados.
- **[Smoke tests]** Escriben fixtures en la BD. → Solo contra BD de scratch
  (`ALLOW_SMOKE_ON_REAL_DB=1` + otro `DATABASE_URL`), y limpieza documentada en `AGENTS.md`.
- **[Licencia]** Sellos, números de catálogo y relaciones son datos centrales de
  MusicBrainz (CC0); anotaciones no se usan. → Dejarlo explícito en
  `docs/03-data/data-licensing.md`.

## Migration Plan

1. Inspeccionar en scratch: release-groups con más de una `release` (debería ser 0).
2. Migración `0048`: tablas nuevas, columnas, índice parcial, marca de representativas.
3. Desplegar código (lecturas filtran `is_representative`; ingesta nueva).
4. Backfills en lotes (`--limit`), primero ediciones, después créditos; revisar el reporte
   de representativas que cambiarían y re-canonicalizar a mano los casos que lo ameriten.
5. **Rollback**: las tablas nuevas son aditivas; el código anterior sigue funcionando
   mientras cada álbum tenga una sola `release`. Si ya se ingirieron variantes, borrar las
   `release` con `is_representative = false` antes de volver atrás.

## Open Questions

- **Tope de páginas**: ¿5 (500 ediciones) es razonable, o conviene medirlo antes?
- **Apariciones de una canción**: ¿la página de canción debe listar la edición de una
  variante ("Experience Edition") o solo el álbum? Afecta a `catalog-song`, no a este
  cambio; se decide con el rediseño de Canción.
- **Traducción de roles e instrumentos**: los tipos y atributos se guardan en inglés, como
  los entrega MusicBrainz. La traducción (lista cerrada con fallback al texto original) es
  de interfaz y corresponde a `redesign-album-page`.
