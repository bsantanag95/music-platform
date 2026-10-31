## Context

La página de álbum es un layout de pestañas (`(tabs)/layout.tsx`) con cabecera, panel, barra de pestañas, franja de
discografía y comentarios; cada pestaña es un segmento. La página de artista resolvió los mismos problemas en
`refine-artist-page-phase1/2` (pestañas fijas con `--site-header-h`, control segmentado con borde y activo en
superficie, comentarios a `max-w-3xl`).

## Decisions

### D1. Pestañas fijas con las variables de artista

El contenedor de pestañas y contenido define `--site-header-h: 3.625rem` y `--album-tabs-h: 2.375rem`; la barra usa
`sticky top-[var(--site-header-h)]` con fondo tinta y `z-20`. La altura del encabezado del sitio es la misma que en
artista (medida allí: ~58 px).

### D2. Desvanecido solo cuando hay desborde

Un desvanecido fijo apagaría la última pestaña aunque todas quepan. `AlbumTabs` (ya es cliente) mide su `scrollWidth`
con `ResizeObserver` y el evento `scroll`, y marca `data-fade-start` / `data-fade-end`; la máscara (`mask-image` con
degradado) se aplica según esas marcas. Al montar, si la pestaña activa no está a la vista, el contenedor se desplaza
horizontalmente hasta ella (`scrollLeft`, sin mover la página).

### D3. Contador "Reseñas 17"

La cifra va en Plex Mono gris tras el nombre. Ahorra los paréntesis y sigue el patrón de las secciones del artista
("Principal 19"). El texto accesible queda "Reseñas 17".

### D4. Fila de canción en una línea en móvil

En móvil la cuadrícula pasa a `2rem | 1fr | auto | 2.5rem`. La celda `auto` (solo móvil) junta nota propia, marca de
escucha, corazón y duración sin anchos reservados; las marcas que no existen no ocupan sitio. En escritorio la
cuadrícula y los anchos fijos (que alinean columnas) no cambian. La segunda línea solo aparece con artista distinto,
featuring o versión.

### D5. Control segmentado compartido

`src/components/ui/segmented.ts` exporta `SEGMENT_GROUP` y `SEGMENT_OPTION`, las clases que la discografía del artista
ya usaba en línea. La opción activa se marca con `aria-pressed` (botones) o `aria-current` (enlaces, cuando el estado
vive en la URL); las clases cubren ambos. En Ediciones los chips pasan a ser un único grupo con borde.

### D6. Enlaces secundarios

`SECONDARY_LINK` (en el mismo módulo): papel con subrayado del color del borde, ámbar al pasar el cursor. El ámbar en
reposo queda para el artista, la pestaña activa, las estrellas, el corazón activo y la acción principal.

## Risks / Trade-offs

- **Clases en un módulo y no un componente**: los tres controles mezclan enlaces y botones con estado en URL o local;
  un componente obligaría a dos variantes. Las clases dan coherencia sin cambiar la semántica de cada uno.
- **`Comments` es compartido**: el nuevo estilo del enlace de inicio de sesión llega también a artista y canción, que
  es lo buscado.
