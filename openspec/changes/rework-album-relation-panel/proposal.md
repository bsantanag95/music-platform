## Why

El panel "Tu relación" y el bloque de comunidad de la página de álbum (entregados en
`redesign-album-page`) funcionan, pero cuestan de leer y de usar: valorar exige abrir un
formulario con diez botones y "Guardar"; "Registrar otra" registra una escucha al instante
sin decirlo; Pendiente no se entiende sin el botón "Agregar"; "Más acciones" solo esconde
"Gestionar"; "Agregar a lista" y "Ver en listas" parecen hermanos pero el segundo muestra
listas **de la comunidad**, no las propias. Además, el selector de listas solo ve las
primeras 50 listas propias (las demás son inalcanzables en silencio), dibuja todos los
Caminos sin tope y no indica en cuáles ya está el álbum. Por último, cuando el panel crece
la grilla de la cabecera estira las filas y separa título, ficha y comunidad.

## What Changes

- **Valoración en línea**: cinco estrellas con medias estrellas directamente en el panel;
  un clic guarda. El puntaje detallado (1–100), destacar y borrar pasan a un diálogo chico
  junto a las estrellas, que solo ofrece el tramo coherente con las estrellas elegidas.
  Cambiar las estrellas descarta el puntaje detallado (cada valor de estrellas tiene su
  propio tramo) y lo avisa.
- **Rótulos sin "Tu"**: las filas pasan a "Nota" y "Reseña"; la pertenencia se comunica
  con el título del panel y el estado visual (estrellas llenas en ámbar, "Escrita").
- **Escuchas legibles**: fila "Escuchas" con el valor ("3 · última 24 sept" / "Ninguna")
  y una acción de etiqueta fija "+ Registrar"; tras registrar, una confirmación visible
  ("Escucha registrada") con "Agregar detalles" que abre el formulario de la entrada.
- **Favorito y Pendiente como conmutadores**: dos botones de estado con ícono + texto
  siempre visibles (corazón y marcador, vacío/lleno), `aria-pressed`, sin "Agregar/Quitar".
- **Sin "Más acciones"**: colección y listas siempre visibles, en escritorio y en móvil.
  **BREAKING (spec)**: se retira el menú `···` del panel.
- **Selector único de listas**: un botón "Listas" abre un selector compacto con casillas
  (marcada = el álbum ya está), buscador, alto máximo con scroll, secciones Listas y
  Caminos y "+ Nueva" en una línea. Marcar agrega; desmarcar quita. Alcanza todas las
  listas propias (búsqueda del lado del servidor), no solo las primeras 50.
- **"Ver en listas" sale del panel**: las listas de la comunidad que contienen el álbum se
  alcanzan desde el bloque de comunidad.
- **Bloque de comunidad compacto**: tres tarjetas (Media, Valoraciones, Colección); los
  conteos con umbral se muestran como "<5" en el mismo tamaño que el resto (texto completo
  accesible); "En listas" deja de ser tarjeta y pasa a un enlace "Aparece en N listas"
  solo cuando N > 0.
- **Cabecera estable**: el crecimiento del panel lateral no altera el espaciado de la
  columna central.

## Goals

- Que cada fila del panel se entienda sin leer el botón de acción.
- Valorar con un solo gesto, sin romper la coherencia estrellas↔detallada del `CHECK` SQL.
- Que el selector de listas escale a cualquier cantidad de listas y Caminos propios y
  muestre y permita revertir la pertenencia actual.
- Reducir ruido visual del bloque de comunidad sin perder ninguna cifra.

## Non-Goals

- Poner un tope a la cantidad de listas o Caminos por usuario (no se agrega ninguna regla
  de negocio nueva).
- Migrar `AddToListPanel` en otras superficies (tarjetas, tracklist, diario, artista,
  canción); siguen como están. El selector nuevo se construye reutilizable para migrarlas
  en un cambio posterior.
- Cambiar `DualRating` en las páginas de artista y canción.
- Nuevos endpoints REST o cambios de esquema.

## Capabilities

### New Capabilities

- `album-list-picker`: selector de listas y Caminos propios desde el panel del álbum —
  pertenencia visible, alta/baja por casilla, búsqueda y alcance completo.

### Modified Capabilities

- `album-personal-panel`: valoración en línea con diálogo de puntaje detallado, rótulos
  sin "Tu", fila de escuchas con confirmación, Favorito/Pendiente como conmutadores,
  retiro de "Más acciones" y del menú `···` (también en móvil), listas por selector único.
- `album-community-stats`: presentación compacta de los conteos con umbral y de las listas
  que contienen el álbum.
- `album-page-layout`: el panel lateral no altera el espaciado de la columna central.

## Impact

- **Componentes**: `src/components/album/AlbumRelationPanel.tsx` (reescritura), nuevo
  `StarRatingInput` + diálogo de puntaje detallado, nuevo `AlbumListPicker`,
  `src/components/album/AlbumHeader.tsx` (`CommunityStats`), layout
  `src/app/[locale]/(catalog)/album/[id]/(tabs)/layout.tsx`.
- **Servicios (lectura, sin API nueva)**: `src/services/catalog/album-personal.ts` y
  `album-data.ts` pasan a devolver la pertenencia propia (lista/Camino + ítem) en lugar de
  solo `ownListCount`.
- **API cliente reutilizada**: `getMyLists` (`q`, `entityType`), `getMyCaminos`,
  `addItemToList`/`removeItemFromList`, `addAlbumToCamino`/`removeAlbumFromCamino`,
  `saveRating`/`deleteRating`, `highlightRating`, `createListenEntry`.
- **i18n**: `messages/{es,en}/catalog.json` (`catalog.album.relation`,
  `catalog.album.community`).
- **Tests**: `AlbumRelationPanel.test.tsx`, `AlbumHeader.test.tsx`, tests nuevos del
  selector y del input de estrellas.
- **Docs**: sin cambios de contrato REST ni de reglas de negocio; se revisa la mención del
  panel en `/docs` si describe el menú `···`.
