## Why

Con la base y el resumen de las fases 1 y 2, lo que sigue flojo son las tres vistas de la lista. En **Gráfico**
(la vista por defecto) la nota solo aparece al pasar el cursor y, al aparecer, el texto se apila sobre la
carátula; una pared de portadas no dice nada hasta que el cursor pasa por encima, y en móvil cada ficha carga
chip, "Sin afinar" y un botón que tapan el arte. En **Detallada** las filas flotan separadas por 16 px sin
guía y "Sin afinar" se repite en más de la mitad de ellas. **Índice** tiene el aspecto de una lista pero no
alinea nada: año, estrellas y nota bailan según el título. Esta fase rehace las tres.

## What Changes

- **Gráfico, nota siempre visible:** bajo cada carátula van el título, una línea de detalle (artista, tipo y
  año según la agrupación), las estrellas y el puntaje. Desaparece el overlay: la carátula solo enlaza a la
  ficha y el puntaje (un botón) abre el diálogo de edición. Sirve igual con ratón, teclado y táctil.
- **Puntaje y "Sin afinar" más callado:** una valoración sin puntaje muestra un guion `—` (con la ayuda
  "Sin afinar" y la acción "Afinar puntaje" como nombre accesible) en lugar de repetir la frase en cada
  fila. Con puntaje se muestra `86/100` en tipografía de datos, con `/100` atenuado. Un componente
  compartido (`RatingScore`) lo da a las tres vistas.
- **Detallada más compacta:** filas separadas por una línea fina en lugar de huecos de 16 px, carátula de
  40 px desde `sm`, estrellas y puntaje agrupados a la derecha con un ancho de puntaje fijo para que las
  columnas se alineen.
- **Índice como tabla:** una `<table>` real con encabezados (Título, Tipo, Año, Estrellas, Nota) que alinea
  las columnas; en móvil se mantienen título (con el artista debajo), estrellas y nota.
- **Textos:** las claves nuevas necesarias; se conserva `untuned`/`untunedAction` como etiquetas accesibles.

### Goals

- Que cada valoración muestre su nota sin necesidad de pasar el cursor, en las tres vistas.
- Que las columnas de datos se alineen y la lista se escanee sin esfuerzo.

### Non-Goals

- Cambios de API, de datos o de los filtros (las fases 1 y 2 ya los cubren).
- Nuevo diálogo de edición o cambios al diálogo de puntaje.
- Cambios a la agrupación, el orden, la paginación o a lo que cada vista muestra bajo un encabezado.
- Barra fija al hacer scroll y chips de filtros (descartados en la Fase 2).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `my-ratings-view-modes`: el modo Gráfico pasa de "nota al pasar el cursor" a "nota visible" (se renombra el
  requisito y se reescribe); Detallada y Índice se redefinen (filas con divisores, tabla con encabezados); la
  regla de "sin datos repetidos" habla de la leyenda de la ficha y no del overlay; las áreas táctiles hablan
  de los botones de puntaje.
- `my-ratings-library`: la marca "Sin afinar" pasa a ser un guion con ayuda y nombre accesible, y el escenario
  de afinar desde la pared habla de la nota bajo la carátula.

## Impact

- `src/components/ratings/`: `RatingTile.tsx` (reescrita), `RatingsGraphic.tsx`, `MyRatingRow.tsx`,
  `RatingsDetailed.tsx`, `RatingsIndex.tsx` (tabla), nuevo `RatingScore.tsx`, y sus pruebas
  (`RatingTile.test.tsx`, `MyRatingRow.test.tsx`, `MyRatingsList.test.tsx`).
- `messages/{es,en}/ratings.json` (encabezados de la tabla del Índice).
- `docs/05-features/ratings-and-reviews.md`. Sin cambios de API, esquema ni dependencias.
