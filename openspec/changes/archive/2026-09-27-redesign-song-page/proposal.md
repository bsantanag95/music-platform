## Why

La página de canción quedó como la dejó `rebalance-catalog-detail-pages`: una columna de
secciones y cinco botones apilados, con las estrellas escondidas detrás de "más" y los
créditos en una ficha plegada. Desde entonces el álbum se volvió una ficha de biblioteca
(`redesign-album-page`) y el catálogo ganó datos por canción que la página no muestra:
créditos de personal por grabación, autoría de la obra y el vínculo grabación → obra con sus
atributos (`live`, `cover`, …). Además hay una contradicción visible: el usuario valora con
estrellas a la vista desde la lista de canciones del álbum, y al entrar a la canción la
misma valoración está escondida.

Queremos que Artista → Álbum → Canción se recorra como una biblioteca: la canción como ficha
**compacta** (sin pestañas: tiene cerca de un tercio del contenido de un álbum) que hereda
los componentes del álbum y agrega lo que solo tiene sentido acá: la obra, sus versiones y
el recorrido pista a pista del disco.

De paso, retiramos un modelo de datos muerto: `recording.variant_type` y
`recording.variant_of_id` nunca se completan (las 21 372 grabaciones de la base de scratch
son `original` y ninguna tiene `variant_of`). El vínculo que sí existe y conecta las
versiones es la obra.

## What Changes

- **Página de canción compacta**, sin pestañas, en este orden: cabecera (carátula del disco
  principal, antetítulo "Canción · pista N de *Disco*", título, artistas, ficha técnica y
  bloque de comunidad) con el panel **"Tu relación"** al costado; **tira de pistas**
  (anterior · disco, pista N de M · siguiente); **Composición** y **Créditos de esta
  grabación**; **"Esta grabación aparece en"**; **"Otras versiones de la canción"**; y
  **comentarios** al final.
- **Ficha técnica**: duración, "Escrita por" (sube a la cabecera), primera aparición (disco y
  año) y, cuando la canción es una versión, "Versión en vivo de *X*" / "Versión de *X*" con
  enlace a la original. Solo se pintan filas con datos.
- **Disco principal**: el primer disco de estudio que contiene la grabación; si no hay, el
  disco más temprano. Define la carátula, el antetítulo, la tira de pistas y las migas.
- **Panel "Tu relación"** con **estrellas visibles** (se alinea con el álbum), "Registrar
  escucha" (la reacción cualitativa se elige ahí, en el diario), favorita, listas y una
  línea de historial ("N escuchas · última: reacción, fecha") con enlace al diario. El
  historial deja de ser una sección aparte. Sin "Pendiente" (no admite canciones) ni
  colección.
- **Bloque de comunidad**: valoración media (umbral 5), reacción común (reacciones públicas
  del diario), favorita de N (umbral 5) y en N listas.
- **Composición destacada**: bloque propio con los autores de la obra y sus roles, junto a
  los créditos de la grabación (intérpretes, producción, sonido y otros, con los integrantes
  destacados).
- **"Esta grabación aparece en"**: los discos que contienen esta misma grabación,
  **segmentados por tipo de disco** (estudio, singles y EP, recopilaciones, en vivo y
  otros), con la marca "original" en el más temprano.
- **"Otras versiones de la canción"**: otras grabaciones de la misma obra, **segmentadas por
  tipo de versión** según los atributos del vínculo con la obra: **Versiones de otros
  artistas** (`cover`), **En vivo** (`live`) y **Otras grabaciones** (sin marca: demos,
  tomas alternativas, en vivo mal etiquetados). No se deduce ningún tipo. Grupos contraídos,
  con cantidad; cada grabación enlaza a su página.
- **Grabación original de una obra**: la grabación sin `live` ni `cover` cuyo primer disco
  de estudio es el más temprano; si ninguna está en un disco de estudio, la del disco más
  temprano.
- **Sin reseñas de canción** (sigue la restricción de escritura a álbumes).
- **Clasificación de discos corregida**: hoy cualquier `Album` de MusicBrainz con un tipo
  secundario distinto de `Compilation` o `Live` (Demo, Remix, DJ-mix, Mixtape, Soundtrack…)
  queda como **estudio**. Las reglas de disco principal y de original dependen de "estudio"
  (un "Studio Demos" de 1986 le ganaba a *Use Your Illusion I*), así que esos discos pasan a
  **"en vivo y otros"**, salvo las bandas sonoras (`Soundtrack`), que siguen siendo de estudio, en las ingestas nuevas y con un script que reclasifica los discos ya
  ingeridos (una request por artista sincronizado y una por disco suelto de estudio). Como
  efecto visible, los demos y remixes dejan de figurar como álbumes de estudio en la página
  de artista.
- **BREAKING (contratos)**: `variantType` sale de `GET /api/catalog/recording/[id]` y de las
  pistas adicionales de ediciones; lo reemplaza `versionAttributes: string[]` (atributos del
  vínculo grabación → obra, tal como vienen de MusicBrainz). `GET
  /api/catalog/release-group/[id]` no cambia (nunca expuso la variante). Las pistas del álbum
  y las pistas adicionales derivan de ahí su etiqueta (en vivo, cover, instrumental…) y el
  enlace a la original.
- **BREAKING (esquema)**: migración nueva que retira `recording.variant_type`,
  `recording.variant_of_id`, su `CHECK` y su índice.

## Goals / Non-Goals

**Goals**

- Página de canción con sensación de biblioteca, coherente con el álbum y compacta.
- Navegación rápida Álbum ↔ Canción (tira de pistas) y Canción ↔ versiones (obra).
- Una sola fuente de verdad para "qué versión es": los atributos del vínculo con la obra.

**Non-Goals**

- Página por obra ni fusión de versiones: estrellas, diario y favoritos siguen apuntando a
  la grabación.
- Traer de MusicBrainz todas las grabaciones de una obra (covers de discos no ingeridos):
  solo se muestran las que ya están en la base.
- Reseñas de canción, "Pendiente" para canciones, letras.
- Deducir el tipo de una grabación sin atributos (por ejemplo, "en vivo" por estar en un
  disco en vivo).
- Rediseño de la página de artista (cambio siguiente).

## Capabilities

### New Capabilities

- `song-page-layout`: estructura de la página de canción — zonas de la cabecera, disco
  principal, tira de pistas, bloques de composición y créditos, comentarios al final,
  comportamiento en móvil.
- `song-versions`: la familia de versiones de una canción por su obra — grabación original,
  "Esta grabación aparece en" segmentado por tipo de disco, "Otras versiones" segmentado por
  tipo de versión, línea "Versión de…" en la cabecera y `versionAttributes`.
- `song-personal-panel`: panel "Tu relación" de la canción — estrellas visibles, escucha con
  reacción, favorita, listas e historial en una línea.
- `song-community-stats`: agregados de comunidad de la canción (media, reacción común,
  favoritas y listas) con umbrales mínimos.

### Modified Capabilities

- `catalog-song`: se retiran la página mínima liderada por el álbum, las estrellas detrás
  de "más" y la sección de historial (los reemplazan las capacidades nuevas); la reacción
  agregada pasa al bloque de comunidad; la autoría sube a la cabecera y gana bloque propio.
- `catalog-album`: la etiqueta de variante de la lista de canciones se deriva de
  `versionAttributes` y enlaza a la grabación original de la obra.
- `catalog-artist`: regla explícita de clasificación de tipo de disco (un `Album` con tipos
  secundarios no es de estudio).

## Impact

- **Esquema**: `drizzle/0052_drop_recording_variant.sql` + `src/db/schema.ts` +
  `docs/03-data/sql-model.md`.
- **Servicios**: `src/services/catalog/recording-detail.ts` (disco principal, apariciones por
  tipo de disco, tira de pistas), servicio nuevo de versiones por obra, créditos de una
  grabación (`personnel-levels.ts`), agregados de comunidad de la canción,
  `album-detail.ts` y `album-editions.ts` (de `variantType` a `versionAttributes`).
- **Rutas y componentes**: `src/app/[locale]/(catalog)/song/[id]/`, componentes nuevos en
  `src/components/song/`, `SongSections.tsx` se retira; reutiliza el selector de listas, la
  entrada de estrellas y los créditos del álbum. `TrackList` y `EditionExtraTracks` cambian
  su etiqueta de variante.
- **API**: `docs/04-api/contracts.md` (tres respuestas cambian) y `src/lib/api/schemas.ts`.
- **Docs**: `docs/05-features/catalog-browsing.md` (sección 3b y casos límite),
  `docs/00-product/content-hierarchy.md` (rating de canción visible),
  `docs/01-domain/domain-model.md` y `business-rules.md` (la obra conecta las versiones), un
  ADR nuevo (versiones por obra y retiro de `variant_type`).
- **Mensajes**: `messages/{es,en}/catalog.json` (sección de canción, atributos de versión).
- **Clasificación**: `mapReleaseGroupCategory` (`src/services/musicbrainz/mappers.ts`), las
  cláusulas de búsqueda por categoría (`search/mb-query.ts`) y un script nuevo
  `scripts/backfill-release-group-category.ts`.
- Sin dependencias nuevas. La página no hace requests nuevas a MusicBrainz; solo el script de
  reclasificación las hace, una vez, con el rate limit del cliente.
