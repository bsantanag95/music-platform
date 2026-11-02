## Why

La Fase 1 (`add-advanced-search-phase1`) dejó la búsqueda avanzada como un panel de filtros bajo el buscador rápido de
`/search`, con el texto siempre obligatorio. La persona prefiere el modelo de Metal Archives: una **página propia** con
una pestaña por entidad (Artistas, Álbumes, Canciones). Cada pestaña tiene su formulario, el nombre o título es **un campo
más** (con "¿Coincidencia exacta?") y se puede buscar sin él ("grupos chilenos formados en los 80", "los discos de
estudio de Iron Maiden entre 1983 y 1986", "las canciones de *Grace*"). El panel de la Fase 1 mezcla las dos cosas:
un buscador rápido con filtros agregados.

Los filtros de la Fase 1 no se pierden: pasan a ser campos de esos formularios, con el mismo contrato de URL y el mismo
servicio. Además se suman los campos que MusicBrainz también indexa (ciudad o región del artista, título del álbum de
una canción, tipo de lanzamiento múltiple, varios países), así que el resultado sigue completo y no solo lo del catálogo
propio.

## What Changes

- **Nueva página `/search/advanced`** con pestañas **Artistas · Álbumes · Canciones** (`?type=`). Cada pestaña tiene su
  formulario `GET`, y los resultados van debajo con las mismas filas que `/search`. Cambiar de pestaña conserva los
  campos que el otro tipo entiende.
- **Campos por pestaña** (todos aplicados igual a la base local y a MusicBrainz):
  - **Artistas:** nombre (+ exacto), tipo (persona/grupo), país (varios), ciudad o región, año de inicio desde/hasta y
    estado.
  - **Álbumes:** título (+ exacto), artista (+ exacto), año desde/hasta y tipo de lanzamiento (varios).
  - **Canciones:** título (+ exacto), artista (+ exacto), álbum (+ exacto), tipo de lanzamiento (varios) y duración.
- **El nombre o título es opcional:** basta con un campo cualquiera. Sin ningún campo, la página muestra el formulario
  vacío y no busca.
- **Paginación en Artistas** cuando hay más resultados de MusicBrainz ("Cargar más"), necesaria sin nombre.
- **`/search` vuelve a ser el buscador rápido:** se retiran el botón "Filtros", el panel y los chips. Un enlace
  "Búsqueda avanzada" junto al campo abre la página nueva con el tipo y el texto cargados. Un enlace de la Fase 1 con
  filtros (`/search?...&country=AR`) **redirige** a `/search/advanced` con los mismos parámetros. Las pastillas rápidas
  (Persona/Grupo, categoría, década) siguen en `/search`.
- **Header:** "Búsqueda avanzada" del desplegable apunta a `/search/advanced?type=<tipo>&q=<texto>`.
- **API:** `GET /api/catalog/search` acepta `q` vacío cuando hay al menos un criterio, y suma `exact`, `artistExact`,
  `album`, `albumExact`, `area`, `country` y `category` repetibles, y `offset` en Artistas.

### Goals

- Una búsqueda avanzada por entidad, como en Metal Archives, sin perder la cobertura de MusicBrainz.
- Un solo servicio y un solo contrato de URL para el buscador rápido, la página avanzada y el endpoint.
- Que ningún criterio sume solicitudes a MusicBrainz más allá del presupuesto por tipo.

### Non-Goals

- **Campos solo del catálogo** (género de la taxonomía propia, sello, número de catálogo, formato, país del artista en
  Álbumes, valoración, premios): van en un cambio siguiente, con el aviso "solo catálogo".
- **Mes** en el rango de fechas de Álbumes: la base local solo guarda la fecha completa cuando tiene precisión diaria.
- Campos sin datos o con licencia incompatible: temas líricos, letras, notas, información de grabación, descripción de
  versión, código de barras.
- Estados de artista más finos que "en actividad / ya no" (MusicBrainz no distingue "en pausa" ni "cambió de nombre").
- Búsqueda avanzada de Usuarios.

## Capabilities

### New Capabilities

<!-- Ninguna: la página nueva reemplaza los requisitos de `advanced-search-filters`. -->

### Modified Capabilities

- `advanced-search-filters`: deja de ser un panel en `/search` y pasa a ser la página `/search/advanced` con pestañas,
  formularios por entidad, nombre o título opcional, coincidencia exacta y los campos nuevos. Se retiran los requisitos
  del panel, los chips y el cambio de tipo de la Fase 1.
- `catalog-search`: el endpoint acepta `q` vacío con criterios, los parámetros nuevos y la paginación en Artistas.
- `search-typeahead`: "Búsqueda avanzada" apunta a la página nueva.
- `search-scopes`: `/search` redirige a `/search/advanced` cuando la URL trae criterios avanzados.

## Impact

- **Servicios:** `src/services/catalog/search/` (`filters.ts` → criterios por tipo con listas y exactos, `mb-query.ts`,
  `local-match.ts`, `artists.ts`, `albums.ts`, `songs.ts`, `params.ts`, `types.ts`).
- **Páginas y componentes:** nueva `src/app/[locale]/(catalog)/search/advanced/` (página, `loading.tsx`), formularios
  por pestaña en `src/components/catalog/advanced-search/`; `/search` (`page.tsx`, `sections.tsx`, `SearchForm`,
  `SearchChrome`) sin panel ni chips; `ScopedSearchField`; `LoadMoreResults` (Artistas); se retiran
  `AdvancedSearchPanel` y `ActiveFilterChips`.
- **API y esquemas:** `src/app/api/catalog/search/route.ts`, `src/lib/api/catalog.ts`, `src/lib/api/schemas.ts`
  (`total`/`nextOffset` en Artistas). Contrato en `docs/04-api/contracts.md`.
- **Docs:** `docs/05-features/catalog-browsing.md`, `docs/00-product/roadmap.md`.
- **i18n:** mensajes `es`/`en` y `src/i18n/client-messages.json`.
- Sin migraciones ni dependencias nuevas.
