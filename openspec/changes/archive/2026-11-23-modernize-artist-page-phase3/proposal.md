## Why

La auditoría de la ficha de artista (2026-11-21, `mockups/artist-2026-11/`) contó 13 controles antes del primer disco, mezclados en
una sola barra donde las secciones, el buscador, el filtro, «Agrupar» y «Vista» se reparten el espacio sin rótulos visibles, y
encontró dos errores en la grilla: el título de un disco sin carátula queda debajo de la etiqueta «EP» o «★ Mejor valorado» (las dos
van arriba a la izquierda), y una carátula que falla antes de que la página se hidrate muestra el icono de imagen rota del navegador
en lugar del relleno con título. Además los títulos de bloque («Álbumes», «EP») miden 16 px, menos que «Comentarios» (20 px). Es la
Fase 3 y última de la propuesta **D · Mezcla** (Fases 1 y 2 publicadas: `main` 463ed015 y 0ebebbbf). El usuario pidió conservar el
orden, la agrupación y la vista por defecto de la discografía (decisión del 22 de noviembre).

## What Changes

- **Barra en dos filas:** arriba las secciones (en el teléfono, una línea que se desplaza de lado, como hoy); debajo el buscador, el
  filtro personal, «Agrupar» y «Vista», con sus rótulos visibles desde la tableta. La barra sigue fija bajo las pestañas.
- **Título sin choque:** el relleno de un disco sin carátula deja libre la esquina de las etiquetas cuando la tarjeta las lleva.
- **Sin icono de imagen rota:** una carátula que falla —también antes de la hidratación— cae al relleno con título en la grilla y al
  disco dibujado en la tabla.
- **Escala de títulos:** los títulos de bloque de la grilla y la tabla suben a la escala de «Comentarios».
- **Sin cambios** en el orden (año ascendente), la agrupación por defecto (Tipo si está disponible), la vista por defecto (grilla en
  Principal, tabla en el resto) ni en la elección guardada en el navegador.

### Goals

- Que la barra se lea de un vistazo y que ninguna carátula se vea rota o tapada.

### Non-Goals

- Cambiar qué discos se muestran, su orden o su agrupación.
- La tabla (columnas, orden por columna) y las acciones rápidas «…».
- Las carátulas fuera de la página de artista (feed, listas, búsqueda), salvo que compartan `CoverThumb`.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `artist-discography-view`: la barra fija pasa a dos filas en cualquier viewport; un disco sin carátula o con carátula que falla
  muestra su título sin quedar tapado por las etiquetas.

## Impact

`src/components/artist/ArtistDiscography.tsx` (barra, títulos de bloque, relleno con etiquetas); `src/components/catalog/
{TitleTile,CoverThumb,LazyCoverImage}.tsx` (espacio para etiquetas, caída ante errores previos a la hidratación, relleno a medida);
mensajes `catalog.artist.discography` (rótulos «Agrupar» y «Vista» si no existen); tests de la discografía y de `CoverThumb`;
`docs/05-features/catalog-browsing.md`. Sin API, esquema ni dependencias. Las páginas informativas no cambian.
