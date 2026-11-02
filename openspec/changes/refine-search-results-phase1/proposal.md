## Why

Primera fase del rediseño de la página de resultados (auditoría del 2026-11-02 sobre un build de producción, cuatro
tipos y cada estado; respuestas recomendadas). La velocidad ya está bien tras `speed-up-search`; lo que falla es:

- **Relevancia**: `the wall` en Álbumes pone el disco de Pink Floyd en el puesto 25. La primera página de
  MusicBrainz (25 de 875.412, todos con puntaje 100) no lo trae: entra como fila local con notoriedad 0, detrás de 24
  sencillos. Además, la coincidencia local trae 10 filas de decenas de "The Wall" guardados por búsquedas anteriores,
  y cuáles 10 es casi arbitrario: a veces el álbum ni entra.
- **Sin coincidencias**: un muro gris con las 13 pastillas de filtro, sin "¿Quisiste decir…?" (la base tiene
  trigramas) ni enlace a la búsqueda avanzada; con un filtro que vacía la lista, nada dice que el filtro es el
  problema.
- **Error**: cuando MusicBrainz no responde y no hay nada local, el error genérico de la app.
- La pestaña del navegador dice "music-platform" en todos los estados; el esqueleto de carga es más angosto que la
  página.

## What Changes

- Señal "artista explorado" (discografía sincronizada) en el orden de Álbumes y Canciones, tras la actividad y antes
  de la notoriedad, y como desempate de la coincidencia local antes de su tope.
- Estado vacío nuevo: título por tipo, "¿Quisiste decir…?" desde el catálogo (`suggestSpelling`), consejos, otros
  tipos y búsqueda avanzada; sin pastillas si no hay filtro; "Quitar filtros" si lo hay.
- Error propio cuando MusicBrainz no responde; aviso de lista parcial más claro.
- Título de pestaña por estado; esqueleto al ancho real.

### Non-Goals

- Encabezado compacto, hoja de filtros en móvil, cifra "más de 1.000" y portada sin consulta (Fase 2).
- Filas más ricas (Fase 3).

## Capabilities

### Modified Capabilities

- `search-query-matching`: artista explorado como señal de orden.
- `catalog-search`: estado vacío, error y título de la pestaña.

## Impact

`src/services/catalog/search/{rank,activity,albums,songs,local-match,spelling}.ts`, `sections.tsx`, `page.tsx`,
`loading.tsx`, `SearchChrome` (`SearchEmpty`), `SearchErrorState`, mensajes `catalog.search.*`, tests y
`docs/05-features/catalog-browsing.md`. Sin cambios de esquema ni de API: usa los índices de trigramas de la 0050.
