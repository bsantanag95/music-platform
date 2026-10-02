## 1. Esquema (migración 0056)

- [x] 1.1 Escribir `drizzle/0056_genre_taxonomy.sql`: tablas `genre`, `genre_relation`, `genre_family`, `genre_family_member`, `artist_genre_seed`, `release_group_genre_seed` con sus `CHECK`, PK, FK e índices por `genre_id`; trigger de `updated_at` en `genre`; columnas `release_group.wikidata_id` (`CHECK ^Q[0-9]+$`) y `release_group.genres_synced_at`
- [x] 1.2 Insertar en la migración las 20 familias (`key`, `tier` main/more, `position`)
- [x] 1.3 Crear la vista `release_group_effective_genre` (semillas propias o, si no hay, los 3 primeros géneros de estilo del primer crédito `primary`, con `inherited`; sin `hidden`)
- [x] 1.4 Reescribir `app_user.genres` (`soul-funk` → `soul`,`funk`; `indie` → `indie-rock`,`indie-pop`; sin duplicados, orden conservado) y abortar con `RAISE EXCEPTION` que nombre al usuario si alguno supera 5
- [x] 1.5 `DROP TABLE release_group_tag`
- [x] 1.6 Espejo en `src/db/schema.ts` (tablas, vista, columnas nuevas, tipos `*Row`) y quitar `releaseGroupTag`
- [x] 1.7 Aplicar la migración en la BD de scratch y verificar los `CHECK` (slug, QID, clase, relación consigo mismo, tier) con inserciones inválidas

## 2. Curaduría y generación de la taxonomía

- [x] 2.1 Agregar `wikimedia.sparql(query)` al cliente de Wikimedia (mismo User-Agent, cola y reintentos) con test
- [x] 2.2 Escribir `data/genres/curation.ts`: raíz → familias, subárboles culturales (Latina, Brasileña), huérfanos curados, descriptores y ocultos, con un comentario por decisión no obvia
- [x] 2.3 Implementar el slug (`src/services/genres/slug.ts`) con tests: diacríticos, `&`, colisiones con sufijo determinista
- [x] 2.4 Implementar el cálculo de familias como función pura (`src/services/genres/families.ts`) con tests para cada regla del orden: oculto/descriptor, huérfano curado, raíces + subárbol cultural, fusión, default `mundo`
- [x] 2.5 Escribir `scripts/build-genre-taxonomy.ts --dump <dir>`: lee las 4 tablas TSV y `TIMESTAMP`, la consulta SPARQL de P8052 (QID, etiqueta es), aplica `curation.namesEs`, conserva slugs del `taxonomy.json` anterior, valida (nombre curado inexistente, familia principal vacía, familia desconocida) y escribe `data/genres/taxonomy.json` ordenado por `mbid`
- [x] 2.6 Extraer las 4 tablas del dump core actual, generar `data/genres/taxonomy.json` y revisar el resultado contra las mediciones de la exploración (2.209 géneros, familias de las sondas: trap latino, cumbia, bossa nova, blackgaze, flamenco)
- [x] 2.7 Escribir `scripts/load-genre-taxonomy.ts`: upsert por `mbid` en una transacción, reemplazo de relaciones y pertenencias, ausentes → `hidden`; verificar idempotencia (segunda corrida sin cambios) en la BD de scratch

## 3. Semillas desde Wikidata

- [x] 3.1 Mapper puro de P136 (`src/services/wikimedia/mappers.ts`): valores *truthy* (preferido > normal, nunca obsoleto) en orden, con tests
- [x] 3.2 Servicio `src/services/genres/seeds.ts`: traducir QIDs a géneros (`genre.wikidata_id`, sin `hidden`) y reemplazar semillas de artista o álbum en una transacción, con tests
- [x] 3.3 Paso de géneros en `fetchWikimediaEnrichment`/`enrichArtistFromWikimedia`, aislado con `tryStep` (un fallo conserva las semillas y no descarta foto/textos/lugar), con tests
- [x] 3.4 `browseReleaseGroupsByArtist` con `inc=artist-credits+url-rels`; tipos de la relación `wikidata`; actualizar el test del cliente
- [x] 3.5 `saveDiscographyReleaseGroups` guarda `release_group.wikidata_id` desde la relación (y la pone en `NULL` si falta), con tests del mapper
- [x] 3.6 Sincronización de semillas de álbum al terminar la discografía (mismo `after()`): álbumes con vigencia vencida, `wbgetentities` en lotes de 50, sin entidad → sincronizado sin semillas, fallo de lote conserva; con tests
- [x] 3.7 Escribir `scripts/backfill-genre-seeds.ts` con `--limit` y `--dry-run` (artistas con `wikidata_id` en lotes; álbumes re-recorriendo el browse de discografías sincronizadas)
- [x] 3.8 Actualizar el comentario de `getArtistWithRelations` en `client.ts`: sigue sin pedir `genres` ni `tags` a MusicBrainz (CC BY-NC-SA) y los géneros salen de Wikidata (ADR 0023); test que verifica que ninguna request del cliente incluye `genres` ni `tags` en `inc`

## 4. Lecturas de géneros

- [x] 4.1 Servicio `src/services/genres/read.ts`: nombre localizado (es: `name_es` ?? `name`; en: `name`), familias de un género, descendientes por `subgenre_of` (CTE recursiva), descriptores de un álbum (incl. Banda sonora por `Soundtrack`), con tests
- [x] 4.2 Explorar: `listGenres` → conteo de álbumes por familia (17 principales + 3 en "Más"); `listAlbumsByFamily` y `listAlbumsByGenre` (con subgéneros) sobre la vista; prioridad `decada` > `familia` > `genero`; clave o slug desconocido → estado vacío; actualizar tests
- [x] 4.3 `/explore`: chips de familias con "Más", enlaces `?familia=` y encabezado del listado con nombres localizados; mensajes es/en de las 20 familias
- [x] 4.4 Caminos: `genreCondition` sobre la vista con subgéneros, nuevo filtro `family`; selector de familias en `/caminos`; `/api/caminos/discover` acepta `family` y `genre`; actualizar tests
- [x] 4.5 Huella de gusto híbrida: `computeGenres` cuenta álbumes por familia (top 8) desde la vista y, por familia, sus 2–3 géneros de estilo más presentes; la frase de resumen combina familia y género ("Rock, sobre todo shoegaze"); actualizar `TasteFingerprint` y los tests de `stats`
- [x] 4.6 Identidad musical: `GENRES` pasa a las 22 claves; etiquetas desde la taxonomía en el editor, la ficha y la Placa; quitar `musicIdentity.genres.*` de los mensajes; test que verifica cada clave contra `data/genres/taxonomy.json` (`kind = 'style'`)

## 5. Retiro de los datos sembrados

- [x] 5.1 Borrar `scripts/seed-release-group-tags.ts` y sus referencias (scripts, docs, AGENTS.md si aplica)
- [x] 5.2 Buscar referencias restantes a `release_group_tag`/`releaseGroupTag` en `src/`, `scripts/` y tests y eliminarlas

## 6. Documentación

- [x] 6.1 ADR nuevo `docs/02-architecture/adr/0023-generos-taxonomia-y-semillas.md` (taxonomía CC0 del dump, semilla Wikidata P136, entidad del álbum desde la relación de MusicBrainz, amplía el ADR 0021 sin reescribirlo; slug de género guardado, único y en inglés, como excepción justificada al ADR 0022)
- [x] 6.2 `docs/03-data/data-licensing.md`: géneros resueltos (taxonomía CC0, semillas CC0 de Wikidata, votos de MusicBrainz siguen excluidos)
- [x] 6.3 `docs/03-data/sql-model.md`: tablas nuevas, vista, columnas de `release_group`, retiro de `release_group_tag`, reescritura de `app_user.genres`
- [x] 6.4 `docs/01-domain/business-rules.md` y `domain-model.md`: género, familia, descriptor, semilla, herencia; nombres de género como dato del catálogo por idioma (sin traducción automática)
- [x] 6.5 `docs/04-api/contracts.md`: identidad musical (claves nuevas), huella (`genres` por familia con sus géneros más presentes), Caminos (`family`, `genre`), Explorar (`?familia=`, `?genero=`)
- [x] 6.6 `docs/05-features/explore.md`, `user-profile.md` y `caminos.md`: secciones de género actualizadas
- [x] 6.7 `docs/06-operations/catalog-scripts.md`: regenerar la taxonomía (extracción con `tar`, build, revisión del diff), cargarla y correr el backfill

## 7. Verificación

- [x] 7.1 Smoke test `scripts/smoke-test-genres.ts` contra la BD de scratch (fixtures con prefijo `5e0ce000-0000-4000-8000-*`, Wikidata y MusicBrainz mockeados): carga idempotente, semillas de artista y álbum, herencia en la vista, Explorar por familia y por género con subgéneros, limpieza al terminar; documentarlo en AGENTS.md
- [x] 7.2 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 7.3 En la BD de scratch: migrar, cargar la taxonomía, correr el backfill con `--limit` y revisar `/explore`, `/caminos`, la huella y el editor de identidad en el navegador
