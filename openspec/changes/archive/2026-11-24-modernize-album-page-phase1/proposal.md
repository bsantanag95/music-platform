## Why

La auditoría de la ficha de álbum (2026-11-24, `/es/album/iron-maiden-the-number-of-the-beast` sin sesión a 1440 y 390 px; mockups en
`mockups/album-2026-11/`) encontró una cabecera de recuadros sin impacto y distinta de la ficha de artista recién rediseñada (portada a
sangre, `main` 909b0e30): la carátula en un cuadro de 250 px, una columna «Tu relación» que para el visitante es una caja de 288 px con
una frase, una franja de comunidad que muestra «0 Valoraciones · 0 Lo coleccionan», un título de 36 px y un contenedor de 1152 px
frente a los 1408 del artista. El usuario eligió la propuesta **A · Portada** (24 nov). Esta es la Fase 1 de tres: la cabecera.

## What Changes

- **Portada:** la cabecera pasa a una franja a todo el ancho con la carátula del disco desenfocada de fondo (solo color) y la
  carátula, a lo sumo de 250 px, saliendo de su funda con un disco de vinilo asomando. Sin carátula, el fondo es tinta con el disco
  dibujado y la funda muestra el relleno con el título.
- **Identidad y ficha:** una línea con el tipo de obra y el año, el título en la escala de las portadas rediseñadas, los artistas y una
  ficha en una línea (géneros, fecha, pistas y duración, sello, producción y «N ediciones →»).
- **Acción principal:** para un visitante, «Valorar este disco» (al inicio de sesión) con una frase, en lugar del panel; con sesión,
  el panel «Tu relación» entero en la columna derecha de la portada.
- **Comunidad sin ceros:** la franja de comunidad se omite entera cuando todas sus cifras son 0 y cada celda en 0 se omite.
- **Teléfono:** la funda va primero, a media anchura, y la primera canción no queda más abajo que hoy (743 px a 390).
- **Marco:** contenedor de 88rem, como el artista.

### Goals

- Que el paso de la ficha de artista a la de álbum se sienta de la misma familia y que la carátula sea protagonista.

### Non-Goals

- **Fase 2:** compositores bajo cada canción, columna lateral «En este disco» (formación, producción, ediciones por formato) y la
  escala de títulos de la pestaña.
- **Fase 3:** una sola invitación a opinar (Reseñas y Comentarios siguen separados), la franja de discografía y los estados vacíos.
- Cambiar pestañas, URL, la edición representativa o los datos.
- Mostrar la carátula por encima de 250 px (licencia).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `album-page-layout`: zonas de la página con la portada a todo el ancho, la funda y la acción principal; carátula en el teléfono.
- `album-personal-panel`: el visitante ve «Valorar este disco» en lugar del panel; posición del panel en el teléfono.
- `album-community-stats`: la franja se omite cuando todas sus cifras son 0 y omite las celdas en 0.

## Impact

`src/app/[locale]/(catalog)/album/[id]/(tabs)/layout.tsx`; `src/components/album/AlbumHeader.tsx` (identidad, ficha en línea,
invitación, comunidad); un componente nuevo `AlbumStage.tsx`; las capas compartidas con la portada del artista se mueven a
`src/components/catalog/stage-layers.tsx` (vinilo dibujado, velo, fondo desenfocado) y `ArtistStage` las reutiliza; mensajes
`messages/{es,en}/catalog.json`; `client-messages.json`; tests de la cabecera, el panel y las páginas del álbum;
`docs/05-features/catalog-browsing.md` y `docs/03-data/data-licensing.md` (la carátula del disco como fondo desenfocado). Sin API,
esquema ni dependencias. Las páginas informativas no cambian: la carátula sigue en 250 px para identificar la obra.
