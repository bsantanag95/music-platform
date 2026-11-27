## Context

`/search` con consulta ya está optimizado: primero lo local, luego MusicBrainz por streaming y relevancia ajustada
(redesign-scoped-search, speed-up-search y las tres fases de refine-search-results). Le falta la presentación.

- `page.tsx` monta un `<main>` de `max-w-3xl` (768 px) con migas, título oculto, `SearchForm` (campo `variant="full"` de `max-w-xl`) y la sección del tipo.
- `sections.tsx` compone cada tipo y comparte casi todo con `/search/advanced` (prop `advanced`).
- `SearchSummary` pinta pestañas, «Resultados para «x»» y la cifra. Los filtros (`FilterPills`, y en Álbumes además `FiltersDisclosure`) van debajo.
- El Header (cliente) siempre muestra `HeaderSearch` en la zona central desde `lg` y un botón de búsqueda debajo de `lg`.
- La cifra es `response.total ?? response.results.length`. MusicBrainz puede devolver `total: 0` aunque la lista traiga coincidencias locales («radiohed»), y `??` conserva ese 0.
- `cachedTag` («en tu catálogo») y `fromCatalog` («En tu catálogo», en las sugerencias) usan la segunda persona aunque no haya sesión.

La auditoría completa, los tres mockups y la recomendación están en `mockups/search-2026-11/` (`index.html`, `b-respuesta.html`).

## Goals / Non-Goals

**Goals:** marco de 88rem con columna lateral, un solo campo de búsqueda en escritorio, pestañas con la cifra, filtros y
«Acotar» en la columna lateral desde `lg`, encabezados de sección legibles, cifra coherente y marca «en el catálogo».

**Non-Goals:** respuesta destacada, fichas de álbum y canción, otros tipos en la columna lateral, rejilla de carátulas,
nuevo estado sin resultados (fases 2 y 3), y cualquier cambio en `/search/advanced`, la relevancia o el endpoint.

## Plan de las tres fases

| Fase | Cambio | Contenido |
| --- | --- | --- |
| 1 | `redesign-search-phase1` (este) | Marco de 88rem y columnas 8/4; campo grande y Header sin campo en `/search`; pestañas con la cifra; filtros y «Acotar» en la columna lateral; encabezados de sección; cifra coherente; «en el catálogo». |
| 2 | `redesign-search-phase2` | **La respuesta.** Artistas: «¿Cuál «x» buscas?» con hasta tres tarjetas con foto, elegidas por una regla nueva (presencia en el catálogo, discos, coincidencia exacta) en lugar de «primera coincidencia exacta». Los homónimos se pliegan («Ver los N»). Álbumes: ficha del primer resultado (carátula, artista, categoría, año, ★ de la comunidad y canciones si la tracklist está en el catálogo). Canciones: ficha de la canción resuelta (duración, disco de origen, tira de discos donde aparece), en lugar de `SongGroupPanel`. Columna lateral: ««x» en <otro tipo>» con hasta tres coincidencias **solo del catálogo propio** (sin solicitudes extra a MusicBrainz). |
| 3 | `redesign-search-phase3` | **Rejilla y sin resultados.** «Otros discos llamados «x»» como rejilla de carátulas cuando los títulos son iguales a la consulta (A). Filas de canciones con el artista como titular. Nuevo «sin resultados»: mensaje grande, cifra del catálogo en los otros tipos con enlace si hay algo, consejos, «O empieza por aquí» (Explorar, Lanzamientos, Listas) y búsquedas recientes del navegador en la columna lateral. |

Cada fase se archiva, se fusiona y se publica antes de empezar la siguiente, como en Explorar y Listas.

## Decisions

### D1. Columna lateral desde `lg`, una sola columna por debajo

Desde `lg`, `grid-cols-12`: los resultados ocupan 8 columnas y la lateral 4, fija (`sticky`) bajo el Header. Por debajo de `lg`
hay una sola columna y el contenido de la lateral va sobre los resultados, como hoy (Persona/Grupo como pastillas; Tipo y Década
de Álbumes tras **Filtros**). Así se conserva el requisito de ver el primer resultado en la primera pantalla de 375 × 812.
*Alternativa descartada:* poner la lateral al final en móvil, como el mockup. Dejaría los filtros después de 25 filas.

Cada sección recibe la lateral como un nodo aparte (`aside`) y la página decide dónde pintarla. Con `advanced`, las secciones
siguen devolviendo lo mismo que hoy, sin lateral, así que `/search/advanced` no cambia. En Usuarios, y en Canciones sin
sugerencia de acotar, la lateral queda vacía y los resultados conservan sus 8 columnas: es el sitio que la fase 2 llena con
««x» en otros tipos».

### D2. Ocultar el campo del Header en `/search`, no desmontarlo

El Header es un componente cliente con `usePathname()`. En `/search` (exacto, sin `/search/advanced`) la zona central se
renderiza con `invisible`: conserva su lugar en la rejilla de tres zonas y no salta al cambiar de página. Además lleva
`aria-hidden` e `inert` para que no reciba foco. Por debajo de `lg` no cambia nada: el control de búsqueda abre la fila
como en todo el sitio. *Alternativa descartada:* quitar el campo de la página y dejar solo el del Header. El Header vuelve a
Artistas y se vacía al navegar (requisito de `header-search`), así que no puede mostrar la consulta en curso.

El atajo `/` ya busca el campo del Header. En `/search` enfoca el campo de la página, marcado con un atributo de datos
(`data-search-page-field`).

### D3. Campo grande: un tamaño más de `ScopedSearchField`

`ScopedSearchField` (variante `full`) recibe `size="page"`, junto al `large` del hero de Inicio: altura 64 px (54 px en móvil), texto de 20–22 px, selector de tipo con
etiqueta (solo icono por debajo de `sm`) y botón Buscar (solo icono por debajo de `sm`). Reutiliza el selector, las
sugerencias y el envío actuales; no es un componente nuevo. El ancho máximo es ~54rem, alineado con la columna principal.
La portada sin consulta usa el mismo campo.

### D4. Pestañas con la cifra; el resumen queda para lectores de pantalla

`SearchTypeTabs` pasa a pastillas (la activa en papel sobre tinta, como el mockup B) y recibe `count` para la activa.
`SearchSummary` deja «Resultados para «x»» como `h2` oculto y pasa la cifra a la pestaña. En el fallback del streaming la
pestaña aún no tiene cifra, igual que hoy el resumen. La cifra usa el mismo formato («más de 1.000», «8 resultados»).

### D5. Cifra coherente: `max(total, listados)`

Una función pura `displayCount(total, listed)` devuelve `Math.max(total ?? 0, listed)`: sin total (MusicBrainz falló), lo listado.
Se usa en Artistas y Álbumes (y en `AlternativeCountFor`, que tiene el mismo problema). Canciones no muestra cifra en la
rápida. *Alternativa descartada:* sumar lo local al total de MusicBrainz. Contaría dos veces lo que está en ambos sitios.

### D6. Encabezados de sección compartidos

Los encabezados «Otros artistas llamados «x»», «Más resultados» y «Otras canciones con este título» pasan a una pieza local
de `search-results` (`ResultsGroupHeading`): un `h3`, porque cuelga del `h2` oculto del resumen. Lleva display, negrita y 20–22 px,
con la cifra en `font-data` pequeña cuando se conoce (homónimos). *Alternativa descartada:* `SectionHeader` de `discovery/`.
Pinta un `h2` y su tamaño compacto (20 px, sin negrita) no se distingue lo suficiente de los nombres de las filas.
Con `advanced` se conservan los encabezados actuales.

### D7. «en el catálogo»

Se cambian los textos `cachedTag` («en el catálogo» / «in the catalog») y `fromCatalog` («En el catálogo» / «In the catalog»)
en ambos idiomas. Se mantiene el mismo punto petróleo. Es un cambio de texto: la condición (`cached`) no cambia.

## Risks / Trade-offs

- [La lateral vacía en Usuarios y Canciones deja un hueco a la derecha hasta la fase 2] → Los resultados conservan 8 columnas (unos 900 px, más que los 768 de hoy) y la fase 2 llena la lateral. Es aceptable entre fases.
- [Ocultar el campo del Header puede desorientar a quien llega de otra página] → El campo de la página es más grande y ya trae la consulta y el tipo. El Header sigue en su sitio y solo se oculta su campo.
- [Los componentes compartidos con `/search/advanced` pueden cambiar sin querer] → Todo lo nuevo depende de `!advanced`. Los tests de `sections.test.tsx` y `search-results.test.tsx` cubren ambos modos y se revisa `/search/advanced` en el navegador.
- [`inert` en un elemento del Header con React 19] → `inert` ya es un atributo booleano soportado. Si no lo fuera, `tabIndex={-1}` en el campo.

## Migration Plan

Solo interfaz: sin datos, esquema ni API. Se despliega con el build; se revierte con el commit.

## Open Questions

- Ninguna para la fase 1. La regla exacta de «¿Cuál «x» buscas?» se decide en la fase 2 con datos reales («pink», «kiss», «icon», «queen»).
