## Why

La auditoría de la página de álbum (2026-10-31, The Dark Side of the Moon y Man's Best Friend en 1440, 1280 y 375 px,
sin sesión y con una cuenta de prueba; maqueta en https://claude.ai/artifact/LZtXMAPwngVjJPDS7WiNkM) encontró errores
visuales y diferencias con la página de artista, que acaba de cerrar su segunda pasada:

- **Pestañas en móvil**: la barra mide 412 px en 375; "Reseñas (2" queda cortada y se ve la barra de desplazamiento.
  Además no quedan fijas al bajar, a diferencia de artista.
- **Fila de canción en móvil**: la segunda línea reserva el hueco de la nota propia aunque no exista; el corazón queda
  suelto a mitad de la fila y cada fila mide ~93 px.
- **Tres controles segmentados distintos** en Créditos (píldora ámbar), Ediciones (chips con borde ámbar) y Reseñas
  (enlaces ámbar subrayados).
- **Títulos que repiten la pestaña**: Ediciones y Reseñas muestran un h2 con el mismo nombre que la pestaña activa;
  Canciones y Créditos no.
- **Ámbar en reposo** en enlaces secundarios ("Ver ediciones", "+N pistas", "Ver la lista en MusicBrainz", inicio de
  sesión, navegación del modal), por encima de la regla de rareza de DESIGN.md.
- **Glifos sueltos**: el despliegue de pistas adicionales usa ▾/▴, los niveles de Créditos "›" y el modal de reseña
  ◀/▶, donde el resto usa chevrons SVG; el distintivo "+1 pista" se parte en dos líneas en móvil.
- **Comentarios a ancho completo** (líneas de más de 150 caracteres); en artista se limitan a `max-w-3xl`.

## What Changes

- Pestañas fijas bajo el encabezado del sitio (mismas variables que artista), sin barra de desplazamiento, con
  desvanecido en el borde que tiene más pestañas y la activa visible al cargar. El contador pasa a "Reseñas 17".
- Fila de canción en móvil en una sola línea: título a la izquierda; nota propia (si hay), marca de escucha (si hay),
  corazón y duración a la derecha.
- Un control segmentado compartido (`src/components/ui/segmented.ts`) en Créditos, Ediciones y Reseñas, el mismo que
  ya usa la discografía del artista.
- Títulos h2 solo para lectores de pantalla en Ediciones y Reseñas. En Reseñas el orden no se muestra con menos de dos
  reseñas.
- Enlaces secundarios neutros en reposo y ámbar al pasar el cursor (`SECONDARY_LINK`).
- Chevron SVG compartido (`src/components/ui/Chevron.tsx`) en las pistas adicionales, los niveles de Créditos y el
  modal de reseña; distintivo de pistas extra sin partir.
- Comentarios del álbum limitados a `max-w-3xl`.

### Non-Goals

- Bloque de comunidad, panel "Tu relación", cabecera en móvil y franja de discografía (Fase 2).
- Lista de reseñas con extracto, formulario plegado, formatos traducidos y conteo en Ediciones, EmptyState (Fase 3).
- El chip de género principal resaltado: es la regla de `GenreChips` en todo el producto, no del álbum.

## Capabilities

### Modified Capabilities

- `album-page-layout`: pestañas fijas sin desborde y contador sin paréntesis; comentarios con ancho de lectura.
- `catalog-album`: fila de canción en una línea en móvil; control segmentado en Créditos y Ediciones; título de
  Ediciones solo para lectores de pantalla.
- `album-review`: índice de reseñas con control segmentado, sin orden por debajo de dos reseñas.

## Impact

`AlbumTabs`, el layout del álbum, `TrackList`, `AlbumCredits`, `EditionsTable`, `EditionExtraTracks`, `ReviewIndex`,
`ReviewModal`, `ReviewComposer`, `AlbumHeader`, `Comments` (enlace de inicio de sesión, compartido con artista y
canción), `ArtistDiscography` (pasa a usar las clases compartidas, sin cambio visible), utilidades nuevas
`src/components/ui/{Chevron.tsx,segmented.ts}`, tests. Sin cambios de esquema ni de API.
