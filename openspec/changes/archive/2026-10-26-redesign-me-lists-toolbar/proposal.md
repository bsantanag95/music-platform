## Why

La Fase 1 (`refine-me-lists-page-phase1`) corrigió los errores de `/me/lists`. Quedan los problemas de estructura que
encontró la auditoría:

- **"Nueva lista" solo existe en Mis listas**, aunque el requisito de la sección la pide en las tres pestañas, y abre un
  formulario en línea de ~250 px que empuja la pared hacia abajo, con dos botones "Cerrar".
- **Las pestañas no dicen cuántas listas hay** y la página no muestra ningún total.
- **"Descubrir" repite `/lists`** con tarjetas de una versión anterior; la superficie pública ya tiene búsqueda, tipos,
  orden por guardados y estanterías.
- **El tipo y el orden son selectores nativos** recortados ("Todos los tipos") en una fila propia, distintos de los
  segmentos con cifras de Pendientes, Favoritos y Colección.
- **Guardadas no tiene buscador, tipo ni orden.**

## What Changes

- **Cabecera** con título, descripción y "+ Nueva lista", visible en las dos pestañas. Abre un diálogo con el formulario
  (el mismo `ListForm`); `?new=1` lo abre al cargar. Al crear desde Guardadas, se pasa a Mis listas.
- **Dos pestañas con su total**: "Mis listas 14 · Guardadas 4". "Descubrir" pasa a ser un enlace "Descubrir en Comunidad"
  a `/lists`; `?tab=discover` redirige a `/lists`. Los totales se actualizan al crear, borrar o dejar de guardar.
- **API**: `GET /api/me/lists` y `GET /api/me/saved-lists` devuelven `counts` (cuántas listas hay de cada tipo, sin
  filtros). `GET /api/me/saved-lists` acepta `q`, `entityType` y `sort` (`recent` por fecha de guardado, `alpha`).
- **Barra en una fila**: buscador, segmentos de tipo con cifras (un tipo en 0 queda deshabilitado) y el orden con la
  etiqueta dentro, como en Pendientes. Guardadas usa la misma barra y escribe sus filtros en la URL.

### Goals

- Que la página diga cuánto hay y deje filtrar igual en Mis listas y en Guardadas.
- Crear una lista sin perder de vista la pared.

### Non-Goals

- Estantería, sección "Fijadas", menú ⋯, lista vacía con invitación, "Mover a la posición…" (Fase 3).
- Cambios en `/lists` ni en el listado de un perfil ajeno, salvo el orden con la etiqueta dentro, que comparten.

## Capabilities

### Modified Capabilities

- `lists`: cabecera con "Nueva lista" en diálogo, dos pestañas con total y enlace a Comunidad, `counts` en Mis listas.
- `list-saves`: Guardadas con búsqueda, tipo, orden y `counts`.
- `list-discovery`: el listado cronológico vive solo en `/lists`; `/me/lists?tab=discover` redirige.

## Impact

- API: `src/app/api/me/lists/route.ts`, `src/app/api/me/saved-lists/route.ts`, `src/services/lists/{lists,saved-lists}.ts`,
  `src/lib/api/{schemas,lists}.ts`, `docs/04-api/contracts.md`.
- UI: `src/app/[locale]/me/lists/page.tsx`, `ListsSection`, `MyListsTab`, `SavedListsTab`, `ListsToolbar`, nuevos
  `ListTypeSegments`, `ListSortSelect`, `NewListButton`; se borra `DiscoverListsTab`.
- `messages/{es,en}/lists.json`, `docs/05-features/lists-and-favorites.md`.
- Sin cambios de esquema.
