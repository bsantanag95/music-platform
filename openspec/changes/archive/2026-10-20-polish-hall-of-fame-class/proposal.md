## Why

La página de una clase de un salón rotulaba "Ingresó" en ámbar en cada incorporación (25 veces, cuando ingresaron todas), mostraba
filas con carátulas de 80 px que se descuadraban cuando un título ocupaba dos líneas, repetía "del disco …" cuando el disco se llama
como la canción y llevaba el nombre del salón como rótulo ámbar en mayúsculas sobre el título, con medio recuadro vacío.

## What Changes

- Incorporaciones como muro de carátulas (6 por fila en pantalla grande), con portada tipográfica si no hay carátula, sin "Ingresó".
- "del disco …" solo si el disco se llama distinto de la canción.
- Cabecera: nombre del salón como línea normal, fondo teñido con una carátula de la clase, mosaico de cuatro carátulas a la derecha y la
  cantidad por categoría enlazada a cada sección.
- `NominationItem` pierde `wonLabel` y los mensajes, `hall.inducted` (ya no se usan).

## Impact

- `HallOfFameClassView.tsx`, `HallOfFameTile.tsx` (exporta `coverUrl`), `NominationItem.tsx`, `messages/{es,en}/awards.json`,
  `docs/05-features/awards.md`. Sin cambios de datos ni de esquema.
