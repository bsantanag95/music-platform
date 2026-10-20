## Why

En `/lists` la misma lista salía hasta tres veces (De la gente que sigues, Populares y Recientes); Recientes, "lo último que publicó la
comunidad", estaba lleno de colecciones generadas por la plataforma; "Para completar" tenía tarjetas de 420 px que no se parecían a
ninguna otra sección; los mosaicos rellenaban con discos grises cuando la lista tenía menos de cuatro imágenes, y las listas de artistas
eran cuatro discos vacíos; una sola Destacada dejaba media fila vacía.

## What Changes

- Orden con sesión: Destacadas → De la gente que sigues → Populares → Para completar → Recientes; cada lista una sola vez.
- Recientes y Populares sin colecciones generadas por plantilla (la búsqueda y los filtros sí las encuentran).
- "Para completar" con la tarjeta compacta de las demás secciones.
- Mosaico con 1, 2, 3 o 4 imágenes sin huecos; fotos de artistas en las listas de artistas.
- Una sola Destacada ocupa la fila, con mosaico mayor.

## Impact

- `src/services/lists/discovery.ts`, `community.ts`, `lists.ts` (`enrichLists`: foto del artista; afecta a todas las tarjetas de lista).
- `ListCoverMosaic`, `ListCard` (`large`), `CommunityListCard`, `CommunityListSection` (`excludeIds`), `CaminoDiscoveryGrid` (`dense`),
  `src/app/[locale]/lists/page.tsx`, `docs/05-features/lists-and-favorites.md`. Sin cambios de esquema.
