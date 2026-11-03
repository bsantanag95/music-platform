## Why

Segunda fase del rediseño de los resultados de búsqueda (auditoría del 2026-11-02, respuestas recomendadas). En móvil el
primer resultado quedaba a ~1.150 px: título "Buscar", etiqueta, campo, "Buscar" y "Búsqueda avanzada" a lo ancho,
encabezado, "Buscar «x» en:", 13 pastillas en 5 líneas y la sugerencia. La cifra "875.412 resultados" es el total de
MusicBrainz, no lo que se recorre. Sin consulta, la página era un campo vacío. El aviso "Buscando en MusicBrainz…"
estaba arriba, lejos de donde aparecen las filas nuevas.

## What Changes

- Encabezado compacto con consulta: título y etiqueta solo para lectores de pantalla, campo y botón en una fila,
  "Búsqueda avanzada →" como enlace, pestañas de tipo en lugar de "Buscar «x» en:".
- Cifra exacta hasta 1.000 y "más de 1.000" por encima.
- Móvil: categoría y década de Álbumes tras un botón "Filtros · N".
- Portada sin consulta: recientes como pastillas, "Prueba con" (lo más activo estos días) y el consejo «Artista - Título».
- Aviso de streaming bajo lo local, con dos filas de esqueleto.

### Non-Goals

- Filas más ricas (Fase 3).

## Capabilities

### Modified Capabilities

- `search-scopes`: pestañas de tipo; la avanzada como enlace.
- `catalog-search`: encabezado compacto, cifra acotada, filtros en móvil, portada y aviso de streaming.

## Impact

`page.tsx`, `sections.tsx`, `SearchChrome` (`SearchTypeTabs`, `SearchSummary`, `PendingRemote`),
`FiltersDisclosure` y `SearchLanding` (nuevos), `SearchForm`, `ScopedSearchField` (`labelHidden`),
`RecentSearches`, `src/services/catalog/search/try-suggestions.ts` (nuevo), mensajes `catalog.search.*`
(sin `results.inType`), tests y `docs/05-features/catalog-browsing.md`. Sin cambios de esquema ni de API.
