## Why

Tercera y última fase del refinamiento de la página de álbum (auditoría del 2026-10-31, maqueta en
https://claude.ai/artifact/LZtXMAPwngVjJPDS7WiNkM; la persona eligió las opciones recomendadas: lista de reseñas con
extracto y formulario plegado). Quedan las pestañas de contenido:

- **Reseñas**: el índice es una tabla de título · estrellas · usuario · fecha, sin extracto ni avatar, que no ayuda a
  decidir qué reseña abrir. Debajo, el formulario completo (estrellas, título, cuerpo y botón) ocupa todo el ancho
  siempre, aunque el panel ya ofrece "Escribir reseña". Con 0 reseñas el vacío es un párrafo suelto.
- **Ediciones**: la columna Formato muestra el texto de MusicBrainz en inglés ("12" Vinyl", "Cassette", "8-Track
  Cartridge") junto a filtros en español; los filtros salen en orden de aparición y sin cifras; con 151 ediciones la
  cabecera de la tabla se pierde al bajar; la edición mostrada se marca con un "· mostrada" fácil de pasar por alto.

## What Changes

- **Índice de reseñas como lista**: monograma del autor, titular (título o extracto), autor y fecha, nota a la derecha
  y, si hay título, dos líneas del cuerpo. Mismo orden, paginación y modal.
- **Formulario plegado**: sin reseña propia, una invitación con el botón "Escribir reseña" que abre el formulario; el
  enlace del panel lo sigue abriendo. Ancho de lectura (`max-w-3xl`).
- **Vacío de reseñas** con `EmptyState`.
- **Ediciones**: formatos de MusicBrainz traducidos conservando la medida ("Vinilo 12″"); filtros en orden fijo (CD,
  Vinilo, Casete, Digital, Otros) con su cantidad; cabecera de la tabla fija bajo las pestañas en escritorio; la edición
  mostrada con un distintivo "Mostrada". Los mismos nombres de formato en las pistas adicionales.

### Non-Goals

- Foto de perfil en el índice: `Review` no la trae y, como en el resto de superficies salvo el feed, se usa el
  monograma. Sumarla sería un cambio de contrato de la API.
- El vacío de los comentarios: el componente es compartido con artista y canción, que conservan su línea de texto.
- El ranking de la edición representativa (en The Dark Side of the Moon es un casete de 1973): es de datos.

## Capabilities

### Modified Capabilities

- `album-review`: índice como lista con extracto; formulario plegado; vacío con `EmptyState`.
- `catalog-album`: formatos traducidos, filtros con cifras, cabecera fija y distintivo de la edición mostrada.

## Impact

`ReviewIndex`, `ReviewComposer`, `EditionsTable` (`describeFormats`, `formatName`), `EditionExtraTracks`, mensajes de
`catalog.album.reviews` y `catalog.album.editions`, tests. Sin cambios de esquema ni de API.
