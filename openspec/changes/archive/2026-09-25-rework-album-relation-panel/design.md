## Context

`AlbumRelationPanel` (client component, `src/components/album/AlbumRelationPanel.tsx`) se
entregó en `redesign-album-page`. Hoy:

- La nota se edita desplegando `DualRating variant="panel"`: diez botones 0.5–5, un campo
  numérico 1–100 libre y "Guardar". El `CHECK` de `rating` (migración `0000`) exige que
  `detailed_score` caiga en el tramo de 10 puntos de las estrellas; `saveRating` sin
  `detailedScore` lo guarda como `NULL` (`src/services/social.ts:80`).
- "Registrar otra" llama a `createListenEntry` al instante y abre `ListenEntryForm` sin
  aviso.
- Favorito/Pendiente son filas con "Agregar/Quitar"; en móvil, reseña y Pendiente se
  esconden detrás de "Más acciones", que también revela colección y listas.
- "Agregar a lista" abre `AddToListPanel` (compartido con tarjetas, tracklist, diario):
  pide `getMyLists(1, 50)` y filtra por tipo en el cliente, trae todos los Caminos, no sabe
  qué listas ya contienen el álbum y solo agrega. "Ver en listas" abre
  `ListsContainingItemPanel`, que lista **listas públicas de la comunidad**.
- `getAlbumPersonalExtras` devuelve solo `ownListCount` (todas las `user_list` propias con
  el álbum, incluidos recorridos de artista).
- `CommunityStats` muestra cuatro `StatTile` en `xl:grid-cols-4`; los conteos con umbral
  renderizan "Menos de 5" en `text-lg`.
- La cabecera usa `grid-template-areas` con el panel en las tres filas; las filas son
  `auto`, así que cuando el panel crece el sobrante se reparte entre ellas.

## Goals / Non-Goals

**Goals:**

- Valorar con un gesto y mantener la coherencia estrellas↔detallada sin tocar SQL.
- Filas autoexplicativas; retirar "Más acciones" y el `···` también en móvil.
- Selector de listas con pertenencia, alta/baja, búsqueda y alcance completo.
- Bloque de comunidad de tres tarjetas y cabecera estable.

**Non-Goals:**

- Límite de listas/Caminos por usuario.
- Migrar `AddToListPanel`/`ListsContainingItemPanel` en otras superficies.
- Cambiar `DualRating` en artista y canción.
- Endpoints REST, esquema o reglas de negocio nuevas.

## Decisions

### D1. Pertenencia a listas calculada en el servidor

`getAlbumPersonalExtras` reemplaza `ownListCount` por
`ownListMemberships: { listId, itemId, kind: "standard" | "custom_journey", title }[]`,
con una consulta `user_list ⨝ user_list_item` filtrada por `owner_id`, `release_group_id`
y `kind IN ('standard','custom_journey')`, excluyendo Caminos archivados. El conteo del
panel es `ownListMemberships.length`.

- *Por qué:* el selector necesita marcar casillas al abrir, incluso de listas viejas fuera
  de cualquier página, y `removeItemFromList` requiere `itemId`. Cargarlo en el Server
  Component evita un endpoint nuevo.
- *Consecuencia:* el conteo deja de incluir los recorridos de artista (`artist_journey`),
  que se gestionan solos; así el número coincide con las casillas marcadas.
- *Alternativa descartada:* endpoint `GET /api/me/lists/containing?target=…` — contrato
  nuevo para un dato que la página ya puede entregar.

### D2. Selector `AlbumListPicker` nuevo, no modificar `AddToListPanel`

Componente nuevo en `src/components/album/AlbumListPicker.tsx` (props: `releaseGroupId`,
`memberships`, `onMembershipsChange`, `onClose`). `AddToListPanel` queda intacto para
las demás superficies.

- **Listas:** al abrir, `getMyLists(1, 20, { entityType: "release-group", q })` con `q`
  con *debounce* de 250 ms; "Cargar más" si `hasNext`. Orden de render: primero las
  pertenencias (títulos ya vienen en D1) que coincidan con `q`, luego los resultados sin
  repetir. Se usa `useInfiniteQuery` de TanStack Query (datos posteriores al primer render
  con búsqueda y paginación, que es su caso de uso en el proyecto).
- **Caminos:** `getMyCaminos()` una vez (endpoint sin paginar), filtrado en cliente por
  `state !== "archived"` y por `q`.
- **Casillas:** `<input type="checkbox">` nativos dentro de `<label>`; actualización
  optimista; alta con `addItemToList` / `addAlbumToCamino`, baja con
  `removeItemFromList(listId, itemId)` / `removeAlbumFromCamino`. El `itemId` de un alta
  sale de la respuesta (`UserListDetail.items`); para Caminos la baja no necesita `itemId`.
  Una casilla en vuelo queda `disabled`; error → revertir + `role="alert"`.
- **Forma:** `max-h-72 overflow-y-auto` para el cuerpo, cabecera fija con el buscador,
  secciones "Listas"/"Caminos" con `+ Nueva` alineado a la derecha del rótulo, que abre
  `ListForm`/`CaminoForm` en línea; al crear, alta automática y casilla marcada. Escape
  cierra y devuelve el foco al botón "Listas".
- *Alternativa descartada:* extender `AddToListPanel` con modo casillas — lo usan cinco
  superficies con menús propios; se migra en un cambio posterior reutilizando este
  componente.

### D3. `StarRatingInput` + `RatingDetailDialog`

- `src/components/social/StarRatingInput.tsx`: `role="radiogroup"` con diez radios ocultos
  (½…5) y cinco glifos de estrella; cada estrella tiene dos zonas de clic (mitad izquierda
  = x.5, derecha = x). Previsualización con `onPointerMove` sobre el contenedor; flechas
  ±½ (comportamiento nativo del grupo de radios). Tamaño táctil ≥ 40 px. Presentacional:
  recibe `value` y `onChange`.
- En el panel, `onChange(stars)` hace guardado optimista con `saveRating`, enviando
  `detailedScore` solo si `isScoreCoherent(stars, score)`; si no, lo omite (queda `NULL`)
  y muestra un aviso `role="status"` ("Se quitó tu puntuación 95"). Como los tramos no se
  solapan, en la práctica cambiar las estrellas siempre descarta el puntaje; la comprobación
  queda como guarda. Error → revertir.
- `isScoreCoherent`/`scoreRange(stars)` en un módulo puro compartido
  (`src/lib/rating-range.ts`), espejo del `CHECK` SQL: `[(round(stars*2)-1)*10+1,
  round(stars*2)*10]`. El `CHECK` sigue siendo la fuente de verdad.
- `RatingDetailDialog` usa `src/components/ui/Dialog.tsx`: `<input type="number">` con
  `min`/`max` del tramo, Guardar, Destacar/Quitar destacada (`highlightRating`) y "Borrar
  nota" con `ConfirmDialog`. El botón que lo abre muestra el puntaje (`95`) o `+`, con
  `aria-label` descriptivo, y está `disabled` sin estrellas.
- `DualRating` no cambia; el panel deja de usarlo.

### D4. Fila de escuchas

`+ Registrar` fijo. Tras `createListenEntry`, en lugar de abrir `ListenEntryForm`, se
muestra una línea de confirmación `role="status"` con "Escucha registrada · Agregar
detalles"; "Agregar detalles" abre el `ListenEntryForm` de esa entrada. La confirmación
desaparece al abrir el formulario o al registrar otra.

### D5. Conmutadores Favorito / Pendiente

Un componente local `ToggleChip` (`<button aria-pressed>` con ícono SVG inline + texto),
dos en una fila `grid-cols-2`. Íconos: corazón y marcador (*bookmark*) dibujados como SVG
en el componente — sin dependencia nueva de íconos. Activo: relleno `text-amber` y borde
ámbar; inactivo: contorno `text-paper-muted`.

### D6. Estructura del panel

Orden: Nota (estrellas + botón de puntaje) · Reseña · separador · Escuchas · Favorito |
Pendiente · separador · Colección · Listas. Sin `moreOpen` ni `mobileSecondary`; las filas
son iguales en todos los viewports. Colección: "Colección · Agregar" o el estado actual +
"Gestionar", abriendo `CollectionAlbumAction` como hoy (el deep-link `?collection=` lo
sigue abriendo).

### D7. Bloque de comunidad

`CommunityStats` pasa a tres `StatTile` (`sm:grid-cols-3`); el conteo con umbral se
renderiza `<5` con `<span class="sr-only">menos de 5</span>` y `title`. La tarjeta "En
listas" se reemplaza por un `Link` bajo las tarjetas ("Aparece en N listas →") solo con
`listCount > 0`. La línea resumen de móvil no cambia.

### D8. Cabecera estable

En `lg`, se agrega una cuarta fila a las áreas —
`'cover identity panel' 'cover facts panel' 'cover community panel' '. . panel'` — con
`grid-template-rows: auto auto auto 1fr`, de modo que el sobrante caiga en la fila de
relleno. La carátula queda en las tres primeras filas.

## Risks / Trade-offs

- **Clic accidental en estrellas guarda al instante** → la previsualización hace visible
  el valor antes del clic, y cambiarlo es otro clic; borrar sigue pidiendo confirmación.
- **Quitar el puntaje detallado al cambiar estrellas** puede sorprender → aviso explícito
  con el valor quitado; alternativa (bloquear el cambio) sería peor para el gesto rápido.
- **El conteo "En N de tus listas" cambia de semántica** (sin recorridos de artista) → es
  coherente con lo que el usuario puede tocar; se documenta en la spec.
- **Dos selectores de listas conviven** (`AddToListPanel` y `AlbumListPicker`) hasta
  migrar las otras superficies → el nuevo se diseña sin dependencias del panel para
  reutilizarlo.
- **`getMyCaminos` sin paginar** → aceptable ahora (el selector limita alto y filtra); si
  crece, paginarlo es un cambio de API aparte.

## Migration Plan

Solo UI y una lectura de servidor; sin migración de datos. Despliegue normal; revertir el
commit restaura el panel anterior.

## Open Questions

Ninguna bloqueante. La migración de `AddToListPanel` al selector nuevo queda como cambio
posterior.
