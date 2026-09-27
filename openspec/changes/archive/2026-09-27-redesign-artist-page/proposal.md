## Why

La página de artista es hoy una sola columna: foto circular y nombre, la discografía en
grilla por cuatro categorías, siete botones apilados, la tarjeta del recorrido, integrantes y
notas. No se lee como la ficha de una biblioteca ni cuenta quién es el artista, y no sigue la
estructura que ya tiene la página de álbum (cabecera con ficha, panel "Tu relación", bloque
de comunidad y pestañas). Con los datos de `fix-artist-discography-ingestion` y
`enrich-artist-profile`, la página puede ser un híbrido entre biblioteca y biografía.

## What Changes

- **Cabecera** con foto chica rectangular (4:3) y su crédito, antetítulo de tipo, nombre,
  descripción traducida (sin géneros por ahora: se decide su fuente después),
  ficha (origen o nacimiento, actividad y estado, enlaces en orden fijo) y un resumen de
  tres líneas de Wikipedia con atribución y "Seguir leyendo".
- **Panel "Tu relación"** con el mismo patrón que el álbum: Siguiendo, Favorito, Pendiente,
  Escuchas y Colección (calculadas desde tus discos, sin total), Listas (mismo selector que
  el álbum) y Recorrido (barra discreta, sin cifras). Sin estrellas ni reseña.
- **Bloque de comunidad** con 3 tarjetas y umbral de 5: oyentes, seguidores y favoritos, y
  listas. **Se levanta la regla que prohibía mostrar el conteo de seguidores.**
- **Pestañas**: Discografía (por defecto) y Biografía (la introducción completa de
  Wikipedia con su atribución).
- **Discografía por secciones** (Principal, En vivo, Recopilatorios, Sencillos, Otros,
  Apariciones) con su cantidad; grilla por defecto en Principal y tabla en el resto, con un
  selector de vista que recuerda la elección; sección en la URL; "Mostrar más" a partir de
  48 discos en grilla; "Mejor valorado" y tus marcas (escuchado, tu nota) por disco.
- **Solistas**: la franja "También en" enlaza a sus bandas en lugar de mezclar la
  discografía de las bandas con la propia.
- Las carátulas sin resolver se piden **solo al entrar en pantalla**.
- La sección de integrantes actual se conserva sin cambios (se rediseña en un cambio
  aparte); las notas de la comunidad van al final.

## Capabilities

### New Capabilities

- `artist-page-layout`: zonas de la página de artista, pestañas enlazables, orden en móvil,
  integrantes y notas al final.
- `artist-header`: foto con crédito, identidad, ficha, enlaces y resumen de la
  biografía.
- `artist-personal-panel`: panel "Tu relación" del artista.
- `artist-community-stats`: bloque de comunidad del artista con umbrales.
- `artist-discography-view`: secciones, vistas grilla y tabla, selector, marcas personales,
  "Mejor valorado" y franja "También en".
- `artist-biography`: pestaña Biografía.

### Modified Capabilities

- `catalog-artist`: el perfil muestra la cabecera nueva; la discografía agrupada por cuatro
  categorías se reemplaza por las secciones; los datos opcionales incluyen la ficha nueva;
  las carátulas sin resolver se piden al entrar en pantalla; un solista ya no combina la
  discografía de sus bandas; las acciones pasan al panel de la cabecera.
- `artist-following`: el control de seguir vive en el panel y el conteo de seguidores se
  muestra en el bloque de comunidad, con umbral.
- `artist-journey`: la tarjeta de resumen en la página del artista pasa a ser la fila
  Recorrido del panel.

## Impact

- **Rutas** (`src/app/[locale]/(catalog)/artist/[id]/`): layout con cabecera y pestañas,
  página de Discografía, página de Biografía, `loading`/`error`.
- **Componentes**: `ArtistHeader` reescrito; componentes nuevos de panel, comunidad,
  discografía (grilla, tabla, selector, "También en") y biografía; `AlbumListPicker`
  generalizado a un objetivo artista; `LazyCoverImage` con carga por visibilidad.
- **Servicios**: agregados de comunidad del artista, estado personal del artista, lectura
  de discografía con secciones, notas de la comunidad y marcas personales, "También en".
- **Mensajes** `catalog.artist` en es y en.
- **Depende de** `fix-artist-discography-ingestion` y `enrich-artist-profile`.
- **Fuera de alcance**: integrantes y sus períodos (cambio aparte), cronología de la
  biografía, artistas relacionados.
