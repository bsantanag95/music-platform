## Why

La auditoría de `/search` sin sesión (27 nov 2026, `mockups/search-2026-11/index.html`) encontró una página rápida y con buena
relevancia, pero mal presentada. Los resultados van en una columna de 768 px en un sitio que ya usa 88rem. Hay dos buscadores a la vez
(el del Header vacío y el de la página con la consulta). Los filtros de Álbumes ocupan dos filas antes del primer disco y los
encabezados de sección son texto gris de 15 px. Además hay dos errores visibles: «radiohed» dice «0 resultados» y lista ocho
artistas, y una persona sin sesión ve «en tu catálogo» en discos que no son suyos.

Se eligió la dirección **B · Respuesta primero** (con la rejilla de carátulas de A y los grupos de C), en tres fases como el
Inicio, Explorar y Listas. Esta es la fase 1: el marco, un solo buscador y los arreglos, sin cambiar todavía qué se destaca.

## What Changes

- **Marco de 88rem con dos columnas.** `/search` con consulta usa el marco del resto del sitio y, desde `lg`, una columna principal (8/12) y una lateral fija (4/12). Por debajo de `lg`, una sola columna.
- **Un solo buscador.** En `/search` el campo central del Header se oculta desde `lg` y el campo de la página pasa a ser grande (selector de tipo, texto, Buscar). La tecla `/` enfoca ese campo. Por debajo de `lg` el Header conserva su control de búsqueda, como en el resto del sitio.
- **Pestañas con la cifra.** Las pestañas de tipo pasan a ser pastillas, y la activa lleva la cifra de resultados («Álbumes · más de 1.000»). La línea visible «Resultados para «x»» desaparece porque el campo ya muestra la consulta; queda como título para lectores de pantalla.
- **Filtros y «Acotar» en la columna lateral desde `lg`.** Allí van, siempre visibles, Persona/Grupo en Artistas, Tipo y Década en Álbumes y la sugerencia de acotar por artista en Álbumes y Canciones. Por debajo de `lg` siguen sobre los resultados (Álbumes tras **Filtros**).
- **Encabezados de sección legibles.** «Otros artistas llamados «x»», «Más resultados» y «Otras canciones con este título» pasan a ser encabezados de sección (tipografía de display, con la cifra cuando se conoce).
- **La cifra nunca contradice la lista.** Si MusicBrainz informa un total menor que los resultados listados (por ejemplo 0 con coincidencias locales), se muestra la cantidad listada.
- **«en el catálogo», no «en tu catálogo».** La marca de discografía o tracklist ya en la plataforma, en la búsqueda y en las sugerencias, dice «en el catálogo» / «in the catalog», con o sin sesión.

## Goals

- Usar el ancho de la página y dejar un solo campo de búsqueda visible en escritorio.
- Que el primer resultado aparezca antes: sin filtros encima en escritorio y sin la línea de resumen duplicada.
- Corregir la cifra contradictoria y la marca «en tu catálogo».
- Dejar la columna lateral lista para las fases 2 y 3.

## Non-Goals

- Elegir otra «mejor coincidencia» o mostrar «¿Cuál «x» buscas?»: queda para la fase 2.
- Fichas de respuesta de álbum y canción, y ««x» en otros tipos» en la columna lateral (fase 2).
- Rejilla de carátulas, nuevo estado sin resultados y búsquedas recientes en la columna lateral (fase 3).
- Cambios en `/search/advanced`, en la relevancia, en el endpoint `/api/catalog/search` o en las solicitudes a MusicBrainz.
- Cambios en la portada sin consulta de `/search`, salvo el campo grande.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `catalog-search`: el encabezado compacto pasa a ser campo grande + pestañas con la cifra, con marco de 88rem y columna lateral; la cifra no puede ser menor que la lista; marca «en el catálogo».
- `search-scopes`: las pestañas de tipo llevan la cifra en la activa; filtros y acotar viven en la columna lateral desde `lg`.
- `header-search`: en `/search` el campo central del Header se oculta desde `lg` y `/` enfoca el campo de la página.

## Impact

- `src/app/[locale]/(catalog)/search/page.tsx` (marco, columnas), `sections.tsx` (cifra, filtros en la columna lateral, encabezados), `loading.tsx`.
- `src/components/catalog/search-results/SearchChrome.tsx` (`SearchSummary`, `SearchTypeTabs`, `FilterPills`, `RefineHint`), `FiltersDisclosure.tsx`, `ArtistResults.tsx`, `SongResults.tsx`.
- `src/components/catalog/SearchForm.tsx` y `ScopedSearchField.tsx` (variante grande), `src/components/layout/Header.tsx` / `HeaderSearch.tsx` (ocultar en `/search`, atajo `/`).
- `messages/{es,en}/catalog.json` (`cachedTag`, `fromCatalog`, encabezados). Se regenera `src/i18n/client-messages.json` si cambian textos de componentes cliente.
- Los componentes de resultados se comparten con `/search/advanced`: los cambios de la columna lateral y de los encabezados quedan detrás de `advanced` para no alterarla.
- Páginas informativas: «Ayuda» describe la búsqueda. Hay que revisar si menciona dos buscadores o «en tu catálogo»; si lo hace, se actualiza en ambos idiomas.
- Sin cambios de esquema, API ni dependencias.
