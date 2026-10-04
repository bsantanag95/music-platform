## 1. Contrato y servicio

- [x] 1.1 En `src/lib/api/schemas.ts` agregar `MY_RATING_GROUPS = ["type", "none"]` y su esquema; sumar `q` (string recortado, longitud máxima) y `group` a `MyRatingsFiltersSchema`; agregar `counts: { "release-group", recording }` a `MyRatingsListResponseSchema` (mantener `total`)
- [x] 1.2 En `src/services/ratings/my-ratings.ts` validar `q` y `group` en `normalizeFilters` (inválido → `400 VALIDATION_ERROR`) y escapar `%`/`_` en `q`
- [x] 1.3 Aplicar `q` con `ILIKE` sobre título y `PRIMARY_ARTIST_SQL`, en el `WHERE` compartido por lista, `total` y `counts`
- [x] 1.4 Calcular `counts` por tipo con el mismo `WHERE` (agregación con `FILTER`) y devolverlo junto con `total`
- [x] 1.5 Con `group=type` ordenar por `[rango de tipo, ...sortOrder]` (álbumes primero); con `group=none` mantener el orden actual
- [x] 1.6 Pruebas del servicio (`my-ratings.test.ts`): orden por grupo con cada sort, `group=none` mezclado, `q` por título y por artista, `counts` bajo filtros, `q`/`group` inválidos
- [x] 1.7 En `src/app/api/me/ratings/route.ts` y `src/lib/api/ratings.ts` leer/serializar `q` y `group`; ampliar `MyRatingsFiltersParams` y la clave en `src/lib/query/keys.ts`; prueba de la ruta (parámetros nuevos y `400`)
- [x] 1.8 En `src/app/[locale]/me/ratings/page.tsx` leer `q` y `group` de `searchParams` en `parseRatingsFilters` y sembrar con `PAGE_SIZE` 30

## 2. Modo de visualización y utilidades

- [x] 2.1 Crear `rating-view-mode.ts` (tipos, modos, clave `music-platform:rating-view-mode`, parser) y `use-rating-view-mode.ts` calcados de Favoritos; con prueba del hook (por defecto, persistencia, valor inválido, almacenamiento que lanza)
- [x] 2.2 Crear `RatingsModeSwitcher.tsx` (`radiogroup`, flechas, iconos del sistema) con prueba de teclado
- [x] 2.3 Crear `ratings-shared.ts`: `ratingHref`, `groupRatingsByType(items)` (Álbumes → Canciones, omite vacías), claves de título de sección y `ratingAriaLabel`; con pruebas
- [x] 2.4 Extraer `applyRatingsResponse(entry, ratings)` (entrada actualizada o `null` si se borró) y usarlo desde las tres vistas

## 3. Barra de filtros

- [x] 3.1 Crear `RatingsToolbar.tsx` (buscador + `FilterSelect` de tipo, estrellas, año, década, orden y agrupar; "Limpiar filtros" cuando hay filtros activos; década deshabilitada con año)
- [x] 3.2 Prueba de la toolbar: cada control emite el cambio, la década se deshabilita con año, "Limpiar" aparece solo con filtros activos

## 4. Orquestador y vistas Detallada/Índice

- [x] 4.1 Refactorizar `MyRatingsList.tsx`: sumar `q` (debounce 300 ms) y `group` al estado y a la clave de query, `counts` en estado, `PAGE_SIZE` 30, sincronizar `q`/`group` en la URL (sin el modo)
- [x] 4.2 Elevar un único `RatingDetailDialog` al orquestador (`editing`); actualizar/borrar con `applyRatingsResponse`, decrementando `total` y el contador del tipo
- [x] 4.3 Renderizar secciones por tipo con título y contador (`counts`) cuando `group=type` y una lista única cuando `group=none`; encabezado de conteo "N álbumes · N canciones"; mostrar el conmutador solo si hay valoraciones
- [x] 4.4 Crear `RatingsDetailed.tsx` envolviendo `MyRatingRow`; quitar su diálogo propio y recibir `onEdit` (mantener edición inline de estrellas y aviso de puntaje quitado)
- [x] 4.5 Crear `RatingsIndex.tsx`: fila compacta (título + artista, tipo y año en pantallas anchas, nota a la derecha; el puntaje o "Sin afinar" abre el diálogo)
- [x] 4.6 Actualizar `MyRatingsList.test.tsx` y `MyRatingRow.test.tsx` al diálogo elevado, a `PAGE_SIZE` 30 y a los controles nuevos; cubrir secciones, "Sin agrupar", "Cargar más" y borrado con contadores

## 5. Modo Gráfico

- [x] 5.1 Crear `RatingTile.tsx`: carátula cuadrada con `CoverThumb`, `<Link>` con `aria-label` (título, artista, estrellas, puntaje) y overlay `pointer-events-none` visible con `group-hover`/`group-focus-within` (chip con `StarRatingDisplay` y `86/100` o "Sin afinar", título y artista, botón "Editar nota" con `pointer-events-auto`)
- [x] 5.2 Variante `(hover: none)`: chip de nota y botón siempre visibles
- [x] 5.3 Crear `RatingsGraphic.tsx` con la grilla `grid-cols-3 sm:4 md:5 lg:6` y ensanchar el contenedor a `max-w-5xl` solo en este modo
- [x] 5.4 Pruebas de `RatingTile`: overlay con `86/100` y con "Sin afinar", `aria-label`, "Editar nota" abre el diálogo sin navegar, el enlace navega, disco genérico sin carátula

## 6. i18n, documentación y spec

- [x] 6.1 Agregar las claves nuevas a `messages/es/ratings.json` y `messages/en/ratings.json` (modos, agrupar, buscador, secciones, contadores, "Editar nota", etiquetas del overlay); paridad es/en verificada
- [x] 6.2 Actualizar `docs/04-api/contracts.md` (sección "Mis valoraciones": `q`, `group`, `counts`, `400`) y `docs/05-features/ratings-and-reviews.md` (modos, agrupación, overlay)
- [x] 6.3 Confirmar que `openspec validate add-ratings-view-modes` pasa y que los bloques `MODIFIED` conservan todos los escenarios

## 7. Verificación

- [x] 7.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan (en un worktree, copiar `.env` antes del build) — typecheck, lint y build OK; `test`: 43 fallos preexistentes de voseo/tuteo (commit 80671e4) en 24 archivos ajenos, ninguno en ratings
- [x] 7.2 Verificar en el navegador integrado con un usuario con álbumes y canciones valorados: los tres modos, secciones con contadores, "Sin agrupar", búsqueda y filtros en la URL
- [x] 7.3 Verificar la pared: overlay al hover y con Tab, clic fuera del botón navega, "Editar nota" abre el diálogo, edición y borrado en el lugar, emulación móvil (`hover: none`) y modo oscuro

## 8. Correcciones: etiquetas visibles, agrupar por artista y marca de tipo

- [x] 8.1 Agregar `"artist"` a `MY_RATING_GROUPS` en `src/lib/api/schemas.ts`
- [x] 8.2 En el servicio, con `group=artist` ordenar por `lower(artista principal) ASC NULLS LAST`, id del artista, rango de tipo y luego el orden elegido; pruebas del servicio y de la ruta (`group=artist` válido, uno fuera de vocabulario sigue dando `400`)
- [x] 8.3 `FilterSelect`: prop opcional `label` visible sobre el control (aditiva), con prueba
- [x] 8.4 `RatingsToolbar`: pasar `label` en los seis selectores y sumar la opción "Por artista"; actualizar sus pruebas
- [x] 8.5 `ratings-shared`: `groupRatingsByArtist` (por id, orden de aparición, "Sin artista" al final, subgrupos álbum → canción) y `artistHref` del grupo; pruebas
- [x] 8.6 `MyRatingsList`: render de secciones por artista con encabezado enlazado, sin contador, y subencabezados Álbumes/Canciones; claves i18n es/en (`groupArtist`, `sectionNoArtist`); pruebas
- [x] 8.7 `RatingTile`: marca fija de tipo (disco / nota musical), tipo y año en el overlay y tipo en la etiqueta accesible; actualizar pruebas
- [x] 8.8 Actualizar `docs/04-api/contracts.md` y `docs/05-features/ratings-and-reviews.md`
- [x] 8.9 Verificar: typecheck, lint, tests de lo tocado, build y revisión visual (selectores con nombre, agrupar por artista en los tres modos, marca de tipo en la pared)

## 9. Pulido: sin datos repetidos, fila compacta y spec de orden

- [x] 9.1 `displayForGroup` y `display` en los renderers: omitir artista y tipo bajo "Por artista" y el tipo bajo "Por tipo" (Detallada, Índice y overlay de la pared); la etiqueta accesible no cambia; sin separador "·" suelto
- [x] 9.2 `MyRatingRow` compacta (título y nota en la misma línea desde `sm`) y `StarRatingInput` con prop opcional `size="sm"`
- [x] 9.3 Spec: el orden por artista no promete distinguir acentos (solo mayúsculas); documentar en design, specs y `docs/05-features/ratings-and-reviews.md`
- [x] 9.4 Pruebas: `displayForGroup`, fila, tile, índice y lista bajo cada agrupación, y `StarRatingInput` por tamaño
- [x] 9.5 Verificación visual de la fila compacta y de la ausencia de repetidos, y checks finales (typecheck, lint, build)

## 10. Gráfico como modo por defecto

- [x] 10.1 `DEFAULT_RATING_VIEW_MODE = "graphic"`; pruebas del hook y de la lista (defecto Gráfico con almacenamiento vacío, preferencia guardada que manda, resto de pruebas con Detallada guardada)
- [x] 10.2 Actualizar proposal, design (D5 y riesgos), spec de modos y `docs/05-features/ratings-and-reviews.md`
