## Why

Tras la Fase 1 (`refine-ratings-page-phase1`), la cabecera de `/me/ratings` sigue siendo una línea de texto gris de
12 px y la barra de herramientas es una fila de seis selectores que se parte en dos o tres líneas y compite con
tus discos por la atención. La página no dice cómo es tu gusto y filtrar por estrellas o tipo exige abrir
selectores. Subjetividad es el producto: la distribución de tus notas es lo primero que debería verse, y
tocarla debería filtrar.

## What Changes

- **Resumen en la cabecera:** debajo del título, el total y el desglose por tipo (como hoy), el **promedio** de
  estrellas del conjunto visible y un **histograma de media estrella en media estrella** (10 barras, ½★ a 5★).
  Cada barra es un botón que filtra por esa nota (`stars`); tocarla de nuevo la quita.
- **Segmentos de tipo con contador:** el selector "Tipo" pasa a un control segmentado `Todo · Álbumes ·
  Canciones` con el número de cada uno, en la misma fila que el buscador.
- **Barra más corta:** el selector "Estrellas" desaparece (lo reemplaza el histograma) y el de "Tipo" (lo
  reemplazan los segmentos). Quedan Año, Década, Ordenar y Agrupar en una sola línea.
- **API:** `GET /api/me/ratings` suma `facets.stars` (diez cubos de ½★ con su cantidad) y `facets.types`
  (cantidad por tipo), cada faceta calculada **sin** su propio filtro para que siga siendo clicable (campo
  aditivo; `counts` y `total` no cambian).
- **Facetas al día tras editar:** al cambiar estrellas desde la fila o borrar una nota, histograma y segmentos
  se ajustan en el lugar, sin recargar la lista ni reordenarla.

### Goals

- Mostrar el perfil de notas de la persona de un vistazo y convertirlo en el filtro de estrellas.
- Reducir la barra a lo que hace falta sin perder ninguna capacidad de filtrado.

### Non-Goals

- Chips de filtros activos: cada filtro sigue visible en su propio control (barra del histograma resaltada,
  segmento seleccionado, selectores con su valor), así que serían redundantes.
- Barra fija al hacer scroll (queda para una fase posterior si hace falta).
- Rediseño de Gráfico, Detallada e Índice (Fase 3).
- Promedio del puntaje detallado (`/100`); este resumen es solo de estrellas.
- Cambios de esquema, dependencias o de los otros parámetros de la API.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `my-ratings-view-modes`: nuevo resumen con promedio e histograma de estrellas; nuevo filtro de tipo en
  segmentos con contador; la barra de filtros deja de ofrecer los selectores de tipo y estrellas; el escenario
  de agrupación sobre "los artistas no se valoran" habla del filtro de tipo; las áreas táctiles cubren los
  segmentos y las barras del histograma.
- `my-ratings-library`: la respuesta de `GET /api/me/ratings` suma las facetas `stars` y `types`.

## Impact

- `src/services/ratings/my-ratings.ts` (una consulta agrupada nueva) y su prueba;
  `src/lib/api/schemas.ts` (`MyRatingsFacetsSchema`); `docs/04-api/contracts.md` y
  `docs/05-features/ratings-and-reviews.md`.
- `src/components/ratings/`: `MyRatingsList.tsx`, `RatingsToolbar.tsx`, nuevos `RatingsSummary.tsx` y
  `RatingsTypeSegments.tsx`, `ratings-shared.ts` (ajuste local de facetas) y sus pruebas.
- `messages/{es,en}/ratings.json` (claves nuevas; se retiran `starsAll` y `typeAll`, ya sin uso).
- Sin cambios de esquema ni dependencias. El contrato de la API solo gana campos.
