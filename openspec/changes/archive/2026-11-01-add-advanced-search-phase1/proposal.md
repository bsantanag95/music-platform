## Why

`/search` busca por tipo con pocos filtros: Persona/Grupo en Artistas y categoría y década en Álbumes, todos como
pastillas. Para acotar más ("bandas chilenas que empezaron en los 80", "discos de 1983 a 1986 de Iron Maiden",
"versiones de *Hallelujah* de Jeff Buckley que duran menos de 7 minutos") hay que adivinar el texto justo o revisar
páginas de resultados. El roadmap deja la búsqueda avanzada para un cambio propio (Fase 3, `redesign-scoped-search`).
Hace falta ahora porque el catálogo local ya tiene país, fechas de actividad, años de lanzamiento y duraciones, y
MusicBrainz acepta los mismos criterios como cláusulas de su consulta.

La búsqueda avanzada se hace en tres fases. Esta es la primera:

1. **Fase 1 (este cambio):** panel de filtros en `/search` y filtros que se aplican **igual en las dos fuentes**
   (base local y cláusula Lucene de MusicBrainz), así que el resultado sigue siendo completo.
2. **Fase 2 (`add-advanced-search-phase2`):** filtros **solo del catálogo propio**: género de la taxonomía propia
   (con subgéneros, nunca `tag:` de MusicBrainz), valoración media mínima, premiado o nominado, con carátula, sello y
   compositor o letrista. Llevan el aviso "Filtrando solo el catálogo".
3. **Fase 3 (`add-advanced-search-phase3`):** búsqueda **sin texto** cuando hay filtros ("álbumes de shoegaze de los
   90 con nota ≥ 4").

## What Changes

- **Botón "Filtros" en `/search`**, junto al campo, con el número de filtros activos. Abre un panel debajo del campo
  con los campos del tipo activo. En el Header **no hay botón nuevo**: el desplegable de sugerencias suma la acción
  "Búsqueda avanzada", que abre `/search` con el tipo, el texto y el panel abierto.
- **Formulario `GET`** que escribe parámetros de URL. No guarda estado propio: el resultado se puede enlazar, "atrás"
  funciona y la página sigue siendo un Server Component. Los campos vacíos no llegan a la URL.
- **Filtros de la Fase 1** (local + MusicBrainz):
  - **Artistas:** país (`country`), inicio de actividad desde/hasta (`beginFrom`, `beginTo`; nacimiento o formación)
    y estado (`ended=0|1`: en actividad / ya no), además de Persona/Grupo, que ya existe.
  - **Álbumes:** años desde/hasta (`yearFrom`, `yearTo`) y artista (`artist`), además de categoría y década, que ya
    existen. Un rango de años reemplaza a la década.
  - **Canciones:** artista (`artist`; fija la interpretación sin detectarla) y duración mínima/máxima (`durMin`,
    `durMax`, en segundos).
  - **Usuarios:** sin filtros en esta fase (el botón no aparece).
- **Chips de filtros activos** debajo del resumen de resultados, cada uno con su enlace para quitarlo, y "Quitar
  filtros".
- Con cualquier filtro activo, Artistas **no redirige** por coincidencia exacta única (ya pasa hoy con Persona/Grupo).
- `GET /api/catalog/search` acepta los mismos parámetros opcionales; los valores inválidos se ignoran.

### Goals

- Acotar resultados sin perder cobertura: cada filtro de la Fase 1 filtra lo local y lo de MusicBrainz con el mismo
  criterio.
- No sumar solicitudes a MusicBrainz: los filtros viajan dentro de la misma consulta. El artista explícito en
  Canciones ahorra la búsqueda de artistas.
- Un único contrato de URL para la página y el endpoint.

### Non-Goals

- Filtros solo locales (género, valoración, premios, carátula, sello, autoría): Fase 2.
- Búsqueda sin texto: Fase 3. En esta fase `q` sigue siendo obligatorio.
- Filtros personales ("no lo valoré", "en mi pendiente") y filtros de Usuarios.
- Guardar los filtros en las búsquedas recientes.
- Botón de filtros en el Header.

## Capabilities

### New Capabilities

- `advanced-search-filters`: botón y panel de filtros en `/search`, formulario `GET`, filtros por tipo de la Fase 1,
  su traducción a la base local y a MusicBrainz, chips de filtros activos, validación tolerante de los parámetros y
  convivencia con las pastillas existentes.

### Modified Capabilities

- `catalog-search`: el endpoint `GET /api/catalog/search` acepta los parámetros de filtro nuevos.
- `search-typeahead`: el desplegable suma la acción "Búsqueda avanzada".
- `search-scopes`: la redirección por coincidencia exacta única no ocurre con filtros activos.

## Impact

- **Servicios:** `src/services/catalog/search/params.ts` (lectura de los filtros), `mb-query.ts` (cláusulas
  `country`, `begin`, `ended`, `firstreleasedate`, `artist`, `dur`), `local-match.ts` (condiciones SQL),
  `artists.ts`, `albums.ts`, `songs.ts`.
- **Página y componentes:** `src/app/[locale]/(catalog)/search/page.tsx` y `sections.tsx`, `SearchForm`, nuevo
  `AdvancedSearchPanel` y `ActiveFilterChips`, `ScopedSearchField` (acción del desplegable), mensajes `es`/`en` y
  `src/i18n/client-messages.json`.
- **API:** `src/app/api/catalog/search/route.ts`. Contrato en `docs/04-api/contracts.md`.
- **Docs:** `docs/05-features/catalog-browsing.md` (búsqueda) y `docs/00-product/roadmap.md`.
- Sin migraciones ni dependencias nuevas. Usa columnas que ya existen (`artist.country`, `artist.life_begin`,
  `artist.life_ended`, `release_group.first_release_year`, `recording.duration_sec`).
