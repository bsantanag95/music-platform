## Why

Última fase del rediseño de `/explore` (B · Pasillos con el índice de C). Las fases 1 y 2 resolvieron el marco, la barra de pasillos y las
cuatro primeras secciones. Quedan los hallazgos de la auditoría del 2026-11-21 sobre la segunda mitad de la página:

- **Novedades y Próximos** son dos rieles idénticos de carátulas uno debajo del otro: la cuenta regresiva es lo único que los
  distingue.
- **Premios** repite la misma carátula en tres tarjetas (Bad Bunny ganó tres ceremonias), y la carátula del ganador se lleva la atención
  que debería tener la ceremonia.
- **Salón de la Fama** ocupa una cuadrícula de tarjetas altas para solo dos salones.
- **Mejor valorados** queda al final, lejos de Popular ahora, aunque las dos son la voz de la comunidad.

Además, la especificación aún dice que las décadas cierran la página, algo que el código dejó de hacer en
`redesign-explore-decades`.

## What Changes

- **Lanzamientos:** Novedades y Próximos pasan a **una sección** con la forma del **horario** de Inicio, de dos columnas desde `lg`. Cada
  fila tiene fecha, carátula pequeña, título y artista, y un estado: «Publicado» en las novedades y la **cuenta regresiva** en los próximos.
  Hay 6 filas visibles por parte y el resto en un «Ver N más» nativo. Cada parte conserva su «Ver todo →» y su ancla (`novedades`,
  `proximos`). Los datos siguen siendo los del catálogo.
- **Premios:** pasan a una **fila de ceremonias** con el ganador destacado **como texto**, sin carátula. Cada columna muestra el premio, el
  año en grande, la edición, la categoría, el título y el artista. En el teléfono es una fila deslizable. El hub `/awards` conserva sus
  tarjetas.
- **Salón de la Fama:** **tarjetas compactas** horizontales, lado a lado, con una tira de cuatro carátulas y el nombre y el año al lado.
  El índice `/hall-of-fame` no cambia.
- **Orden:** Colecciones, Popular ahora, **Mejor valorados**, Géneros, Décadas, Lanzamientos, Premios y Salón de la Fama. La barra de
  pasillos queda con 8 entradas: Novedades y Próximos se funden en «Lanzamientos».
- La especificación de la superficie se pone al día con el orden real.

### Goals

- Que la segunda mitad de la página se lea tan rápido como la primera, con una forma propia por sección.
- Barra de pasillos más corta.
- Ninguna carátula repetida en Premios.

### Non-Goals

- Los listados completos de novedades y próximos, el hub de premios, el índice y las clases de los salones.
- El riel de Mejor valorados por dentro (solo cambia de lugar).
- El mapa género × década de la propuesta A.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `album-discovery`:
  - el orden de la superficie;
  - Novedades y Próximos como partes de la sección Lanzamientos;
  - la barra de pasillos con las nuevas anclas;
  - las tarjetas compactas del Salón de la Fama.
- `music-awards`: el «Índice de premios» deja de describir su tarjeta como la de Explorar, que ahora es una fila de texto.

## Impact

- **Página:** `src/app/[locale]/(catalog)/explore/page.tsx` (orden, sección Lanzamientos, anclas).
- **Componentes que cambian:**
  - `ReleaseTimetable`: se mueve de `home/` a `discovery/`, con estado por fila, «Ver todo» y ancla por parte.
  - `AwardsExploreSection`, que usa la nueva fila `CeremonyRow`.
  - `HallOfFameTile`, que gana una variante `compact`.
  - `HallOfFameExploreSection`.
- **Mensajes:** `messages/{es,en}/catalog.json` (encabezado y descripción de Lanzamientos, pasillo).
- **Tests:** los de la portada de Explorar, del horario, de premios y de salones.
- **Documentación:** `docs/05-features/explore.md` y `home.md`.
- **Sin cambios:** API, esquema y dependencias. Las páginas informativas no cambian.
