## 1. API: facetas de estrellas y tipo

- [x] 1.1 `schemas.ts`: `MyRatingsFacetsSchema` suma `stars` (diez `{ value, count }`) y `types` (`MyRatingsCountsSchema`); actualizar los fixtures de `MyRatingsListResponse` en pruebas.
- [x] 1.2 `my-ratings.ts`: consulta agrupada por (estrellas, tipo) con búsqueda y año/década, después de las tres existentes; derivar `facets.stars` (aplica tipo) y `facets.types` (aplica estrellas) en memoria.
- [x] 1.3 `my-ratings.test.ts`: doble de la consulta agrupada en la cadena de Drizzle y pruebas de las facetas (ignora su propio filtro, respeta los demás, biblioteca vacía, diez entradas ordenadas).
- [x] 1.4 `route.test.ts` y `docs/04-api/contracts.md`: respuesta con `facets.stars` y `facets.types`.

## 2. Lógica de facetas en el cliente

- [x] 2.1 `ratings-shared.ts`: `averageStars(facets.stars, starsFilter)` y `adjustFacets(facets, starsFilter, antes, después | null)`; pruebas en `ratings-shared.test.ts`.
- [x] 2.2 `ratings.json` es/en: claves del resumen y del histograma (`averageLabel`, `histogramLabel`, `histogramBar`, `typeSegmentAll`); retirar `starsAll` y `typeAll`.

## 3. Componentes

- [x] 3.1 `RatingsSummary.tsx`: total y desglose (contadores honestos de la Fase 1), promedio y histograma de diez botones con `aria-pressed`, etiqueta accesible, eje en estrellas enteras, 44 px con puntero grueso, oculto sin datos; pruebas.
- [x] 3.2 `RatingsTypeSegments.tsx`: Todo / Álbumes / Canciones con cantidad, `aria-pressed`, 44 px con puntero grueso; pruebas.
- [x] 3.3 `RatingsToolbar.tsx`: buscador y segmentos en la primera fila; quitar los selectores de tipo y estrellas; quedan Año, Década, Ordenar, Agrupar y "Limpiar filtros"; actualizar `RatingsToolbar.test.tsx`.

## 4. Integración

- [x] 4.1 `MyRatingsList.tsx`: guardar `facets` locales, pasar el resumen y los segmentos, activar y quitar `stars` desde el histograma, `type` desde los segmentos, y ajustar facetas al editar y borrar.
- [x] 4.2 `MyRatingsList.test.tsx` y `MyRatingsList.placeholder.test.tsx`: resumen, filtro por barra, filtro por segmento, URL, ajuste tras editar y tras borrar.

## 5. Documentación y verificación

- [x] 5.1 `docs/05-features/ratings-and-reviews.md`: resumen, histograma, segmentos y facetas.
- [x] 5.2 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 5.3 Verificación en el navegador (escritorio y 375 px) desde el worktree. No hubo BD de scratch (no se corrió ningún smoke con escrituras): el SQL real de las facetas se ejercitó en solo lectura contra la BD de desarrollo, y las cifras coincidieron con el total (34 = suma de los diez cubos) y con los filtros combinados.
