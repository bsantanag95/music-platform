## Why

Una auditoría de `/me/lists` (Mis listas, Guardadas, Descubrir y el detalle de una lista propia), en escritorio y a
375 px con datos reales, encontró errores que no dependen del rediseño:

- **Reordenar en el detalle es casi imposible de tocar:** las flechas miden 6–7 × 16 px y las de los extremos se ven
  deshabilitadas en la primera y la última fila. En Índice se ocultan con opacidad pero siguen ocupando su lugar.
- **Acciones sin nombre propio:** las 14 tarjetas dicen "Eliminar", "Fijar" y "Editar" sin decir de qué lista; miden
  16 px de alto y no crecen con puntero grueso.
- **Borrar una lista** se confirma con "¿Borrar? Eliminar Cerrar", sin nombrar la lista ni cuántos elementos se pierden,
  y un error al borrar o fijar se traga en silencio.
- **Los filtros no viven en la URL:** buscar, tipo y orden se pierden al recargar o al volver desde una lista.
- **Salto de modo en el detalle:** se pinta Detallada y luego salta al modo guardado.
- **Cabecera centrada en `max-w-3xl`**, distinta de Pendientes, Favoritos y Colección; el detalle no tiene cómo volver
  a Listas.

Son los mismos defectos que `/me/want-to-listen` y `/me/collection` corrigieron en su Fase 1.

## What Changes

- **Controles de reordenar** de 32 px (44 px con puntero grueso); el que no aplica en un extremo deja su lugar vacío en
  vez de verse deshabilitado. Quitar con la misma altura. En Índice los controles quedan siempre visibles.
- **Sin parpadeo de modo:** el detalle muestra un marcador neutro y oculta el conmutador hasta leer el modo guardado.
- **Tarjetas de Mis listas:** "Fijar Best AOR songs", "Editar …", "Eliminar …" como nombres accesibles; 32 px (44 px con
  puntero grueso).
- **Eliminar con diálogo** en la tarjeta y en el detalle: nombra la lista, cuántos elementos se pierden y que no se puede
  deshacer. Si borrar o fijar falla, el error aparece junto a esa tarjeta.
- **Filtros en la URL** de Mis listas (`?q=&type=&sort=`, con `replaceState`, solo lo que difiere del defecto); la página
  los lee al abrir. El listado de un perfil ajeno no cambia.
- **Ancho y cabecera:** `max-w-4xl`, título a la izquierda con una línea de descripción; el detalle propio usa el mismo
  ancho y suma "← Listas".

### Goals

- Corregir los errores confirmados sin cambiar el diseño de las tarjetas ni de las vistas.

### Non-Goals

- "Nueva lista" en la cabecera y en un diálogo, pestañas con totales, Descubrir como enlace a `/lists`, segmentos por
  tipo con cifras, barra de Guardadas (Fase 2).
- Estantería, sección "Fijadas", menú ⋯, lista vacía con invitación, "Mover a la posición…" (Fase 3).
- Arrastrar para reordenar, portada elegible, nota por elemento (backlog de `lists-and-favorites.md`).

## Capabilities

### Modified Capabilities

- `lists`: borrado con confirmación que nombra la lista; controles de reordenar con área mínima y sin extremos
  deshabilitados visibles; Índice con controles visibles; modo sin parpadeo; filtros de Mis listas en la URL.

## Impact

- `src/components/lists/`: `ListItemControls`, `ItemsIndex`, `ListItemsView`, `use-list-view-mode`, `MyListsTab`,
  `ListDetailHeader`, `ListDetail`, `use-list-filters`, nuevo `DeleteListDialog`.
- `src/app/[locale]/me/lists/page.tsx` y `[listId]/page.tsx`.
- `messages/{es,en}/lists.json`.
- `docs/05-features/lists-and-favorites.md`.
- Sin cambios de API ni de esquema.
