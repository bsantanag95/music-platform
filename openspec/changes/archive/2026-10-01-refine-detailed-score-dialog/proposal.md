## Why

El diálogo de puntaje de `define-detailed-score` es un campo numérico libre de 1 a 100: si el usuario tiene 4★ y escribe 86, sus estrellas pasan a 4,5★. Un texto bajo el campo lo avisa, pero quien no conoce las bandas no entiende por qué escribir un número cambia su nota. La conversión hay que hacerla visible, no explicarla en una línea.

## What Changes

- El campo numérico se reemplaza por un **deslizador** (`<input type="range">` nativo):
  - **Con estrellas**, se limita al tramo de esas estrellas (4★ → 71–80). Las estrellas no cambian desde el diálogo; se cambian con las estrellas.
  - **Sin estrellas**, va de 1 a 100, con una **fila de estrellas en vivo** que se llena al arrastrar (86 → 4½★); al guardar, el servidor deriva las estrellas como hoy.
- Valor actual grande (`86/100`, o `—/100` antes de elegir) con los extremos del rango a los lados, y **botones `−` / `+`** para ajustar de a 1 (siempre, por consistencia y para el móvil).
- Teclado: flechas ±1 y Re Pág / Av Pág ±10 (comportamiento nativo del deslizador).
- **"Guardar" solo se habilita al mover el valor**, para no guardar un valor por defecto sin querer.
- Se retira el aviso "Cambiará tus estrellas de X a Y": con el deslizador acotado ya no puede ocurrir.
- **Ayuda "?"**: un botón junto al rótulo del deslizador abre (como divulgación, no tooltip) un texto corto: el puntaje es opcional y afina las estrellas para desempatar; tabla compacta de las 10 bandas (½★ 1–10 … 5★ 91–100) con la fila de las estrellas actuales resaltada; sin estrellas, el número las elige.

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `album-personal-panel`: el requisito "Puntaje detallado con o sin estrellas previas" se reemplaza por "Puntaje detallado con deslizador" (deslizador acotado, estrellas en vivo, `−`/`+`, guardar tras mover, ayuda). El panel de la canción usa el mismo diálogo.

## Goals

- Que la relación estrellas ↔ puntaje se vea al usarla, sin conocer la tabla.
- Que puntuar nunca cambie las estrellas de forma inesperada.
- Que la tabla de bandas esté a un toque para quien quiera entenderla.

## Non-Goals

- Cambios en la API: puntuar sin estrellas sigue enviando `{ detailedScore }` y el servidor deriva las estrellas; con estrellas, el valor del tramo deriva las mismas estrellas.
- Cambios en dónde o cómo se muestra el puntaje fuera del diálogo (`rating-display`).
- Quitar solo el puntaje conservando las estrellas (hoy se hace cambiando estrellas o borrando la nota); se puede tratar aparte.

## Impact

- Código: `src/components/album/RatingDetailDialog.tsx` (y su test), mensajes `catalog.album.relation.detail` en `messages/{es,en}/catalog.json`. `AlbumRelationPanel` y `SongRelationPanel` no cambian su uso del diálogo.
- Docs: `docs/05-features/ratings-and-reviews.md` (descripción del diálogo).
- Sin API, esquema ni dependencias nuevas.
