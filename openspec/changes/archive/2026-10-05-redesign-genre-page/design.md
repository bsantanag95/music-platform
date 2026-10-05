## Context

`/genre/<slug>` (cambio `show-genres`) renderiza `GenrePageView`, un componente sin estado, con los datos de `getGenrePage` (relaciones, 12 artistas) y `listAlbumsByGenre` (álbumes paginados con el orden compartido de Explorar). Las lecturas de álbumes por género se apoyan en `albumInGenreTree` (CTE recursiva "subgénero de" sobre la vista `release_group_effective_genre`, que une semillas, votos y herencia del artista) y en `listAlbumsWhere` de `src/services/discovery/discovery.ts`.

Restricciones que condicionan el diseño:

- **Cobertura baja y desigual** en la BD real (523/2.740 álbumes y 667/3.405 artistas con género). Una sección con pocos datos tiene que omitirse, no mostrar un hueco ni una cifra engañosa (patrón de `MIN_ALBUMS_FOR_SECTION` en Explorar).
- **Las reglas se aplican en código**, no por convención de la UI: umbrales como constantes que cada lectura usa.
- **Wikimedia**: un único cliente (`src/services/wikimedia/client.ts`), solo se llega a Wikidata por declaraciones atadas al MBID, el texto de Wikipedia es CC BY-SA 4.0 y exige atribución (ADR 0021, `data-licensing.md` sección D).
- **Server Components por defecto**; cliente solo donde hay interactividad (filtros, botón "Me mueve"). Los componentes del cliente no usan `fetch` directo: pasan por `src/lib/api/client.ts` y validan con Zod.
- `app_user.genres` es `text[]` con tope 5 por `CHECK` (migración 0040), y el `PUT /api/me/profile/music-identity` **reemplaza** la lista completa.
- Alcance: Fase 1 (estructura), Fase 2 (comunidad y personalización) y Fase 4 (texto de Wikipedia) del plan acordado. Sin canciones.

## Goals / Non-Goals

**Goals:**

- Una página de género con cabecera fija y cuatro pestañas (Resumen, Álbumes, Artistas, Listas), con todo el estado en la URL.
- Exploración dentro del género equivalente a la de la discografía de un artista: búsqueda, filtros, orden y dos vistas, paginados en servidor.
- Señales de comunidad (cifras, mejor valorados, listas, reseñas) con umbrales ejecutados por el servicio.
- Relación personal con el género (huella, "Me mueve") sin pisar datos de otras pestañas.
- Texto introductorio del género con atribución correcta y sin que la página dependa de Wikimedia para construirse.
- Un presupuesto de rendimiento medido y una salida definida si no se cumple.

**Non-Goals:**

- Canciones (riel, pestaña, herencia de género por canción).
- Cambios a la taxonomía, las semillas, los votos o la vista de géneros efectivos.
- API REST para leer la página: sigue siendo lectura en servidor (como Explorar).
- Recomendación o afinidad personalizada.
- Espejo propio de imágenes o de texto fuera de `genre_localized_text`.

## Decisions

### D1. Pestañas por `?tab=` renderizadas en servidor

`?tab=albums | artists | lists`; sin parámetro, o con uno desconocido, es el Resumen (no hay 404 por una pestaña inválida: la URL es compartible y no debe romperse). Cada pestaña es un `<Link>` y solo se consulta lo que esa pestaña muestra. Los parámetros de filtro (`q`, `tipo`, `decada`, `sub`, `solo`, `orden`, `vista`, `page`) solo se leen en la pestaña que los usa y se ignoran en el resto. Los valores inválidos caen al predeterminado en la página (lectura tolerante) mientras que los servicios validan estrictamente y lanzan `VALIDATION_ERROR` (mismo reparto que `listAlbumsByDecade`).

*Alternativas descartadas*: pestañas con estado en el cliente (pierden la URL y obligan a hidratar todo), y una sola página larga (el Resumen deja de ser un resumen y la carga crece con cada sección).

Las claves de consulta van en español, igual que `decada`, `familia` y `genero` de Explorar; los valores de pestaña en inglés, como `?view=songs` del álbum.

### D2. Lecturas por sección, y un Suspense por riel

`getGenrePage` se parte en funciones por sección en `src/services/genres/`: `page.ts` (identidad, árbol), `stats.ts`, `albums.ts`, `artists.ts`, `lists.ts`, `reviews.ts`, `personal.ts`, `about.ts`. La página espera lo barato y necesario para decidir 404/redirección (género, árbol, texto guardado) y envuelve cada riel pesado en `<Suspense>` con un `Skeleton` de reserva, de modo que una consulta lenta no retrase la cabecera. Cada función devuelve datos ya filtrados por umbral: un riel bajo su mínimo devuelve `[]` o `null` y el componente no se renderiza.

### D3. Umbrales como constantes en un único módulo

`src/services/genres/constants.ts` reúne los umbrales de la página y reutiliza los existentes en vez de duplicarlos:

| Constante | Valor | Uso |
|---|---|---|
| `MIN_RATINGS_PER_ALBUM` (existente) | 3 | un álbum entra en Esenciales |
| `MIN_ALBUMS_FOR_SECTION` (existente) | 6 | Esenciales se muestra |
| `COMMUNITY_MIN_COUNT` (existente) | 5 | media y valoraciones del género; "les mueve a N personas" |
| `GENRE_LIST_MIN_ALBUMS` | 3 | una lista cuenta como "del género" |
| `GENRE_DECADES_MIN` | 2 | se muestra "Por década" |
| `GENRE_RAIL_SIZE` | 12 | tope de cada riel (= `RAIL_SIZE`) |
| `GENRE_REVIEWS_SIZE` | 5 | reseñas recientes |
| `GENRE_ABOUT_REFRESH_MS` | 30 días | vigencia del texto |

Novedades, artistas y árbol no tienen umbral mínimo más que "hay al menos una fila".

### D4. Estadísticas de cabecera en una consulta

Una sola consulta agrupada sobre el conjunto de álbumes del subárbol devuelve: cantidad de álbumes, cantidad de artistas con semilla en el subárbol (`type <> 'unknown'`), cantidad y promedio de valoraciones y la década con más álbumes. La media y la cantidad de valoraciones solo salen cuando hay al menos `COMMUNITY_MIN_COUNT` valoraciones (mismo criterio que el bloque de comunidad del álbum); el servicio devuelve `null` bajo el umbral, no la UI. "Década de auge" requiere al menos `GENRE_DECADES_MIN` décadas.

La media es sobre todas las valoraciones de los álbumes del subárbol (no un promedio de promedios) y se presenta como señal de la comunidad, no como puntaje del género.

### D5. Listado de álbumes: se generaliza `listAlbumsWhere`

`listAlbumsWhere(condition, page)` pasa a `listAlbumsFiltered(condition, options)` exportado desde `discovery.ts`, con `options = { page, category?, decade?, q?, sort }`. Explorar (`listAlbumsByDecade`, `listAlbumsByFamily`, `listAlbumsByGenre`) llama con `sort: "best"` y sin filtros, así que su comportamiento no cambia (cubierto por los tests existentes de `discovery.test.ts`).

Órdenes (todos deterministas, con `release_group.id` de desempate):

| `orden` | Criterio |
|---|---|
| `mejor` (predeterminado) | el actual: promedio si el álbum es elegible (≥ `MIN_RATINGS_PER_ALBUM`), luego año descendente |
| `populares` | cantidad de valoraciones descendente, luego `mejor` |
| `recientes` | `first_release_year` descendente, nulos al final |
| `antiguos` | `first_release_year` ascendente, nulos al final |
| `az` | `search_normalize(title)` ascendente |

Búsqueda `q`: se normaliza con `normalizeSearchText` (la única normalización de la búsqueda, `catalog/search/normalize.ts`) y se compara contra `search_normalize(title)` y contra `search_normalize(artist.name)` de los artistas acreditados, con `escapeLike`. Aprovecha los índices trigram de la migración 0050; no se agrega ninguno.

Subgénero y alcance: el filtro `sub=<slug>` solo acepta un descendiente del género de la página (si no, se ignora) y cambia la raíz de `albumInGenreTree`; `solo=1` usa una condición nueva `albumHasGenre(genreId)` (el género exacto, sin descendientes) junto a `albumInGenreTree` en `read.ts`. Las dos condiciones se correlacionan con `"release_group"."id"` por literal, como las existentes.

### D6. Artistas: álbumes *del género*, no totales

La tarjeta dice "N álbumes del género": cuenta los release-groups acreditados al artista que cumplen `albumInGenreTree`. Es más preciso que el conteo total actual y no más caro (mismo EXISTS). Órdenes: `albumes` (predeterminado), `seguidos` (cantidad en `artist_follow`, solo para ordenar: la cifra no se muestra) y `az`. Búsqueda `q` por nombre normalizado. La foto sale de `artist.photo_url` (licencia libre ya verificada por ADR 0021) y, si no hay, el disco de reemplazo. El Resumen muestra los 8 primeros.

### D7. Árbol "Dónde encaja"

Un componente que sustituye las tres filas de chips: padres → género actual → subgéneros directos, **con la cantidad de álbumes del subárbol de cada subgénero y ordenados por ella** (desempate por nombre), y "Géneros cercanos" aparte. Los conteos salen de una consulta agrupada por subgénero directo (no N consultas). Subgéneros sin álbumes se muestran atenuados al final solo si son pocos; si no hay ninguno con música, se omiten. Más de 12 subgéneros: los primeros y un `<details>` con el resto (sin JS). En móvil el aside baja bajo el contenido (sin plegar: un `<details>` no puede estar abierto en escritorio y cerrado en móvil sin JavaScript).

### D8. Listas de la comunidad

Una lista cuenta como "del género" si es pública, `kind = 'standard'`, `entity_type = 'release-group'`, visible, sin retiro oficial, de dueño con `profile_visibility = 'public'` y activo, sin bloqueo con el lector, y tiene al menos `GENRE_LIST_MIN_ALBUMS` álbumes del subárbol. Son exactamente las condiciones de `publicListsContainingItemConditions`, que se extraen a una función base exportada para no duplicarlas (y que la cifra del álbum, la página "Mostrar en listas" y esta sección no diverjan). Orden: guardados descendente, luego cantidad de álbumes del género, luego fecha. Se reutilizan `PUBLIC_LIST_COLUMNS` y `enrichPublicLists`. La pestaña pagina; el Resumen muestra un carrusel de hasta 6. Los Caminos (`custom_journey`) quedan fuera, igual que en la cifra del álbum.

### D9. Reseñas recientes

Las últimas `GENRE_REVIEWS_SIZE` reseñas con `moderation_status = 'visible'` de álbumes del subárbol, con el autor desactivado enmascarado (misma regla que `listReviews`/`getReviewDetail`) y sin autores bloqueados en ninguna dirección con el lector cuando hay sesión. Reutiliza `reviewSelection` y `serializeReview`, y cada reseña enlaza al detalle `/review/{id}`. No hay pestaña propia: es una sección del Resumen que se omite sin reseñas.

### D10. "Tu huella en el género"

`getGenreFootprint(userId, genreId)`, solo con sesión y solo del propio lector: cantidad de álbumes del subárbol que valoró, su media, sus 3 mejor valorados y cuántos álbumes del subárbol tiene en "Pendiente" (`want_to_listen_entry.release_group_id`). Sin actividad muestra una invitación a explorar los Esenciales (o a la pestaña Álbumes si Esenciales se omitió). No se calcula nada para anónimos y no se expone a terceros. No incluye "te faltan N de los esenciales": depende de una sección que puede estar omitida y se prestaría a mostrar un dato sin su contexto.

### D11. "Me mueve": endpoint idempotente en vez de reutilizar el `PUT` de reemplazo

`PUT /api/me/profile/music-identity` reemplaza la lista completa. Usarlo desde la página enviaría la lista que el servidor renderizó: si la persona la editó en otra pestaña, se pierden esos géneros en silencio. Se agrega `PUT /api/me/profile/genres/{slug}` (alta) y `DELETE` (baja), idempotentes, con una sola sentencia atómica sobre `app_user.genres`:

- Alta: `UPDATE app_user SET genres = array_append(genres, $slug) WHERE id = $user AND NOT ($slug = ANY(genres)) AND cardinality(genres) < 5 RETURNING genres`. Si no actualizó nada, el servicio distingue "ya estaba" (200 con la lista) de "lleno" (409 `MUSIC_IDENTITY_GENRES_FULL`).
- Baja: `array_remove`, 200 aunque no estuviera.
- El slug se valida con el mismo criterio que `updateMusicIdentity` (existe y es un estilo visible, ADR 0024); inexistente → 404 `GENRE_NOT_FOUND` (código ya existente de los votos).

El `CHECK` de 5 sigue siendo la última barrera en SQL. El componente cliente usa TanStack Query con `mutationFn` en `src/lib/api/` y actualiza el estado local; el texto del error sale de `errors.json` por `code`.

*Alternativa descartada*: leer la lista fresca y reenviar el `PUT` de reemplazo — sigue habiendo carrera entre la lectura y la escritura.

La cifra "les mueve a N personas" cuenta personas con `slug = ANY(genres)` (el género exacto, no el subárbol), perfil `public` y cuenta activa, y solo se muestra desde `COMMUNITY_MIN_COUNT`. Si `EXPLAIN` muestra un recorrido secuencial relevante, la migración agrega un índice GIN sobre `app_user.genres` (ver Migración).

### D12. "Sobre el género" (Wikipedia)

- **Alcance de datos**: tabla `genre_localized_text` (`genre_id`, `locale` ∈ `es|en`, `description`, `summary`, `summary_title`, `summary_url`; única por `(genre_id, locale)`; `CHECK summary IS NULL OR summary_url IS NOT NULL`), igual que `artist_localized_text`, y `genre.wikimedia_synced_at`. Solo géneros `style` con `wikidata_id`.
- **Cómo se llega a Wikidata**: por `genre.wikidata_id`, que la taxonomía obtuvo de la declaración P8052 (ID de género de MusicBrainz) y por lo tanto está atada al MBID; nunca se busca por nombre. Es una extensión del ADR 0021 (ADR 0027), que lo dice expresamente.
- **Sincronización**: `enrichGenreFromWikimedia(genreId)` con la misma forma que `enrichArtistFromWikimedia`: candado advisory por género, vigencia de 30 días, `getEntities([qid], ["descriptions","sitelinks"])` y `getIntroExtract` por idioma disponible, sin traducción automática. Si falla la entidad, no se escribe nada y el género queda pendiente; si falla un extracto, se conserva el anterior de ese idioma. Corre en segundo plano con `after()` al visitar un género vigente-vencido: la primera visita responde sin texto.
- **Lectura**: el idioma de la ruta; si falta, el otro idioma indicando cuál es (como el artista). Se muestra el primer párrafo (hasta ~600 caracteres cortados en límite de oración) y el resto en un `<details>`. La atribución es obligatoria y visible junto al texto: "Fuente: Wikipedia" con enlace al artículo (`summary_title`) y a la licencia CC BY-SA 4.0. Mostrar `summary_title` evita presentar como "Música clásica" un artículo titulado "Música culta" (la etiqueta curada y el ítem de Wikidata pueden diferir).
- **Relleno**: `scripts/backfill-genre-about.ts` (`--limit`, `--dry-run`, `--force`), ordenado por cantidad de álbumes del género descendente, reanudable (se salta lo vigente). Con ~1 s por género (una entidad y hasta dos extractos a 250 ms) cubre ~2.200 géneros en menos de una hora. Un solo proceso: respeta la cola serial del cliente.
- **Retiro**: el texto no tiene retiro a pedido como la foto; el vandalismo se corrige en la siguiente sincronización y `--force --slug` la adelanta.

### D13. Interfaz: filtros y vistas

- Los filtros se escriben en la URL con un componente de cliente mínimo (`GenreFilterBar`) que navega con `router.replace` al cambiar un selector, y envía la búsqueda con Enter o con un botón; sin JS el formulario funciona como `GET`. Reutiliza `FilterSelect` y `Input` de `src/components/ui`.
- La vista lista usa una fila nueva (`GenreAlbumRow`) con carátula pequeña, título, artista principal, año, tipo y el menú "…" de `AlbumQuickActions` (el mismo de `AlbumCard`). La elección de vista vive solo en la URL (`vista=lista`), sin `localStorage`, para que un enlace compartido se vea igual para todos.
- Estado vacío por filtros: mensaje y enlace "Limpiar filtros", distinto de "Todavía no hay música de este género".
- Breadcrumb: Inicio › Explorar › Familia › Género. La familia enlaza a `/explore?familia=`; con varias, la primera del orden de la interfaz.

### D14. Rendimiento: presupuesto y salida

Presupuesto: el Resumen de un género raíz grande (p. ej. `rock`) responde en ≤ 800 ms de servidor en la BD real, con cada riel fuera del camino crítico por Suspense. Se mide con `EXPLAIN (ANALYZE)` sobre `rock`, `electronic` y `shoegaze` en scratch antes de dar el cambio por terminado. Si se supera: primero, evaluar el subárbol una sola vez por request (CTE materializada compartida entre estadísticas, rieles y conteos del árbol); segundo, `unstable_cache` de Next (sin dependencia nueva) para los agregados públicos por slug con revalidación de 5 minutos, aceptable porque son cifras de comunidad; **no** se crea una vista materializada sin una medición que lo justifique. La caché nunca incluye datos del lector (huella, listas con estado de guardado).

**Medición (apply, base de scratch con 7.577 álbumes):** cada lectura del Resumen y de las pestañas tarda unos 35–60 ms
en `rock`, `electronic`, `progressive-rock` y `shoegaze`: el presupuesto se cumple sin caché ni vista materializada. Un
hallazgo cambió el diseño: las consultas cuyo lado exterior es pequeño (reseñas recientes, listas, huella) no deben usar
`albumInGenreTree` (`EXISTS` correlacionado): el planificador elige un bucle anidado y vuelve a evaluar la vista
`release_group_effective_genre` entera por cada fila exterior (19 reseñas: 265–371 ms). Por eso existe
`albumInGenreTreeOnce`, que calcula el subárbol una sola vez en una CTE materializada (55–75 ms) y es la que usan las
reseñas, las listas y la huella.

## Risks / Trade-offs

- **[Género raíz muy grande hace lenta la CTE]** → presupuesto medido (D14), Suspense por riel y la secuencia de salidas descrita.
- **[Una sección con pocos datos se ve vacía o engañosa]** → umbrales en servicio (D3) y secciones que se omiten; un test por sección verifica que bajo el umbral no se renderiza.
- **[Media de valoraciones del género mal interpretada]** → se rotula como valoración de la comunidad sobre los álbumes del género y no se muestra bajo 5 valoraciones.
- **[Texto de Wikipedia no corresponde al género o es vandalismo]** → entidad atada al MBID, título del artículo visible, vigencia de 30 días con `--force --slug` para adelantar; la página no depende del texto.
- **[Cuota/uso de Wikimedia]** → cola serial existente, `after()` por visita con candado por género, una sola instancia para el relleno.
- **[Carrera "Me mueve" ↔ edición del perfil]** → sentencia atómica con tope en la propia cláusula `WHERE`, más el `CHECK` de la base.
- **[Privacidad de la cifra de "les mueve"]** → solo perfiles públicos y activos y solo desde 5 personas; nunca una lista de nombres.
- **[Explorar cambia por la generalización de `listAlbumsWhere`]** → mismas llamadas con `sort: "best"` y sin filtros; los tests existentes de `discovery.test.ts` deben pasar sin cambios.
- **[Un componente de cliente más]** → acotado a la barra de filtros y al botón "Me mueve", que son los dos únicos puntos interactivos; el resto sigue en servidor.

## Migration Plan

1. Migración nueva `0059_genre_about.sql` (la última aplicada es la 0058): crea `genre_localized_text` con sus `CHECK` y su único, agrega `genre.wikimedia_synced_at` (nullable) y, solo si la medición de D11 lo pide, `idx_app_user_genres` GIN. Espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`. No se edita ninguna migración aplicada.
2. Aplicar en scratch y verificar; luego en la BD real.
3. Desplegar el código. Sin el relleno, las páginas funcionan sin el bloque "Sobre el género".
4. Correr `scripts/backfill-genre-about.ts` en segundo plano; es reanudable y puede interrumpirse.
5. **Reversión**: el código puede revertirse sin tocar la base (la tabla y la columna nuevas quedan sin uso). No hay datos que migrar ni borrar.

## Open Questions

Resueltas (2026-10-05):

- **"Me mueve" y subgéneros**: se declara el género exacto; no cuenta un subgénero cuando el padre ya está declarado, ni al revés.
- **Revalidación de caché** (solo si D14 obliga a cachear): 5 minutos.
- **Idiomas del texto de Wikipedia**: solo `es` y `en`, como el resto de la plataforma.

Sin preguntas abiertas.
