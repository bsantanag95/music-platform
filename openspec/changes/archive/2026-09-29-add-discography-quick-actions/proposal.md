## Why

En la discografía de un artista, cada acción sobre un disco (registrar una escucha, marcarlo
favorito, dejarlo en Pendiente, agregarlo a una lista, calificarlo) obliga a entrar al álbum y
volver. En una banda de 14 discos principales son decenas de clics, y registrar una escucha
debería no costar nada ("Presencia ≠ Criterio", `PRODUCT.md`). Además la sección muestra poco de
lo que el usuario ya hizo (un ✓ genérico), repite "< 5 notas" en cada fila —y "notas" choca con
las "Notas de la comunidad" de la misma página— y repite la etiqueta "álbum" en casi todas las
filas de Principal.

## What Changes

- **Menú "…" de acciones por disco**, en la grilla (esquina de la carátula: al pasar el mouse o
  enfocar, siempre visible en pantallas táctiles) y en la tabla (última columna): registrar
  escucha en un clic con "Agregar detalles", Favorito y Pendiente con su estado, agregar a listas
  con el selector de casillas del panel del álbum, calificar con estrellas en línea e ir al
  álbum. Un solo menú abierto a la vez; teclado y lectores de pantalla completos. Sin sesión, el
  menú invita a iniciar sesión.
- **Tus marcas completas**: en la grilla, una franja sobre la carátula con tu nota (o ✓ si solo
  escuchaste), favorito y Pendiente; en la tabla, la columna "Tú" con lo mismo. Se actualizan al
  usar el menú.
- **Columna "Media"** en lugar de "Comunidad": la media con su cantidad cuando hay al menos 5
  valoraciones y un "—" atenuado en otro caso (sin "< 5 notas").
- **Tipo solo cuando no es álbum**: la etiqueta de tipo pasa junto al título y se omite en los
  álbumes; la tabla deja de tener la columna Tipo.

## Capabilities

### New Capabilities

- `discography-quick-actions`: menú de acciones por disco en la discografía del artista.

### Modified Capabilities

- `artist-discography-view`: contenido de la grilla y de la tabla (marcas, media, tipo, menú).

## Impact

- **Componentes**: `src/components/artist/ArtistDiscography.tsx` (estado de marcas y del menú
  abierto), componente nuevo del menú, reutiliza `AlbumListPicker`, `StarRatingInput`,
  `ListenEntryForm`, `HeartIcon` y los íconos del panel.
- **Servicios**: `getDiscographyMarks` suma favoritos, Pendiente, puntaje detallado y
  pertenencias a listas propias, en lote por los discos de la discografía.
- **API**: ninguna nueva; usa las de escucha, favoritos, Pendiente, listas y valoraciones.
- **Mensajes**: `catalog.artist.discography.*` (menú, media, marcas) en es y en.
- **Docs**: `docs/05-features/catalog-browsing.md`.
