## Why

La pestaña Canciones quedó atrás respecto del panel "Tu relación" rehecho
(`rework-album-relation-panel`): repite información que la página ya muestra justo arriba
(título "Canciones", edición mostrada, total de pistas y duración), las filas cambian de
alto según tengan marca o no (el carácter ✓ empuja la línea), las marcas ✦ y ✓ solo se
explican con un tooltip, y lo personal de cada canción (tu nota, tu favorito) no se ve sin
abrir el menú. Además, valorar una pista todavía usa el formulario viejo de diez botones y
"Guardar", y registrar una escucha abre el formulario de detalles sin pedirlo — dos
comportamientos que el panel ya corrigió.

## What Changes

- **Sin duplicados**: el título "Canciones" pasa a ser solo para lectores de pantalla; la
  línea de edición mostrada se ve solo en móvil (donde la ficha está contraída); el pie de
  total desaparece en álbumes de un solo disco.
- **Filas uniformes y legibles**: marcas como íconos SVG de tamaño fijo; resaltado de la
  fila completa al pasar el cursor o con foco.
- **Estado personal siempre visible**: tu nota como estrellas chicas de solo lectura y un
  corazón de favorito que se alterna desde la fila, además de la marca de escuchada.
- **Leyenda** de "Favorita de la comunidad" cuando alguna pista la lleva.
- **Menú más corto**: sin "Ir a la canción" (el título ya enlaza); control de 40 px.
- **Valorar en línea**: estrellas que guardan con un clic (mismo `StarRatingInput` del
  panel), con quitar valoración y aviso si se descarta un puntaje detallado incoherente.
- **Registrar escucha** con confirmación "Escucha registrada · Agregar detalles".

## Goals

- Que la tracklist se lea como lista, con alturas y columnas estables.
- Que cada fila muestre tu relación con la canción sin abrir menús.
- Coherencia de interacción con el panel "Tu relación".

## Non-Goals

- Media de estrellas de la comunidad por pista (la spec lo excluye).
- Cambiar el bloque "Pistas adicionales en otras ediciones".
- Cambiar la página de canción o `DualRating` en otras superficies.
- Endpoints REST nuevos o cambios de esquema.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `catalog-album`: títulos y marcas de la tracklist, total al pie, leyenda de favoritas de
  la comunidad, estado personal por pista, menú por pista; nuevos requisitos de valoración
  en línea, registro con confirmación y cabecera sin duplicados.

## Impact

- `src/components/catalog/TrackList.tsx` (y su test).
- `src/services/catalog/album-personal.ts` + `album-data.ts`: valoraciones propias de las
  grabaciones del álbum en una consulta.
- `src/app/[locale]/(catalog)/album/[id]/(tabs)/page.tsx`: pasa las valoraciones.
- Reutiliza `StarRatingInput`, `rating-range`, `ConfirmDialog`, `saveRating`/`deleteRating`/
  `getRatings`, `toggleFavorite`, `createListenEntry`.
- `messages/{es,en}/catalog.json` (`catalog.album.tracks`).
- Docs: `docs/05-features/catalog-browsing.md`.
