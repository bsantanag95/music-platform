## Why

Hoy los géneros de la plataforma son dos vocabularios desconectados y ninguno usa datos reales:
`release_group_tag` está **sembrado a mano** (`scripts/seed-release-group-tags.ts`, un diccionario
de 20 artistas y un "rock"/"pop" de relleno para el resto) y alimenta Explorar, Caminos y la
huella de gusto; `app_user.genres` es una lista cerrada propia de 20 claves que no coincide con
ninguna taxonomía ("soul-funk", "indie"). Artista, Álbum y Canción no muestran géneros. Antes de
votar géneros (cambio 2) o mostrarlos en las páginas (cambio 3) hace falta una base de datos de
géneros real, con licencia compatible y navegable a dos niveles: detalle para el especialista,
familias para el usuario común.

La exploración (2026-10-01/02) midió las fuentes: la **lista de géneros de MusicBrainz y su
jerarquía son CC0** (dump `mbdump.tar.bz2`), pero los **votos de género por entidad son
etiquetas CC BY-NC-SA** (dump derived, `inc=genres`), que el proyecto ya decidió no ingerir
(ADR 0021, spec `artist-profile-facts`). La alternativa CC0 que el ADR 0021 dejó anotada,
**Wikidata P136**, cubre el 40% de los artistas y el 43% de los álbumes de estudio del catálogo
actual, y el 93,5% de sus valores se traduce a un género de MusicBrainz.

## What Changes

- **Taxonomía de géneros (CC0).** Se incorporan los 2.209 géneros de MusicBrainz con su MBID y
  sus relaciones "subgénero de", "fusión de" e "influido por", generados offline desde el dump
  core de MusicBrainz a un archivo versionado en el repo y cargados por un script idempotente.
  Cada género tiene un slug estable y su nombre en español tomado de la etiqueta de Wikidata
  (vía P8052), con el nombre de MusicBrainz como respaldo.
- **20 familias curadas, N:M.** 17 principales (Rock, Metal, Punk y hardcore, Pop, Electrónica,
  Hip hop, R&B soul y funk, Jazz, Blues, Folk y cantautor, Country, Clásica, Experimental,
  Ambient y new age, Reggae y Caribe, Latina, Brasileña) y 3 secundarias (Palabra y escena,
  Religiosa, Del mundo). La pertenencia se calcula desde un mapeo curado raíz → familia, más
  subárboles culturales (lo latino y lo brasileño repartido en otras ramas), huérfanos curados y
  "fusión de"; lo que no tenga asignación cae en "Del mundo".
- **Descriptores aparte.** Instrumental, Navideña y Orquestal (géneros de MusicBrainz marcados
  como descriptor) y Banda sonora (derivado del tipo secundario `Soundtrack` del álbum). Se
  ocultan non-music, asmr, production music, cyberpunk, steampunk y progressive.
- **Géneros semilla desde Wikidata P136.** El artista toma P136 de la entidad que ya baja el
  enriquecimiento de Wikimedia (sin requests nuevas). El álbum guarda la entidad de Wikidata
  que MusicBrainz declara en su relación `wikidata` (se suma `url-rels` al browse de discografía
  existente) y toma P136 en lote. Las semillas se guardan aparte de los futuros votos de la
  comunidad. Un álbum sin semilla propia hereda la del artista principal.
- **BREAKING (datos):** se elimina `release_group_tag` y `scripts/seed-release-group-tags.ts`.
  Explorar pasa a navegar por **familia** (`?familia=`) y por **género** (`?genero=<slug>`,
  incluye subgéneros); el filtro de Caminos y la cresta de la huella de gusto leen la taxonomía
  (la cresta muestra familias, cada una con sus géneros más presentes).
- **BREAKING (contrato):** "Géneros que me mueven" sigue siendo una lista cerrada, ahora de claves
  de la taxonomía (22: `indie` se separa en `indie-rock`/`indie-pop` y `soul-funk` en `soul`/`funk`),
  con nombres localizados desde la taxonomía. La migración reescribe los valores guardados.
- Nuevo ADR (géneros: taxonomía CC0 de MusicBrainz + semilla de Wikidata) y actualización de
  `data-licensing.md`, `sql-model.md`, `business-rules.md`, `contracts.md` y `explore.md`.

### Goals

- Una taxonomía de géneros real, CC0, con jerarquía y nombres en español, lista para votos y UI.
- Familias que sirvan al usuario común sin perder el detalle del especialista.
- Datos de género por artista y álbum con licencia compatible, sin requests extra a MusicBrainz.
- Reemplazar todos los datos de género falsos y unificar los dos vocabularios.

### Non-Goals

- Votos de género de la comunidad, puntaje y permisos (cambio 2, `add-genre-votes`).
- Chips de género en las páginas de Artista, Álbum y Canción, página `/genero/<slug>` y selector
  abierto de géneros en el perfil (cambio 3, `show-genres`).
- Géneros propios de cada canción: la canción hereda los del álbum (decisión de producto; los
  votos por canción quedan para después).
- Ingerir votos, etiquetas o géneros por entidad de MusicBrainz (CC BY-NC-SA).
- Traducción automática de nombres de géneros.

## Capabilities

### New Capabilities
- `genre-taxonomy`: catálogo de géneros de MusicBrainz (CC0) con jerarquía, slugs estables, nombres
  por idioma, familias curadas N:M, descriptores y ocultos; generación offline y carga idempotente.
- `genre-seeds`: géneros semilla por artista y álbum desde Wikidata P136 (llegando a Wikidata solo
  por la relación que declara MusicBrainz), su actualización y la lectura efectiva con herencia
  artista → álbum.

### Modified Capabilities
- `album-discovery`: la exploración por género pasa de `release_group_tag` a familias y géneros de la
  taxonomía (`?familia=`, `?genero=` con subgéneros).
- `camino-discovery`: el filtro por género deja `release_group_tag` y acepta familia (`family`) o género con subgéneros (`genre`).
- `taste-fingerprint`: la cresta de géneros se calcula con los géneros efectivos y muestra familias, cada una con sus 2–3 géneros más presentes.
- `profile-music-identity`: la lista cerrada de "Géneros que me mueven" pasa a claves de la taxonomía.
- `artist-profile-facts`: los géneros del artista dejan de estar "pendientes": siguen sin venir de
  MusicBrainz y su fuente es Wikidata P136.
- `artist-wikimedia-enrichment`: el enriquecimiento también extrae los géneros (P136) de la entidad.
- `artist-discography`: el browse de discografía guarda la entidad de Wikidata de cada álbum.

## Impact

- **Esquema:** migración `0056` (tablas de taxonomía, familias, semillas; `release_group.wikidata_id`
  y `genres_synced_at`; elimina `release_group_tag`; reescribe `app_user.genres`), espejo en
  `src/db/schema.ts`.
- **Datos versionados:** `data/genres/` (taxonomía generada + mapeo curado de familias).
- **Scripts:** `scripts/build-genre-taxonomy.ts` (offline), `scripts/load-genre-taxonomy.ts`,
  `scripts/backfill-genre-seeds.ts`; se borra `scripts/seed-release-group-tags.ts`.
- **Servicios:** `musicbrainz/client.ts` (`url-rels` en el browse), `wikimedia/client.ts` (consulta
  SPARQL para generar nombres, solo offline), `catalog/ingest-discography.ts`,
  `catalog/artist-wikimedia.ts`, nuevo `services/genres/`, `discovery/discovery.ts`,
  `camino/discovery.ts`, `profiles/stats.ts`, `lib/music-identity.ts`.
- **UI mínima:** chips de familias en `/explore`, selector de Caminos, cresta de la huella, editor de
  identidad musical (etiquetas desde la taxonomía).
- **APIs:** `/api/me/profile/music-identity` (claves nuevas), huella (`genres` por familia con sus géneros más presentes),
  `/api/caminos/discover` (`genre` pasa a ser un slug de la taxonomía con subgéneros; nuevo `family`).
- **Operación:** tras migrar, correr la carga de taxonomía y el backfill de semillas (documentado en
  `docs/06-operations/catalog-scripts.md`).
- **Dependencias:** ninguna nueva.
