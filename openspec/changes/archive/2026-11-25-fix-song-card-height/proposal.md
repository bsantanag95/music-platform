## Why

Tras la modernización de la canción (`modernize-song-page-phase1..3`, `main` 477c2067), con sesión iniciada el panel «Tu relación»
(~560 px de alto) va en la columna lateral de la tarjeta. La tarjeta es una rejilla en la que identidad y ficha ocupan dos filas y la
columna lateral abarca ambas: el panel estira las dos filas, la tarjeta crece hasta su alto y se abre un hueco entre el título y la
ficha. El usuario pidió que el tamaño de la cabecera no dependa del panel, como en el mockup.

## What Changes

- El panel «Tu relación» sale de la tarjeta y pasa a la columna derecha del cuerpo, encima de «En el disco» (en el teléfono, justo
  después de la tarjeta), con su caja propia como en el resto de páginas.
- La columna lateral de la tarjeta queda con «Recorrer el disco» y, para el visitante, «Valorar esta canción»; con sesión y sin
  tira, la tarjeta no tiene columna lateral.
- La fila de la identidad ya no se estira: el alto sobrante va a la fila de la ficha y la columna lateral no se alarga.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `song-page-layout`: zonas con el panel en el cuerpo.
- `song-personal-panel`: posición del panel con sesión.

## Impact

`src/app/[locale]/(catalog)/song/[id]/page.tsx` (tarjeta y rejilla del cuerpo); `SongRelationPanel.tsx` (se retira la variante sin
caja); test de la página; `docs/05-features/catalog-browsing.md`. Sin datos ni API.
