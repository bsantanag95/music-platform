## Context

`RatingDetailDialog` (usado por `AlbumRelationPanel` y `SongRelationPanel`) es hoy un `<input type="number">` de 1 a 100, con una línea de equivalencia ("86 → 4,5★") y un aviso cuando el número cambiaría las estrellas vigentes. Guarda `{ detailedScore }` y el servidor deriva las estrellas (`starsFromScore`). `scoreRange(stars)` ya devuelve el tramo de unas estrellas. `StarGlyph` / `StarRatingDisplay` dibujan estrellas con medias.

## Goals / Non-Goals

**Goals:** conversión visible, estrellas estables cuando ya existen, ayuda accesible.

**Non-Goals:** API, presentación fuera del diálogo, quitar solo el puntaje.

## Decisions

**D1. Deslizador nativo.** `<input type="range">` con `min`/`max`/`step=1`: el navegador da teclado (flechas ±1, Re Pág / Av Pág ±10 en los navegadores principales; si alguno no lo da, se completa con un `onKeyDown`), rol `slider` y anuncio del valor. Se le da `aria-valuetext` legible ("86 de 100, 4,5 estrellas"). Alternativa descartada: un deslizador propio (reimplementa accesibilidad sin ganancia).

**D2. Rango según las estrellas.** Con estrellas: `scoreRange(own.stars)`; sin estrellas: 1–100. Como cualquier valor del tramo deriva las mismas estrellas, guardar `{ detailedScore }` no las cambia y la API no se toca. Se retiran el aviso `starsChange` y su mensaje.

**D3. Estado "sin elegir".** El valor del deslizador se guarda como `number | null`: `null` hasta que el usuario lo mueve (o el puntaje vigente si ya existe). Con `null`, el número grande muestra `—/100`, el pulgar se sitúa en el centro del rango, el deslizador se atenúa (para que el pulgar centrado y la barra ámbar no parezcan un valor elegido) y "Guardar" está deshabilitado. "Guardar" se habilita solo cuando el valor difiere del vigente. Alternativa descartada: arrancar en el mínimo (invita a guardar un valor no elegido).

**D4. `−` / `+` siempre.** Dos botones de 44 px que suman o restan 1 dentro del rango (deshabilitados en los extremos). Desde `null`, el primer toque fija el centro del rango ± 1. Útiles en el 1–100 del móvil, donde cada punto mide ~3 px; en el tramo de 10 se mantienen por consistencia.

**D5. Estrellas en vivo sin estrellas previas.** Encima del deslizador, `StarRatingDisplay` con `starsFromScore(valor)` (vacía con `null`). Con estrellas previas se muestra la fila fija de las estrellas vigentes y el rótulo del tramo ("4★ · 71–80"), para que se entienda por qué el rango es ese.

**D6. Ayuda como divulgación.** Un botón `?` (`aria-expanded`, `aria-controls`, nombre accesible "¿Cómo funciona la puntuación detallada?") junto al rótulo del deslizador muestra/oculta un bloque dentro del diálogo: dos frases y una tabla de 10 filas (estrellas → puntos) con la fila de las estrellas vigentes resaltada (peso, no color: Regla de Rareza) y marcada con `aria-current="true"`. Sin estrellas, se añade "Si todavía no pusiste estrellas, el número las elige por vos." No es un tooltip: funciona en táctil y con lector de pantalla. Va junto al rótulo y no en el título porque `ui/Dialog` dibuja el título como texto; no se cambia ese componente compartido.

**D7. Textos.** Mensajes nuevos en `catalog.album.relation.detail` (es/en): rótulo del tramo, valor vacío, `aria-valuetext`, `−`/`+`, botón y contenido de la ayuda, cabeceras de la tabla. Se retiran `starsChange` y `hint`/`equivalence` si quedan sin uso.

## Risks / Trade-offs

- [Quien quería 86 con 4★ ya no puede hacerlo desde el diálogo] → buscado: las estrellas se cambian con las estrellas; el tramo visible lo explica.
- [Teclado Re Pág/Av Pág varía entre navegadores] → se verifica en la prueba manual y se añade `onKeyDown` si falta.
- [Más elementos en un diálogo pequeño en móvil] → la ayuda está plegada por defecto; se verifica a 375 px.

## Migration Plan

Solo UI. Rollback: revertir el commit.
