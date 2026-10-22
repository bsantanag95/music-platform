## Context

Fase 3 de la auditoría de `/me/ratings` (las fases 1 y 2 están en `main`). Las tres vistas se construyeron en
`add-ratings-view-modes`: Gráfico con un overlay que se revela al pasar el cursor (y se reduce a chip y botón
con `hover: none`), Detallada con `MyRatingRow` y Índice con una lista de filas flex. Hallazgos de la auditoría:
la nota de Gráfico no se ve en reposo y el overlay tapa la carátula; en Detallada "Sin afinar" se repite en 19
de 34 filas y las filas flotan con huecos de 16 px; en Índice las columnas no se alinean.

Restricciones: sin API nueva; el diálogo de puntaje sigue siendo uno solo en `MyRatingsList`; las estrellas
editables solo existen en Detallada; las etiquetas accesibles actuales (`aria-label` del enlace de la carátula,
`starValue`, `editRatingFor`, `untunedAction`) no deben perder datos; respetar la regla "sin datos repetidos
bajo un encabezado" (`displayForGroup`).

## Goals / Non-Goals

**Goals:**
- Nota visible en reposo en las tres vistas, sin depender de hover ni de `hover: none`.
- Columnas alineadas en Detallada e Índice; filas separadas por divisores.
- Quitar el ruido de "Sin afinar" sin ocultar la acción de afinar.

**Non-Goals:**
- API, filtros, agrupación, orden, paginación, diálogo de puntaje.

## Decisions

**D1. Se elimina el overlay de Gráfico; la leyenda es parte de la ficha y el puntaje es el botón de editar.**
Bajo la carátula (un enlace) van: título (una línea), detalle (artista · tipo · año según `display`), y una fila
con estrellas a la izquierda y el puntaje a la derecha. El puntaje es un botón que abre el diálogo, igual que en
Índice y Detallada, así que no hace falta una píldora "Editar nota" sobre el arte ni una rama `hover: none`.
Alternativas descartadas: (a) overlay solo con "Editar" al pasar el cursor — sigue necesitando una variante
táctil y tapa la portada; (b) nota como chip sobre la esquina de la carátula — tapa el arte en las fichas de 106
px del móvil, justo lo que se quiere evitar. El `aria-label` del enlace conserva título, artista, tipo,
estrellas y puntaje, así que el lector de pantalla no pierde nada.

**D2. Un componente `RatingScore` compartido.** Hoy el botón de puntaje se escribe tres veces (`MyRatingRow`,
`RatingsIndex`, `RatingTile`) con clases y textos casi iguales. `RatingScore` recibe la entrada, `onEdit`, la
etiqueta accesible y una variante (`full`: `86/100` con `/100` atenuado; `compact`: solo `86`, para la ficha
de 106 px). Sin puntaje muestra `—` con `title="Sin afinar"`; el nombre accesible sigue siendo "Afinar
puntaje". Quien lo usa decide la etiqueta del botón con puntaje para conservar las existentes (Detallada:
`86/100`; Índice y Gráfico: `Editar la nota de …`), de modo que no cambia ninguna interacción.

**D3. El guion `—` sustituye a la frase "Sin afinar" como texto visible.** La frase repetida en más de la mitad de
las filas era la mayor fuente de ruido y contradice "presencia ≠ criterio" (no tener puntaje es lo normal).
El guion es la convención de "sin dato" en tablas; `title` y el nombre accesible conservan el significado, y
el enlace de la carátula del Gráfico sigue anunciando "Sin afinar". Alternativa descartada: ocultar el
puntaje sin afinar — quitaría la única forma visible de afinar desde Índice y Gráfico.

**D4. Detallada: divisores y puntaje de ancho fijo, no una tabla.** La fila tiene una carátula, un bloque de
título y artista, y un bloque de estrellas editables y puntaje. Una `<table>` forzaría estrellas editables
dentro de celdas y no aporta aquí. Se cambia `gap-4` por `divide-y` con `py-2` por fila, se achica la carátula a
`size-10` desde `sm`, y el puntaje (`RatingScore`) tiene un ancho fijo alineado a la derecha, así que
estrellas y puntaje quedan en columna entre filas.

**D5. Índice: `<table>` semántica.** Es un dato tabular de verdad (título, tipo, año, estrellas, nota) y una
tabla alinea las columnas sin números mágicos. Encabezados `<th scope="col">` visibles desde `sm` y solo para
lectores de pantalla debajo (`sr-only`). Tipo y año se ocultan debajo de `sm` (como hoy); el título lleva el
artista debajo en pantallas angostas y en línea desde `sm`. El título trunca con una celda `max-w-0`.

**D6. Prioridad de carátula intacta.** `priorityIds` sigue llegando a Gráfico y Detallada; Índice no tiene
carátulas.

## Risks / Trade-offs

- [Quitar la píldora "Editar nota" cambia una interacción conocida] → El puntaje, ya presente en la leyenda, es
  un botón con `aria-label` "Editar la nota de …" y 44 px de alto con puntero grueso; las pruebas cubren que
  abre el diálogo y que no navega.
- [El guion `—` puede leerse como "dato faltante" y no como acción] → `title="Sin afinar"`, nombre accesible
  "Afinar puntaje", foco visible y color de acento al pasar el cursor; en la ficha del Gráfico además enlaza el
  arte a la ficha y el texto de ayuda no se pierde en la etiqueta del enlace.
- [Una tabla real cambia el DOM del Índice (`ul/li` → `table/tr`)] → Se actualizan las pruebas que buscaban
  `closest("li")`; los datos y etiquetas accesibles no cambian.
- [La ficha de 106 px del móvil es estrecha para estrellas + puntaje] → Estrellas de 10 px y el puntaje en
  variante `compact` (solo el número); se verifica a 375 px.

## Migration Plan

Solo front-end; sin migraciones. Revertir es revertir el commit.
