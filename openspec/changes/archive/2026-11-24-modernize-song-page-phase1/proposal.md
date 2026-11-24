## Why

La auditoría de la ficha de canción (2026-11-24, `/es/song/iron-maiden-hallowed-be-thy-name` sin sesión a 1152 y 390 px; mockups en
`mockups/song-2026-11/`) encontró una cabecera de recuadros de 1152 px (álbum y artista: 1408) con un título de 36 px, una caja «Tu
relación» que para el visitante es una frase y un enlace (118 px antes de cualquier contenido en el teléfono), una línea «Todavía sin
actividad de la comunidad» que no aporta nada y una tira de pistas aparte de la cabecera. Los créditos empiezan a 588 px en escritorio
y a 759 px en el teléfono. El usuario eligió **D · Mezcla** (24 nov): la cabecera de **C · Ficha** —una tarjeta compacta que se
distingue de la portada del álbum— y el cuerpo de **A · Escenario** con sus recomendaciones. Esta es la Fase 1 de tres: la tarjeta.

## What Changes

- **Tarjeta:** la cabecera pasa a una tarjeta (superficie con borde) con tres columnas en escritorio: la carátula del disco principal
  (enlazada a él, ≤ 250 px), la identidad con la ficha en dos columnas y una columna lateral con «Recorrer el disco» y la acción
  principal.
- **Ficha en dos columnas:** duración, disco (el principal), escrita por, pista («8 de 8»), género, primera aparición, producción
  (hasta 2 productores), la línea de versión cuando la hay y «N versiones →» hacia la sección de versiones. Solo las filas con dato.
- **Recorrer el disco:** la tira de pistas deja de ser una franja aparte y pasa a la columna lateral de la tarjeta: la pista anterior
  y la siguiente (o «Inicio/Fin del disco»), con su número.
- **Acción principal:** para un visitante, «Valorar esta canción» (al inicio de sesión) con una frase, en lugar del panel; con sesión,
  el panel «Tu relación» entero en la columna lateral.
- **Comunidad sin vacíos:** sin actividad, el bloque de comunidad no se dibuja (desaparece «Todavía sin actividad de la comunidad»);
  con actividad, sigue la franja o la línea de poca actividad, dentro de la tarjeta.
- **Teléfono:** carátula pequeña junto a la identidad, ficha en una columna, «Recorrer el disco» en una fila, sin la frase bajo
  «Valorar». Objetivo medido: créditos a ≤ 680 px a 390 (hoy 759).
- **Marco:** contenedor de 88rem, como álbum y artista.

### Goals

- Una cabecera densa al estilo Metal Archives que se distinga de la portada del álbum sin perder la familia (tipografías, ficha,
  invitación «Valorar»), y nada vacío para el visitante.

### Non-Goals

- **Fase 2:** créditos con la columna «En el disco» (la lista entera del disco con esta pista marcada) y la escala de títulos.
- **Fase 3:** «Aparece en» como franja de carátulas, versiones con año y duración en lugar de «Ver versión», y el cierre con
  comentarios.
- Cambiar la URL, la elección del disco principal, los datos o el panel con sesión por dentro.
- Mostrar la carátula por encima de 250 px (licencia).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `song-page-layout`: zonas con la tarjeta; ficha en dos columnas con disco, pista, producción y versiones; la tira de pistas dentro
  de la tarjeta.
- `song-personal-panel`: el visitante ve «Valorar esta canción» en lugar del panel; posición del panel en la tarjeta y en el teléfono.
- `song-community-stats`: sin actividad, el bloque no se dibuja.

## Impact

`src/app/[locale]/(catalog)/song/[id]/page.tsx`; `src/components/song/SongHeader.tsx` (identidad, ficha, comunidad); la tarjeta (rejilla)
en la propia página y `SongRateInvite` en `SongHeader`; `SongRelationPanel` sin caja (`bare`); `SongTrackStrip.tsx` pasa a una variante compacta para la tarjeta; mensajes
`messages/{es,en}/catalog.json`; `client-messages.json`; tests de la cabecera, el panel y la página; `docs/05-features/catalog-browsing.md`.
Sin API, esquema ni dependencias. Las páginas informativas no cambian.
