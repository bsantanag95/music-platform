## 1. Base compartida (Fase 1)

- [x] 1.1 Crear `src/services/genres/constants.ts` con los umbrales de la página (`GENRE_LIST_MIN_ALBUMS` 3, `GENRE_DECADES_MIN` 2, `GENRE_RAIL_SIZE` 12, `GENRE_REVIEWS_SIZE` 5, `GENRE_ARTISTS_PAGE_SIZE` 24, `GENRE_ABOUT_REFRESH_MS` 30 días), reutilizando `MIN_RATINGS_PER_ALBUM`, `MIN_ALBUMS_FOR_SECTION` y `COMMUNITY_MIN_COUNT` en vez de duplicarlos
- [x] 1.2 En `src/services/genres/read.ts` agregar `albumHasGenre(genreId)` (género efectivo exacto, sin descendientes, correlacionado por el literal `"release_group"."id"`) y `isDescendantGenre(rootId, slug)`; pruebas de ambas, incluida una que verifique que `sub` ajeno al árbol no se acepta
- [x] 1.3 En `src/services/discovery/discovery.ts` convertir `listAlbumsWhere` en `listAlbumsFiltered(condition, { page, category, decade, q, sort })` exportado, con los órdenes `best | popular | newest | oldest | az` (todos con `release_group.id` de desempate) y `q` por `search_normalize(title)` y nombre de artista acreditado, normalizado con `normalizeSearchText` y `escapeLike`; validar `category`, `decade` y paginación con `ApiError("VALIDATION_ERROR", 400)`
- [x] 1.4 Hacer que `listAlbumsByDecade`, `listAlbumsByFamily` y `listAlbumsByGenre` llamen a la función nueva con `sort: "best"` y sin filtros; los tests actuales de `discovery.test.ts` deben pasar sin modificarse
- [x] 1.5 Pruebas de `listAlbumsFiltered`: cada orden (incluye nulos de año al final y desempate estable entre páginas), cada filtro y su combinación, `q` con acentos y por artista, `q` con `%` y `_` literales, validaciones inválidas
- [x] 1.6 Partir `src/services/genres/page.ts`: dejar identidad, familias y árbol; mover los artistas a `artists.ts` y agregar `stats.ts`; actualizar importaciones y `page.test.ts`

## 2. Lecturas del Resumen (Fase 1)

- [x] 2.1 `stats.ts`: una consulta agrupada que devuelva álbumes, artistas (tipo conocido), cantidad y media de valoraciones (`null` bajo `COMMUNITY_MIN_COUNT`) y década de auge (`null` bajo `GENRE_DECADES_MIN`); pruebas de umbral y de la media sobre todas las valoraciones
- [x] 2.2 Árbol con conteos: subgéneros directos con la cantidad de álbumes de su subárbol en una consulta agrupada, ordenados por cantidad y nombre; padres y cercanos como hoy; pruebas de orden, subgéneros sin música y tope de 12
- [x] 2.3 Esenciales: reutilizar la lógica de `listTopRated` con la condición del subárbol y los umbrales (3 valoraciones por álbum, 6 álbumes para mostrar el riel); pruebas con y sin umbral
- [x] 2.4 Novedades: estudio y single/EP con año conocido del subárbol por año descendente; prueba de categorías y de orden
- [x] 2.5 Distribución por década acotada al subárbol (reutilizar `listDecades` con la condición) y omisión bajo `GENRE_DECADES_MIN`
- [x] 2.6 Artistas del género: paginados, con álbumes del género acreditados (`albumInGenreTree` sobre `credit`), foto, `q` y órdenes `albumes | seguidos | az`; pruebas de cada orden, de "álbumes del género y no totales" y de que `seguidos` no expone la cifra
- [x] 2.7 Registrar los tiempos de las consultas del Resumen con `EXPLAIN (ANALYZE)` sobre `rock`, `electronic` y `shoegaze` en la base de scratch y compararlos con el presupuesto de 800 ms; si se supera, aplicar las salidas del diseño en su orden (CTE del subárbol única por request, luego `unstable_cache` de los agregados públicos) y anotar la medición en `docs/05-features/genres.md`

## 3. Página, pestañas y componentes (Fase 1)

- [x] 3.1 Parseo tolerante de `searchParams` (`tab`, `q`, `tipo`, `decada`, `sub`, `solo`, `orden`, `vista`, `page`) en un módulo puro con pruebas: valores inválidos caen al predeterminado y una pestaña desconocida es el Resumen
- [x] 3.2 Reescribir `src/app/[locale]/(catalog)/genre/[slug]/page.tsx`: mantener 308 de mayúsculas y 404, esperar género, árbol y texto guardado, elegir la pestaña y envolver cada riel en `<Suspense>` con `Skeleton`; mantener `generateMetadata`
- [x] 3.3 Partir `GenrePageView.tsx` en componentes por sección bajo `src/components/genres/page/`: `GenreHeader` (migas con familia, título, familias, cifras), `GenreTabs` (`aria-current`), `GenreTree`, `GenreOverview`, `GenreRail`, `GenreArtistCard`, `GenreDecadeBars`; sin `any` y con textos por `useTranslations`
- [x] 3.4 `GenreFilterBar` (cliente): búsqueda, tipo, década, subgénero (solo si hay subgéneros con música), "solo este género", orden y vista; escribe en la URL con `router.replace`, vuelve a `page=1` al cambiar un filtro y degrada a `GET` sin JS; reutiliza `FilterSelect` e `Input`
- [x] 3.5 `GenreAlbumsTab` con cuadrícula (`AlbumCard`) y vista lista (`GenreAlbumRow` con el menú de `AlbumQuickActions`), paginación server-side y estados vacíos distintos (filtros sin resultados con "Limpiar filtros" frente a género sin música)
- [x] 3.6 `GenreArtistsTab` con búsqueda, orden y paginación
- [x] 3.7 Cada riel del Resumen con "Ver todo →" hacia su pestaña y orden, y omisión por sección según los umbrales; aside en `lg` y bajo el contenido en móvil
- [x] 3.8 Reemplazar `GenrePageView.test.tsx` por pruebas de los componentes nuevos: pestañas, omisión de secciones bajo umbral, filtros en la URL, vista lista y estados vacíos
- [x] 3.9 Mensajes en `messages/es/catalog.json` y `messages/en/catalog.json` (`catalog.genres.page.*`) y verificación de paridad de claves

## 4. Comunidad (Fase 2)

- [x] 4.1 Extraer en `src/services/lists/discovery.ts` las condiciones base de "lista pública visible" de `publicListsContainingItemConditions` a una función exportada, y hacer que esa función y la nueva la compartan; las pruebas de `discovery.test.ts` y de la cifra del álbum deben pasar sin cambios
- [x] 4.2 `src/services/genres/lists.ts`: listas con al menos `GENRE_LIST_MIN_ALBUMS` álbumes del subárbol, orden por guardados, álbumes del género y fecha, paginadas, con `enrichPublicLists`; pruebas de umbral, audiencia, perfil privado, cuenta desactivada, bloqueo, retiro oficial y orden
- [x] 4.3 `GenreListsTab` y carrusel del Resumen (hasta 6) reutilizando el componente de tarjeta de listas existente, con "N álbumes de este género" y estado de guardado con sesión; estado vacío con invitación a crear una lista
- [x] 4.4 `src/services/genres/reviews.ts`: últimas `GENRE_REVIEWS_SIZE` reseñas visibles del subárbol con autor desactivado enmascarado y exclusión de bloqueos con el lector (exportar `reviewSelection`/`serializeReview` de `reviews.ts` si hace falta); pruebas de moderación `hidden`, enmascarado y bloqueo
- [x] 4.5 `GenreRecentReviews` con carátula, título, autor, estrellas y extracto, enlazado a `/review/{id}`; se omite sin reseñas

## 5. Personalización (Fase 2)

- [x] 5.1 `src/services/genres/personal.ts`: `getGenreFootprint(userId, genreId)` con álbumes valorados, media, 3 favoritos (desempate por más reciente) y pendientes (`want_to_listen_entry.release_group_id`) del subárbol; pruebas con actividad, sin actividad y aislamiento entre usuarios
- [x] 5.2 `GenreFootprint` (solo con sesión): cifras sin ceros, favoritos con enlace y la invitación a empezar cuando no hay actividad
- [x] 5.3 `src/services/profiles/music-identity.ts`: `addIdentityGenre(userId, slug)` y `removeIdentityGenre(userId, slug)` con una sola sentencia atómica (`array_append` con `NOT slug = ANY(genres)` y `cardinality(genres) < 5`; `array_remove`), validando que el slug sea un estilo visible; distinguir "ya estaba" de "lleno"; pruebas de idempotencia, tope, slug inexistente y edición concurrente
- [x] 5.4 Agregar `MUSIC_IDENTITY_GENRES_FULL` a `ErrorCodeSchema` en `src/lib/api/schemas.ts`, a `messages/{es,en}/errors.json` y a `docs/04-api/errors.md`
- [x] 5.5 Route handler `src/app/api/me/profile/genres/[slug]/route.ts` (`PUT`, `DELETE`) envuelto en `withErrorHandling`, con `await params`, 401 sin sesión, 404 `GENRE_NOT_FOUND` y 409; prueba de la ruta
- [x] 5.6 Cliente HTTP en `src/lib/api/` con validación Zod de la respuesta y `GenreMoveButton` (cliente) con TanStack Query: alterna "Me mueve" / "Ya me mueve", muestra el motivo por código de error y conserva el estado local; prueba del componente
- [x] 5.7 Cifra "Les mueve a N personas": consulta por `slug = ANY(genres)` con perfil público y cuenta activa, `null` bajo `COMMUNITY_MIN_COUNT`; revisar con `EXPLAIN` y, si hace falta, agregar el índice GIN en la migración del grupo 6; pruebas de umbral, perfil privado y cuenta desactivada
- [x] 5.8 Documentar el endpoint en `docs/04-api/contracts.md`

## 6. Sobre el género (Fase 4)

- [x] 6.1 Escribir `docs/02-architecture/adr/0027-textos-de-genero-desde-wikipedia.md` (extiende el ADR 0021: llegar a Wikidata por el `wikidata_id` atado al MBID, CC BY-SA, 30 días, sin retiro a pedido); sumar la entrada de géneros en `docs/03-data/data-licensing.md` sección D
- [x] 6.2 Migración nueva `drizzle/0059_genre_about.sql`: tabla `genre_localized_text` (única por género e idioma, `CHECK` de idioma y de resumen con URL), `genre.wikimedia_synced_at` y, solo si 5.7 lo pidió, `idx_app_user_genres` GIN; espejo en `src/db/schema.ts` (tipo `GenreLocalizedTextRow`) y en `docs/03-data/sql-model.md`; aplicar en scratch
- [x] 6.3 `src/services/genres/about.ts`: lectura por idioma con respaldo al otro idioma indicando cuál es, y recorte del primer párrafo en límite de oración (~600 caracteres); pruebas de idioma, respaldo, recorte y género sin texto
- [x] 6.4 `enrichGenreFromWikimedia(genreId, { dryRun, force })` con candado advisory por género, vigencia de 30 días, `getEntities` y `getIntroExtract` por idioma, conservación ante fallos y marca de sincronización solo si la entidad se leyó; pruebas con el cliente de Wikimedia simulado (ambos idiomas, solo inglés, sin `wikidata_id`, entidad caída, extracto caído, vigente, visitas simultáneas)
- [x] 6.5 Disparar la sincronización con `after()` desde la página cuando el texto esté vencido, sin esperar su resultado, y tragar su error (log) para que no afecte la respuesta; prueba de que la página responde sin texto en la primera visita y con Wikimedia caído
- [x] 6.6 `GenreAbout` en el Resumen: primer párrafo, "Leer más" (`<details>`), atribución "Fuente: Wikipedia" con enlace al artículo (título) y a la licencia CC BY-SA 4.0; se omite sin texto; prueba de atribución, respaldo de idioma y título distinto del nombre
- [x] 6.7 `scripts/backfill-genre-about.ts` (`--limit`, `--dry-run`, `--force`, `--slug`), ordenado por álbumes del género, reanudable y de un solo proceso; documentar su uso en `docs/05-features/genres.md`
- [x] 6.8 Correr el relleno en scratch con `--limit 20` y revisar a mano la coincidencia entre género y artículo (incluidos los nombres curados como "música clásica")

## 7. Documentación, verificación y cierre

- [x] 7.1 Actualizar `docs/05-features/genres.md` (estructura de pestañas, URL, secciones, umbrales, "Me mueve", "Sobre el género") y `docs/05-features/explore.md` (nota de la función compartida `listAlbumsFiltered`)
- [x] 7.2 Ampliar `scripts/smoke-test-genres.ts` para ejercitar contra Postgres real: estadísticas y umbrales, árbol con conteos, filtros y órdenes, listas del género (con perfil privado y bloqueo), reseñas, huella, alta/baja idempotente y tope de "Me mueve", y la lectura/sincronización de textos con Wikimedia simulado; limpiar sus fixtures al terminar y documentar la limpieza en `AGENTS.md`
- [x] 7.3 Verificación en navegador con el servidor de desarrollo del worktree (`pnpm exec next dev -p <puerto>`, copiando antes el `.env` con `DATABASE_URL` de scratch): Resumen, cada pestaña, filtros en la URL, vista lista, sesión y anónimo, móvil y escritorio, claro y oscuro, y un género con pocos datos
- [x] 7.4 Sincronizar la spec principal: confirmar que `openspec validate redesign-genre-page --strict` pasa
- [x] 7.5 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build` en verde
