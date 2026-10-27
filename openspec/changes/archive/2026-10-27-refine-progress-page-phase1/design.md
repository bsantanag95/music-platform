## Context

`/me/progress` reunió en `clarify-user-menu-names` los listados de recorridos, Caminos propios y listas seguidas, cada
uno con su barra y su confirmación de borrado heredadas. Pendientes, Favoritos, Valoraciones, Colección y Listas ya
pasaron por una Fase 1 con los mismos arreglos; esta fase los trae a Progreso.

## Decisions

**D1. `ready` en los dos hooks de modo.** Igual que `useListViewMode`: hasta leer `localStorage` el listado pinta un
marcador neutro (`ProgressPlaceholder`) y el conmutador queda `invisible`, para no pintar Detallada y saltar.

**D2. Diálogo de borrado.** `ArtistJourneyDeleteDialog` y `CaminoDeleteDialog` envuelven `ConfirmDialog` (portal, foco,
Escape). El listado guarda la entrada pendiente; los renderers solo piden borrar (`actions.requestRemove`), así que los
tres modos dejan de tener su propio estado de confirmación. El mensaje dice cuántos discos tiene la selección o la lista:
es su tamaño, no lo que falta escuchar, así que no contradice §6.4.1. No hay deshacer: el borrado es físico.

**D3. Dejar de seguir con deshacer.** Desactivar el seguimiento no borra el guardado (`list-saves`), así que deshacer es
volver a activarlo (`setListTracking(id, true)`) y reinsertar la fila en su posición. Se usa `UndoToast`. Si deshacer
falla, el aviso lo dice y deja de ofrecer Deshacer, igual que en el detalle de una lista.

**D4. Barra discreta accesible.** `ProgressBar` (en `src/components/progress/`) dibuja la barra con `role="img"` y una
etiqueta por tramos: sin empezar, recién empezado (< 1/3), a la mitad (< 2/3), casi terminado (< 1), completo. No usa
`progressbar` porque exigiría un valor numérico, y el número es justo lo que §6.4.1 evita. Con la selección vacía no se
dibuja, como hoy.

**D5. Filtros en la URL.** `useProgressFilters(initial, defaults)` guarda `q`, `sort` y `state` y los escribe con
`history.replaceState` (sin historial) cuando difieren del defecto, conservando `tab`. La página los valida con las
listas de valores de `progress-tabs.ts` según la pestaña e ignora los inválidos (`state` no existe en Listas que sigo).
Las pestañas enlazan sin filtros: cambiar de pestaña vuelve a los valores por defecto. Abrir el panel desde el menú
sigue empezando sin filtros.

**D6. Una sola barra.** `flex flex-wrap`: búsqueda `w-full sm:flex-1 sm:min-w-[12rem]`, los selects y el conmutador al
final (`sm:ml-auto`). En móvil quedan la búsqueda y, debajo, los selects con el conmutador de iconos. Mis listas
conserva su línea de total y "Nueva lista para completar" (sube a la cabecera en la Fase 2).

**D7. Pestañas en una fila.** `flex-nowrap overflow-x-auto` con un relleno algo menor; a 375 px caben las tres.

**D8. Áreas.** El ⋮ usa `triggerClassName="size-8 [@media(pointer:coarse)]:size-11"`; "Dejar de seguir" `min-h-8` /
`min-h-11`. Las opciones del menú ya crecen a 44 px con puntero grueso.

## Risks / Trade-offs

- [El diálogo pide un clic más que antes en escritorio] → Es el mismo número de pasos (elegir Eliminar, confirmar), pero
  ahora con contexto.
- [El enlace del estado vacío de Discografías lleva a la búsqueda general (`/search?type=artist`), no a un
  flujo propio] → La Fase 2 agrega "+ Completar discografía" con su búsqueda; Explorar no se usa porque puede estar
  desactivado por configuración.
