## Context

`/me/lists` (`redesign-me-lists-toolbar`), Pendientes y Colección ya tienen una cabecera con la acción principal,
pestañas con totales y segmentos con cifras. Progreso los adopta en esta fase con la misma forma.

## Decisions

**D1. Reusar el diálogo de acciones rápidas.** "Completar discografía" y "Nueva lista para completar" ya existen como
acciones del diálogo del Header (`journey` y `newCamino`), con su buscador y sus avisos. `ProgressSection` lo abre con
`initialAction`, igual que Pendientes y Colección. No se escribe un segundo flujo ni se usa el modal de selección de la
página del artista: el diálogo activa con la selección por defecto (discos de estudio) y ofrece ir a la gestión.

**D2. Refresco sin perder filtros.** Al cerrar tras un cambio, el diálogo hace `router.refresh()`; la página vuelve a
leer el listado (y los filtros de la URL, que la Fase 1 escribe con `replaceState`). Cada listado sincroniza su estado
local con la nueva prop (`useEffect` sobre el arreglo recibido), así que no hace falta remontarlo.

**D3. Totales.** `countProgressTabs(userId)` cuenta en dos consultas los recorridos y los Caminos (`user_list` por
`kind`) y las listas seguidas (con el mismo filtro de cuenta activa que `listTrackedLists`). La pestaña activa informa su
total real por contexto (`useProgressSection().reportTotal`) cuando borra o deja de seguir, igual que `/me/lists`.

**D4. Nombre de la pestaña.** "Listas para completar" (decisión del usuario, 2026-10-27), alineado con el estante del
perfil y `/caminos`. Bajo `sm` se muestra "Para completar" (y el texto de las pestañas baja a 13 px) para que las tres
con su total quepan en una fila; el nombre accesible es el visible. Por lo mismo, en un teléfono la acción va en la fila
del título y "+ Nueva lista para completar" se abrevia "+ Nueva lista".

**D5. Segmentos.** `ProgressStateSegments`, calcado de `ListTypeSegments`: botones con `aria-pressed`, cifras contadas
sobre todas las entradas (sin búsqueda), deshabilitado si una cifra es 0 y no está activo. En un teléfono ocupan una fila
propia, los cuatro con el mismo ancho y la cifra debajo de la etiqueta, para que quepan sin desplazamiento.

**D6. "Más avanzadas".** Ordena por `listened / selected` descendente; una selección vacía cuenta como 0 y el orden es
estable (empata por el orden de agregado). Se agrega a `OWN_SORTS` (`sort=progress` en la URL) y es el mismo valor que
ya usaba Listas que sigo.

**D7. Barra.** Fila 1: búsqueda flexible, orden y conmutador de modo; fila 2: segmentos. En un teléfono la búsqueda
ocupa su fila, debajo orden y modo, y al final los segmentos.

## Risks / Trade-offs

- [El diálogo activa la discografía con la selección por defecto, sin el modal de elegir discos] → Es el mismo
  comportamiento de "+ Añadir" en el Header; el aviso enlaza a la gestión para ajustar la selección.
- [Cifras por estado en la superficie privada] → No son fracciones ni se muestran a otros; §6.4.1 prohíbe el conteo
  agregado en el perfil, no en la gestión propia.
