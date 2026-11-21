## Why

La Fase 1 (`redesign-explore-phase1`) dio a `/explore` marco, barra de pasillos fija y jerarquía de títulos, pero el interior de las cuatro
primeras secciones sigue como lo encontró la auditoría del 2026-11-21 (`mockups/explore-2026-11/`):

- **Colecciones** es un riel de 10 que muestra 6 y esconde 4 tras un desplazamiento que nadie garantiza.
- **Popular ahora** dedica media fila al n.º 1 de los álbumes.
- **Géneros** (17 familias más 3 tras «Más») y **Décadas** (8 más las anteriores) son dos muros de mosaicos 2×2 que se ven iguales y miden
  ~2.000 px en el teléfono.

Se eligió «B · Pasillos» con el índice tipográfico de C, y el usuario decidió:

- un índice sin cifras;
- en Géneros, 6 familias en grande y el resto en índice;
- en Décadas, una línea de tiempo en escritorio y un índice en el teléfono.

Esta es la Fase 2 de tres.

## What Changes

- **Colecciones:** pasan del riel al **mosaico de Inicio**: una destacada, cuatro medianas y una a lo ancho, sin desplazamiento en
  escritorio. En el teléfono, una fila táctil. Muestran hasta 6 tarjetas, con el sello de familia, y las demás quedan en «Ver todas».
- **Popular ahora:** la pestaña Álbumes pasa a un **top numerado** con la posición en cifras grandes junto a cada carátula: rejilla de 6
  columnas en escritorio, 4 en `md` y fila táctil en el teléfono. Artistas y Canciones siguen como ranking con el n.º 1 en grande.
- **Géneros:** las **6 primeras familias principales** (orden de la taxonomía) como tarjetas grandes con sus carátulas, y **el resto** (11
  principales y las 3 secundarias al final) en un **índice tipográfico** de enlaces, siempre visible y sin cifras. Desaparece el
  desplegable «Más».
- **Décadas:** desde `lg`, una **línea de tiempo** de la más reciente a la más antigua, con el año en grande y un mosaico de carátulas por
  década. Por debajo de `lg`, un **índice tipográfico** en dos columnas. Las décadas anteriores a 1950 se agrupan en «Antes de 1950», con un
  enlace de texto a cada una, y desaparece el desplegable «Décadas anteriores».
- `MosaicGrid` (solo lo usaba la portada de Explorar) se retira. `CollectionMosaic` pasa a `discovery/` y gana el sello de familia, opcional
  (Inicio no lo usa).

### Goals

- Que cada sección tenga una forma propia y legible de un vistazo.
- Que géneros y décadas dejen de alargar la página en el teléfono.
- Ninguna cifra de catálogo.

### Non-Goals

- Lanzamientos, premios, salones, mejor valorados y el orden de las secciones: son la **Fase 3**.
- Las vistas filtradas (`?familia=`, `?decada=`, …), el hub `/explore/collections` y la página de género.
- El cálculo de carátulas de familias y décadas (se reutiliza tal cual).
- Las cifras por familia o década, y el mapa género × década de la propuesta A (futuro, aparte).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `album-discovery`: cambian estas secciones de la portada de Explorar:
  - colecciones destacadas, de riel a mosaico de 6;
  - familias de géneros, a 6 en grande más un índice;
  - «Popular ahora», con el top numerado de álbumes;
  - décadas, a línea de tiempo en escritorio e índice en el teléfono.

## Impact

- **Página:** `src/app/[locale]/(catalog)/explore/page.tsx`.
- **Componentes nuevos** en `src/components/discovery/`: `GenreFamilies` y `DecadeTimeline`.
- **Componentes que cambian:**
  - `CollectionMosaic`: se mueve de `home/` a `discovery/` y gana el sello de familia.
  - `PopularNow`, con un nuevo `PopularTop`.
- **Componentes que se retiran:** `MosaicGrid`.
- **Mensajes y textos de cliente:** `messages/{es,en}/catalog.json` (descripciones e índice) y `client-messages.json`.
- **Tests:** `discovery-sections.test.tsx`, `explore-collections-pages.test.tsx`, `CollectionMosaic.test.tsx` y los de las piezas nuevas.
- **Documentación:** `docs/05-features/explore.md`.
- **Sin cambios:** API, esquema, consultas y dependencias. Las páginas informativas no cambian.
