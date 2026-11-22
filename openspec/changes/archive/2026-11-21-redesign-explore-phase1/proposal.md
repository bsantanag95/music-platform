## Why

La auditoría de `/explore` (2026-11-21, `/es/explore` sin sesión a 1440, 1024, 820 y 390 px; mockups en `mockups/explore-2026-11/`) encontró
que la portada de Explorar presenta ocho secciones con el mismo título de 20 px y la misma separación, sin una frase de entrada, y que la
fila de atajos no queda fija: en una página de ~4.000 px (7.058 px en el teléfono) se pierde al bajar. El contenido mide 1280 px mientras
la portada rediseñada usa 1408, la lista de «Popular ahora» se sale 1,6 px del ancho a 390 px y hay rótulos de 10,4 px. Se eligió la
dirección «B · Pasillos» con el índice tipográfico de la propuesta C. Esta es la Fase 1 de tres: marco, navegación y jerarquía.

## What Changes

- **Marco:** la portada de Explorar pasa al mismo contenedor ancho que Inicio (`max-w-[88rem]`, márgenes fluidos) y gana una frase de
  entrada bajo el título.
- **Barra de pasillos:** la fila de atajos queda fija bajo la cabecera global y marca la sección visible; sin JavaScript sigue siendo una
  fila de enlaces a anclas.
- **Jerarquía:** las secciones de la portada usan títulos de 30–40 px con su descripción (la escala de Inicio), con un encabezado de
  sección compartido entre Inicio y Explorar.
- **Correcciones:** la lista de «Popular ahora» deja de desbordar a 390 px y los rótulos de la portada de Explorar no bajan de 11 px.

### Goals

- Que la navegación acompañe en toda la página y que cada sección tenga un peso visual claro.
- Mismo ancho y escala de títulos que Inicio.

### Non-Goals

- El interior de colecciones, Popular, géneros y décadas: **Fase 2**. Lanzamientos, premios, salones y mejor valorados: **Fase 3**.
- Las vistas filtradas (`?decada=`, `?familia=`, `?genero=`, `?novedades=1`, `?proximos=1`).
- Mostrar cifras de álbumes por género, década o catálogo (decisión de `visual-genre-families`, que se mantiene).
- Tipografías y colores.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `album-discovery`: la navegación rápida de Explorar queda fija bajo la cabecera y resalta la sección visible.

## Impact

`src/app/[locale]/(catalog)/explore/page.tsx`; `src/components/discovery/{ExploreJumpNav,SectionHeader,AlbumRail,CollectionRail,MosaicGrid,
PopularNow}.tsx` y `src/components/awards/{AwardsExploreSection,HallOfFameExploreSection}.tsx` (tamaño de título); `HomeSectionHeading` pasa
a un encabezado compartido; `CollectionSleeves.tsx` (sello a 11 px); mensajes `messages/{es,en}/catalog.json` (frase de entrada);
`client-messages.json`; tests de la navegación y de la portada; `docs/05-features/explore.md`. Sin API, esquema ni dependencias. Las páginas
informativas no cambian.
