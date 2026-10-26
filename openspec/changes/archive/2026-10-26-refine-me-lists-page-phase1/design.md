## Context

`/me/lists` se rehízo en `rework-lists-section` y su detalle en `rework-list-detail`. Desde entonces Pendientes,
Favoritos, Valoraciones y Colección pasaron por una Fase 1 con los mismos arreglos (modo sin parpadeo, filtros en la URL,
áreas de 44 px, cabecera a la izquierda). Esta fase los trae a Listas.

## Decisions

**D1. Extremos que no aplican dejan su lugar vacío.** El botón "al principio" de la primera fila (y "al final" de la
última) se renderiza con `invisible`: no se ve, no recibe foco y conserva la alineación de las columnas. Verlo
deshabilitado no decía nada útil. El requisito de mover al principio o al final se mantiene.

**D2. Áreas.** `size-8` (32 px) por defecto y `[@media(pointer:coarse)]:size-11`; Quitar y las acciones de la tarjeta usan
`min-h-8` / `min-h-11`. Mismo criterio que Pendientes.

**D3. Índice con controles siempre visibles.** Con botones de 32 px el truco de opacidad dejaba una franja vacía en cada
fila; ahora se ven, en `paper-muted`.

**D4. `useListViewMode` devuelve `ready`.** Igual que `useWantToListenViewMode`: hasta leer `localStorage`, `ListItemsView`
pinta filas neutras y el conmutador queda `invisible`. Afecta también la lectura de listas ajenas y colecciones, que usan
el mismo cuerpo.

**D5. Diálogo de borrado compartido.** `DeleteListDialog` envuelve `ConfirmDialog` (ya trae portal, foco y Escape) con
título "¿Eliminar «X»?" y un mensaje con el número de elementos. Lo usan la tarjeta y el detalle. No hay deshacer: el
borrado es físico (requisito "Borrado de la lista") y recrear la lista con sus ítems no es trivial.

**D6. Errores por tarjeta.** `MyListsTab` guarda `{ id, kind }` del último fallo y lo muestra con `role="alert"` bajo esa
tarjeta; antes un fallo distinto de `LIST_NOT_FOUND` no decía nada.

**D7. Filtros en la URL solo en Mis listas.** `useListFilters(initial?, { syncUrl })`: con `syncUrl` escribe
`q`, `type` y `sort` con `history.replaceState` (sin historial) cuando difieren del defecto, conservando `tab`. La página
valida los valores con los mismos enums del API e ignora los inválidos. El listado de un perfil ajeno sigue sin URL.

## Risks / Trade-offs

- [El encabezado sigue sin "Nueva lista" en Guardadas y Descubrir, como pide el requisito de la sección] → Lo resuelve la
  Fase 2 al subir la acción a la cabecera; esta fase no lo empeora.
