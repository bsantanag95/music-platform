# Scripts de mantenimiento del catálogo

Scripts operativos, no parte del path de request. Todos requieren `DATABASE_URL` y salen a
MusicBrainz solo por el cliente único con rate limit (`src/services/musicbrainz/client.ts`).

## `scripts/recanonicalize-release-group.ts`

Reevalúa la **edición representativa** de release-groups ya ingeridos (openspec:
`canonicalize-release-group`) y repuebla su **fecha de lanzamiento canónica**
(`release_group.first_release_date` / `first_release_year`).

```bash
tsx --env-file=.env scripts/recanonicalize-release-group.ts --all --dry-run   # audita, no escribe
tsx --env-file=.env scripts/recanonicalize-release-group.ts --all             # aplica
tsx --env-file=.env scripts/recanonicalize-release-group.ts <id> [<id> ...]   # ids puntuales
```

**Cuándo correrlo:**

- Una vez tras desplegar `canonicalize-release-group`, para corregir álbumes ingeridos con
  la lógica vieja (`primera oficial o primera`), que podían quedar en una deluxe / remaster
  / edición regional, y para poblar la fecha canónica de las filas existentes.
- Puntualmente, cuando MusicBrainz mejora los datos de un álbum concreto o si se ajusta la
  función de ranking (`pickRepresentativeRelease`).

**Qué hace y qué no:** evalúa sobre **todas** las ediciones del grupo (browse paginado) y
también repuebla el resumen de ediciones. Si la edición representativa cambió, **mueve la
marca** `is_representative` (cambio `enrich-album-editions-and-credits`, ADR 0019): si la
nueva ya estaba ingerida como variante, solo intercambia la marca; si no, desmarca la anterior
—que queda como edición no representativa— e ingiere la nueva. No borra ediciones. **Nunca** toca `rating`, `favorite`, `comment`,
`listen_entry`, `user_list_item`, `user_pinned_item` ni `collection_entry` — todas
referencian el `release_group`, no la edición. La fecha canónica se repuebla siempre,
cambie o no la edición. `--all` recorre todos los grupos con `mbid` con una pausa de ~1,1 s
entre cada uno.

Los fallos son por ítem: un `mbid` inválido, un 404 de MusicBrainz o un `fetch failed`
transitorio se registran y el script sigue con el siguiente. Como la operación es
idempotente, re-correr el script (o pasar solo los ids que fallaron) retoma el trabajo.
Los datos sembrados (`scripts/seed-*.ts`) usan mbids ficticios y siempre darán 404 — es
esperado.

## `scripts/backfill-release-credits.ts`

Sincroniza los **créditos** (`feat.`) de las ediciones ya ingeridas cuyo
`release.credits_synced_at` es `NULL` (releases cacheados antes de la ingesta de créditos,
migración `0004`).

**Relación con el anterior:** son complementarios y no se pisan.
`recanonicalize-release-group` decide *qué edición* representa al álbum;
`backfill-release-credits` completa los créditos *de la edición ya elegida*. Tras correr
una re-canonicalización que reemplazó ediciones, conviene correr también el backfill de
créditos para las ediciones nuevas (la re-ingesta ya trae créditos, así que en la práctica
solo hace falta si el path de re-ingesta falló a mitad).

## `scripts/backfill-release-editions.ts`

Sincroniza el **resumen de ediciones** (todas las ediciones del álbum, con sello, número de
catálogo, formato y recuento de pistas) de los álbumes cuyo `release_group.editions_synced_at`
es `NULL` — los ingeridos antes del cambio `enrich-album-editions-and-credits`. La página de
álbum hace lo mismo en segundo plano en la primera visita; el script lo hace en lote.

```bash
tsx --env-file=.env scripts/backfill-release-editions.ts --limit 20 --dry-run --report-representative
tsx --env-file=.env scripts/backfill-release-editions.ts --report-representative
```

**Nunca cambia la edición representativa.** Con `--report-representative` lista los álbumes
cuya representativa sería otra con el conjunto completo de ediciones; se corrigen a mano, uno
por uno, con `recanonicalize-release-group.ts <id>`. Cuesta una request por cada 100
ediciones del álbum (tope de 5).

## `scripts/backfill-artist-discography.ts`

Completa las **discografías de artista** guardadas antes del cambio
`fix-artist-discography-ingestion` (`artist.discography_synced_at` con valor y
`discography_complete_at` en `NULL`): la ingesta anterior se cortaba en 100 release-groups y no
filtraba bootlegs. Recorre todas las páginas del browse sin bootlegs, guarda los tipos crudos de
MusicBrainz y marca `release_group.discography_unlisted_at` en los release-groups acreditados que
ya no vuelven (solo bootleg, fusionados o borrados en MusicBrainz), **sin borrarlos**. La página
de artista hace lo mismo en segundo plano en la próxima visita; el script lo hace en lote.

```bash
tsx --env-file=.env scripts/backfill-artist-discography.ts --limit 20 --dry-run
tsx --env-file=.env scripts/backfill-artist-discography.ts --artist <uuid>
tsx --env-file=.env scripts/backfill-artist-discography.ts
```

`--dry-run` informa, por artista, cuántos release-groups se guardarían, cuántos quedarían fuera
de la discografía y cuántos vuelven, sin escribir. `--artist <uuid>` procesa un solo artista
(se omite si su discografía está al día). Cuesta una request por cada 100 release-groups
oficiales (tope de 20). Con el tope alcanzado se informa `TOPE DE PÁGINAS` y no se marca nada.

## `scripts/backfill-artist-profile.ts`

Completa el **perfil de artista** (cambio `enrich-artist-profile`, ADR 0021) de los artistas con
`profile_synced_at` o `wikimedia_synced_at` en `NULL`: la ficha de MusicBrainz (país, lugares,
fechas, enlaces curados) y, solo si MusicBrainz declara la relación `wikidata`, la foto libre de
Commons con su crédito, la descripción corta, el resumen de Wikipedia (es, en) y el lugar de
nacimiento o formación. La página de artista hace lo mismo en segundo plano cada 30 días; el
script lo hace en lote.

```bash
tsx --env-file=.env scripts/backfill-artist-profile.ts --limit 20 --dry-run
tsx --env-file=.env scripts/backfill-artist-profile.ts --artist <uuid> --force
tsx --env-file=.env scripts/backfill-artist-profile.ts
```

Requiere `WIKIMEDIA_USER_AGENT` además de `MUSICBRAINZ_USER_AGENT`. Cuesta una request a
MusicBrainz y hasta cinco a Wikimedia por artista. Cada paso escribe por separado: si Wikimedia
falla, el artista conserva los datos anteriores y queda pendiente.

## Géneros (cambio `add-genre-taxonomy`, ADR 0023)

Tres scripts. La taxonomía vive versionada en `data/genres/taxonomy.json`; solo hace falta
regenerarla para tomar géneros nuevos de MusicBrainz (propuesta: trimestral o a pedido).

### `scripts/build-genre-taxonomy.ts` (offline, solo al actualizar la taxonomía)

Genera `data/genres/taxonomy.json` desde el **dump core** de MusicBrainz (CC0) y las etiquetas en
español de Wikidata (P8052), aplicando la curaduría de `data/genres/curation.ts` (familias,
huérfanos, descriptores, ocultos y nombres corregidos). No toca la base y no necesita
`DATABASE_URL`; requiere `WIKIMEDIA_USER_AGENT`.

```bash
# 1. Bajar mbdump.tar.bz2 (~7 GB) de https://data.metabrainz.org/pub/musicbrainz/data/fullexport/<LATEST>/
# 2. Extraer solo la marca y 4 tablas (tar con bzip2 viene en Linux, macOS y Windows 10+)
tar -xjf mbdump.tar.bz2 TIMESTAMP mbdump/genre mbdump/l_genre_genre mbdump/link mbdump/link_type
# 3. Generar (primero en simulación: imprime el reporte sin escribir)
tsx --env-file=.env scripts/build-genre-taxonomy.ts --dump <carpeta> --dry-run
tsx --env-file=.env scripts/build-genre-taxonomy.ts --dump <carpeta>
```

Falla sin escribir si la curaduría nombra un género que ya no existe (MusicBrainz lo renombró o
borró), si una familia principal queda vacía o si cambió la forma del dump. Conserva el slug de
cada MBID del archivo anterior. El reporte lista las raíces nuevas sin mapear (caen en "Del
mundo"). Revisar el diff de `taxonomy.json` (un género por línea), commitear y cargar.

### `scripts/load-genre-taxonomy.ts`

Aplica `data/genres/taxonomy.json` a la base: upsert por MBID solo de lo que cambió, relaciones
y pertenencias a familias por diferencia, y los géneros que ya no vienen en el archivo quedan
ocultos (no se borran). Idempotente. Correr después de `pnpm run db:migrate` (migración `0056`)
y cada vez que se regenera la taxonomía.

```bash
tsx --env-file=.env scripts/load-genre-taxonomy.ts
```

### `scripts/backfill-genre-seeds.ts`

Siembra los géneros (Wikidata P136) de los artistas y álbumes existentes. Correr después de cargar
la taxonomía. La página de artista y la sincronización de discografía hacen lo mismo en segundo
plano (vigencia de 30 días).

```bash
tsx --env-file=.env scripts/backfill-genre-seeds.ts --limit 20 --dry-run
tsx --env-file=.env scripts/backfill-genre-seeds.ts --artist <uuid>
tsx --env-file=.env scripts/backfill-genre-seeds.ts
```

Etapa 1: artistas con `wikidata_id`, sus entidades en lotes de 50 por request. Etapa 2: artistas con
discografía sincronizada; vuelve a recorrer el browse de MusicBrainz (una request cada 100
álbumes) para guardar la entidad de Wikidata de sus álbumes, y los siembra en lotes de 50.
`--skip-browse` omite el recorrido; `--force` ignora la vigencia. Requiere `MUSICBRAINZ_USER_AGENT` y
`WIKIMEDIA_USER_AGENT`. En simulación, la etapa 2 no ve las entidades nuevas (no se guardan).

## `scripts/takedown-artist-photo.ts`

**Retiro a pedido** de la foto de un artista: vacía la foto y su crédito y marca
`artist.photo_blocked_at`, así el enriquecimiento no se la vuelve a asignar. `--undo` quita la
marca y deja al artista pendiente de un nuevo enriquecimiento.

```bash
tsx --env-file=.env scripts/takedown-artist-photo.ts <artist-uuid>
tsx --env-file=.env scripts/takedown-artist-photo.ts <artist-uuid> --undo
```

## `scripts/backfill-personnel-credits.ts`

Sincroniza los **créditos de personal** (instrumentos, voz, producción, ingeniería, arte) de
las ediciones representativas cuyo `release.personnel_synced_at` es `NULL`, y las pertenencias
de la banda cuando todavía no se sincronizaron (sin ellas un integrante se clasificaría como
invitado). La página de álbum lo hace en segundo plano; el script, en lote.

```bash
tsx --env-file=.env scripts/backfill-personnel-credits.ts --limit 20 --dry-run
tsx --env-file=.env scripts/backfill-personnel-credits.ts
```

Una request por álbum (más una por banda sin pertenencias). Reemplaza los créditos de personal
de la edición y de sus grabaciones en una transacción: si falla, se conservan los anteriores y
el álbum queda pendiente.

## `scripts/backfill-release-group-category.ts`

Reclasifica los release-groups ya ingeridos con la regla de categoría vigente (cambio
`redesign-song-page`, ADR 0020): un `Album` de MusicBrainz con tipos secundarios (Demo, Remix,
DJ-mix, Mixtape/Street, Spokenword, Interview, Audiobook, Audio drama, Field recording) ya no es
`studio` sino `live_other`. Una banda sonora (`Soundtrack` solo) sigue siendo `studio`. Antes de la corrección, esos discos figuraban
entre los álbumes de estudio del artista y podían ganarle al disco original en las reglas de
disco principal y de grabación original de la página de canción.

```bash
tsx --env-file=.env scripts/backfill-release-group-category.ts --dry-run --limit 5
tsx --env-file=.env scripts/backfill-release-group-category.ts
```

No guardamos los tipos secundarios, así que el script los vuelve a pedir en dos pasos: una
request por cada 100 discos de cada artista con discografía sincronizada, y después una
request por cada disco `studio` que ningún artista cubrió (stubs de apariciones). Solo escribe
`category` en las filas que cambian y lista cada cambio. Las ingestas nuevas ya aplican la
regla (`mapReleaseGroupCategory`); el script se corre una vez por base.
