## Why

Las fases 1 y 2 del rediseño de `/search` (en `main` 9a0d93a3) dieron el marco, un solo buscador y la respuesta. Quedan dos
problemas de la auditoría (`mockups/search-2026-11/index.html`):

- **Debajo de la respuesta, «The Wall» se repite 24 veces en filas de 48 px.** El dato que distingue cada disco, el artista,
  va en gris pequeño. Con títulos idénticos, una carátula grande y el artista como titular distinguen mejor (mockup A,
  «Rejilla»). En Canciones pasa lo mismo: 25 filas «Creep» con el mismo icono.
- **El estado sin resultados no orienta.** Es una caja de 160 px en una página vacía. Dice lo mismo tres veces, ofrece los
  otros tipos «a ciegas» y no propone adónde ir.

Esta es la fase 3, la última, de la dirección **B · Respuesta primero** (`b-respuesta.html` para el estado sin resultados y
`a-rejilla.html` para la rejilla).

## What Changes

- **Rejilla «Otros discos llamados «x»».** En la búsqueda rápida de Álbumes, si al menos la mitad de los discos de debajo de
  la ficha tienen el mismo título que la consulta, se muestran en una rejilla de carátulas (2 columnas en el teléfono, hasta
  5 en escritorio). Cada tarjeta lleva el artista como titular, categoría · año y el menú «…» del disco. Si no, siguen las
  filas de «Otros álbumes». «Cargar más» respeta la vista elegida.
- **Canciones con el mismo título.** En «Otras canciones con ese título», si el título de la fila es igual a la consulta, el
  titular pasa a ser el artista y el título baja a la meta. Así se lee «Lena Hall · Creep 3:38» en vez de 25 «Creep».
- **Nuevo estado sin resultados** (sin filtro activo, búsqueda rápida):
  - mensaje grande «Nada coincide con «x» en álbumes» y, primero, «¿Quisiste decir …?» si hay sugerencia;
  - «En otros tipos»: para cada tipo de catálogo con coincidencias **en la base propia**, hasta 3 de ellas y «Ver …». Los
    tipos sin coincidencias locales siguen como accesos simples (también Usuarios);
  - consejos (ortografía, menos palabras, «Artista - Título») y la búsqueda avanzada;
  - «O empieza por aquí»: Explorar, Lanzamientos (`/explore#lanzamientos`) y Listas;
  - en la columna lateral, las búsquedas recientes del navegador (las mismas de la portada de `/search`).
- El estado «Nada con estos filtros» (con un filtro activo) y la búsqueda avanzada no cambian.

## Goals

- Distinguir de un vistazo discos y canciones con el mismo título.
- Que una búsqueda sin resultados siempre deje un siguiente paso concreto, sin solicitudes nuevas a MusicBrainz.

## Non-Goals

- Contar resultados de MusicBrainz en otros tipos: solo la base propia, como en la fase 2.
- Cambiar la relevancia, el endpoint o la búsqueda avanzada.
- Rejilla en Artistas: los retratos ya distinguen y la mayoría de homónimos no tiene foto.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `catalog-search`: «Ficha de respuesta en Álbumes» (el resto pasa a rejilla con títulos idénticos), «Sin coincidencias es una lista vacía, no un error» (nuevo estado con salidas) y filas de canciones con el mismo título (requisito nuevo).

## Impact

- `src/components/catalog/search-results/`: `AlbumGrid` (tarjeta con `ResultCover` y `AlbumQuickActions variant="cover"`), cambio en `SongRow`, `SearchEmpty` rediseñado (o un `SearchNoResults` para la rápida), panel de recientes en la lateral.
- `src/components/catalog/search-results/LoadMoreResults.tsx`: vista `grid` para Álbumes.
- `src/services/catalog/search/other-type.ts`: coincidencias locales en **todos** los otros tipos de catálogo para el estado vacío (artistas incluidos).
- `sections.tsx`, `messages/{es,en}/catalog.json`, `src/i18n/client-messages.json`, `docs/05-features/catalog-browsing.md`.
- La Ayuda no describe el estado sin resultados en detalle: sin cambios. Sin esquema, API ni dependencias.
