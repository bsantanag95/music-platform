## Context

`ArtistJourneyAlbumGroups` recibe la discografía completa ya agrupada por categoría, con un set de
categorías colapsadas (`collapsed`, gobernado por el padre) y un set de álbumes seleccionados
(`selected`). Es la misma vista que usa tanto el editor de la página de gestión como el modal de
inicio — cualquier cambio acá beneficia a los dos sin tocarlos.

## Goals / Non-Goals

**Goals:**
- Filtrar por título, sin distinguir mayúsculas ni diacríticos, reutilizando
  `normalizeForSearch` ya existente (mismo criterio que `/me/artist-journeys`).
- Mientras se busca, hacer visibles los álbumes que coinciden sin exigir expandir su grupo a mano.

**Non-Goals:**
- No cambia el alcance de "Seleccionar todo" de un grupo: sigue actuando sobre el grupo completo,
  no sobre el subconjunto filtrado — evita que buscar "para mirar" termine, sin querer, marcando
  menos álbumes de los que el propietario cree que está seleccionando.
- No persiste el texto de búsqueda entre aperturas del editor o del modal — mismo criterio que el
  resto de los filtros efímeros de esta página (D4 de `add-artist-journey-mark-listened` para la
  vista de selección, aplicado ahora a esta vista de edición).

## Decisions

**D1 — Mientras hay búsqueda activa, se ignora `collapsed` y se fuerza expandido cualquier grupo
con coincidencias; los grupos sin coincidencias no se renderizan.** Alternativa descartada:
expandir automáticamente y *guardar* ese cambio en el `collapsed` del padre — se descarta porque
mutaría el estado de colapso que el propietario ya había elegido antes de buscar, y lo dejaría
alterado después de vaciar la búsqueda sin que lo haya pedido. Mientras se busca, el botón de
colapsar/expandir de cada grupo se deshabilita (no hay nada que alternar: la visibilidad la
decide la búsqueda, no el colapso).

**D2 — El conteo `(seleccionados/total)` de cada grupo sigue contando sobre el grupo completo, no
sobre el subconjunto filtrado.** Mostrar un conteo distinto mientras se busca (p. ej. "1/1" para
un grupo de 10 con una sola coincidencia visible) comunicaría un progreso de selección que no es
real. El buscador filtra qué se *ve*, no qué cuenta.

## Risks / Trade-offs

- [Riesgo] Deshabilitar el colapso mientras se busca podría leerse como que el control dejó de
  responder → [Mitigación] se atenúa visualmente (mismo tratamiento `disabled` que el resto de los
  controles de la app) y el estado se restaura ni bien se vacía la búsqueda.
