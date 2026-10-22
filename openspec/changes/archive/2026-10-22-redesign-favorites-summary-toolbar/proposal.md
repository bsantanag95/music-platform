## Why

Tras la Fase 1 (`refine-favorites-page-phase1`), filtrar `/me/favorites` por tipo y por audiencia sigue exigiendo
abrir dos selectores sin ninguna pista de cuánto hay en cada opción, y la página no dice cómo se reparten tus
favoritos entre público, seguidores y privado, que es justo lo que esta sección existe para revisar. La Fase 2 de
valoraciones resolvió lo mismo con segmentos y facetas; se repite aquí.

## What Changes

- **Segmentos de tipo con cantidad:** el selector "Tipo" pasa a un control `Todo · Artistas · Álbumes · Canciones`
  con el número de cada uno, en la misma fila que el buscador. Usa `counts`, que ya se calcula sin el filtro de tipo.
- **Fichas de audiencia con cantidad:** el selector "Audiencia" pasa a tres fichas `Público · Seguidores · Privado`
  con su cantidad, que filtran y se quitan al tocarlas de nuevo; el resumen de la cabecera dice cómo se reparten.
  Solo en la vista propia (en el perfil público no hay filtro de audiencia).
- **API:** `GET /api/me/favorites` suma `facets.audience` (`{ private, followers, public }`), calculada con la
  búsqueda y el tipo vigentes pero **sin** el filtro de audiencia, para que cada ficha siga mostrando sus
  alternativas (campo aditivo; `counts` y la lista no cambian). Una consulta agrupada nueva.
- **Facetas al día:** al cambiar la audiencia de una ficha, quitar una o cambiarlas en lote, las cantidades se
  ajustan en el lugar, sin recargar ni reordenar la lista.
- **Barra más corta:** quedan buscador, segmentos, fichas de audiencia, orden y "Limpiar filtros".

### Goals

- Mostrar el reparto del gusto y de la privacidad y convertirlo en filtros de un toque.
- Mantener intacto el modo lectura del perfil público.

### Non-Goals

- Rediseño de las fichas, insignias de audiencia, menú `⋯`, "Deshacer" y modo selección (Fase 3).
- Faceta de audiencia para el perfil público (el visitante no filtra por audiencia).
- Cambios de esquema o de dependencias.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `favorites`: la lista propia suma `facets.audience`; la página usa segmentos de tipo y fichas de audiencia con
  cantidad en lugar de los selectores, y las cantidades se ajustan en el lugar.

## Impact

- `src/services/favorites/favorites.ts` (consulta agrupada) y su prueba; `src/lib/api/schemas.ts`;
  `docs/04-api/contracts.md`; `docs/05-features/lists-and-favorites.md`.
- `src/components/favorites/`: `FavoritesWall.tsx`, `FavoritesToolbar.tsx`, nuevos `FavoritesTypeSegments.tsx` y
  `FavoritesAudienceChips.tsx`, `favorites-shared.tsx` (ajuste local de facetas) y sus pruebas.
- `messages/{es,en}/favorites.json`. Sin cambios de esquema.
