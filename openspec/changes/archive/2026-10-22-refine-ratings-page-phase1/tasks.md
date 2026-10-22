## 1. Modo de vista sin parpadeo

- [x] 1.1 `useRatingViewMode`: devolver `ready` como tercer elemento (verdadero tras leer `localStorage` en el montaje; también si el almacenamiento lanza); pruebas del hook.
- [x] 1.2 `MyRatingsList`: mientras `!ready`, pintar un marcador de listado `aria-hidden` (pulso solo con `motion-safe`) en lugar de los renderers; cabecera, barra y conmutador no esperan.

## 2. Contadores, "Limpiar filtros" y conmutador

- [x] 2.1 `RatingsToolbar`: exportar `ratingScopeNarrowed` (solo `q`, `stars`, `type`, `year`, `decade`) y agregar la prop `hideClear`.
- [x] 2.2 `ratings.json` es/en: claves `resultsLabel` ("Ningún resultado" / "# resultado(s)") y `artistOrderNote`.
- [x] 2.3 `MyRatingsList`: cabecera con `resultsLabel` cuando `ratingScopeNarrowed`, sin desglose con 0 resultados; "Sin valoraciones" solo con la biblioteca vacía.
- [x] 2.4 `MyRatingsList`: pasar `hideClear` a la barra cuando el estado vacío filtrado ya ofrece el botón; mostrar el conmutador con `items.length > 0 || ratingScopeNarrowed`.

## 3. Ancho único y título

- [x] 3.1 `page.tsx`: `main` como columna `mx-auto w-full max-w-4xl`, `h1` a la izquierda; `MyRatingsList` deja de fijar ancho por modo.

## 4. Áreas táctiles e Índice en móvil

- [x] 4.1 `StarRatingInput` (`size="sm"`): con `pointer: coarse`, estrella de 48×44 px y glifo `size-7`; escritorio sin cambios; prueba de clases.
- [x] 4.2 `MyRatingRow`: contenedor de estrellas y puntaje con `flex-wrap`; botón "Sin afinar" con `min-h-11` en puntero grueso.
- [x] 4.3 `RatingsModeSwitcher` y `RatingsIndex` (botón de puntaje): `min-h-11`/`min-w-11` en puntero grueso.
- [x] 4.4 `RatingsIndex`: título y artista como bloques truncados por separado bajo `sm`, en línea desde `sm`.

## 5. Por artista, carátulas y errores

- [x] 5.1 `MyRatingsList`: contador por artista cuando `!hasNextPage` (suma de `byType`) y línea `artistOrderNote` sobre las secciones.
- [x] 5.2 `CoverThumb`: prop `priority` opcional hacia `AppImage`; `RatingsRendererProps.priorityIds`; `MyRatingsList` calcula los ids de las seis primeras valoraciones y `RatingsGraphic`, `RatingsDetailed` y `RatingTile`/`MyRatingRow` los usan.
- [x] 5.3 `MyRatingRow`: estado `saveFailed`, aviso `saveError` con `role="alert"` y limpieza al reintentar (reemplaza el `catch` silencioso).

## 6. Pruebas, documentación y verificación

- [x] 6.1 Actualizar `MyRatingsList.test.tsx` (ancho único, marcador, contadores, un solo botón, conmutador con filtros, contador por artista, nota de orden) y `RatingsToolbar.test.tsx`, `MyRatingRow`/`StarRatingInput` según corresponda.
- [x] 6.2 Revisar `docs/05-features/ratings-and-reviews.md` y actualizar lo que describa el ancho, el primer render o los contadores de esta página.
- [x] 6.3 `pnpm run typecheck && pnpm run lint && pnpm test` (los tests de `src/components/ratings` y `social`) y `pnpm run build`.
- [x] 6.4 Verificar en el navegador desde el worktree (`next dev -p 3100`): sin parpadeo, ancho único, filtro sin resultados, móvil 375 px (Índice y Detallada).
