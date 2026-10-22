## 1. API: faceta de audiencia

- [x] 1.1 `schemas.ts`: `FavoriteAudienceFacetSchema` y `facets` opcional en `FavoritesListResponseSchema`.
- [x] 1.2 `favorites.ts`: consulta agrupada por audiencia (`userId`, `q`, `type`; sin `audience`) después de las existentes, solo en `listMyFavorites`.
- [x] 1.3 `favorites.test.ts`: doble de la consulta agrupada y pruebas (ignora `audience`, respeta `q`/`type`, vacío).
- [x] 1.4 `docs/04-api/contracts.md` y `route.test.ts`: `facets.audience`.

## 2. Lógica y mensajes

- [x] 2.1 `favorites-shared.tsx`: `adjustFavoriteFacets` (cambio de audiencia, lote y quitar) y pruebas.
- [x] 2.2 `favorites.json` es/en: claves de los segmentos y fichas (`typeSegmentAll`, `audienceChipsLabel`).

## 3. Componentes

- [x] 3.1 `FavoritesTypeSegments.tsx` y `FavoritesAudienceChips.tsx` con `aria-pressed`, nombre accesible, 44 px con puntero grueso; pruebas.
- [x] 3.2 `FavoritesToolbar.tsx`: buscador y segmentos en la primera fila; fichas de audiencia (solo vista propia), orden y "Limpiar filtros" en la segunda; quitar los selectores de tipo y audiencia.
- [x] 3.3 `FavoritesWall.tsx`: estado `facets`, segmentos y fichas, filtros desde ambos, ajuste en el lugar al cambiar audiencia, quitar y lote.

## 4. Pruebas, documentación y verificación

- [x] 4.1 `FavoritesWall.test.tsx` y pruebas del servicio/ruta actualizadas.
- [x] 4.2 `docs/05-features/lists-and-favorites.md`.
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 4.4 Verificación en el navegador (escritorio, 375 px y perfil público).
