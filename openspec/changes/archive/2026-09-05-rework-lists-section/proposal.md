## Why

Hoy `/me/lists` es una sola vista: un listado plano de las listas propias con creación por
formulario colapsable y borrado. No hay forma de encontrar una lista puntual cuando hay
muchas, las tarjetas son solo texto (ni portadas ni conteo de ítems), y no existe ninguna
relación con las listas de otras personas —ni guardarlas, ni descubrir las públicas de la
comunidad—. El producto define las listas como una pieza central de curaduría e identidad
(`docs/00-product/product_philosophy.md`), pero la superficie que las gestiona no está a la
altura de ese rol.

Este cambio implementa el plan de diseño aprobado (`docs/05-features/lists-and-favorites.md`,
sección "Sección `/me/lists` — plan de diseño"): convierte `/me/lists` en un apartado con
navegación interna propia —**Mis listas · Guardadas · Descubrir**— manteniendo el mundo
visual vigente ("The Vinyl Listening Room", `DESIGN.md`) y los principios de producto (sin
gamificación, grafo social explícito, descubrimiento no algorítmico).

## What Changes

- **`/me/lists` pasa a ser una sección con sub-navegación** (patrón `role="tablist"`, igual
  que `PopularCommentsTabs`): tres pestañas —Mis listas, Guardadas, Descubrir— con el estado
  de pestaña en la URL (`?tab=`) para que sea enlazable y sobreviva al reload. El encabezado y
  la acción "Nueva lista" persisten entre pestañas.

- **Mis listas — visualización y gestión enriquecidas:**
  - Tarjetas con **mosaico de portadas apiladas** (estilo pila de vinilos) tomadas de los
    primeros ítems, con fallback a la silueta de disco (`DiscPlaceholder`) para listas de
    artistas y canciones o ítems sin carátula.
  - Cada tarjeta muestra **conteo de ítems**, tipo de entidad y audiencia.
  - **Toolbar contextual**: búsqueda por texto sobre el título de la lista, filtro por tipo de
    entidad y orden (recencia / alfabético). Mismo patrón de UI que `/me/feed` y `/me/diary`
    (`FilterSelect` + buscador con debounce + `useInfiniteQuery`).
  - **Creación inline**: "Nueva lista" abre el compositor (`ListForm`) arriba de la pared, sin
    cambiar de ruta; la lista nueva aparece al frente al crearse.
  - **Fijar listas**: el propietario puede fijar sus listas favoritas propias para que
    aparezcan primero, ordenadas antes que el resto por recencia. No es un orden manual total
    (v1).

- **Guardadas (capacidad nueva):** guardar es un **marcador privado** de una lista ajena
  visible; el guardado tiene además el eje **`following`** (seguir la lista). Toggles
  idempotentes con actualización optimista (mismo patrón que favoritos). Una lista guardada
  que dejó de ser visible (pasó a privada, bloqueo, o fue borrada) se muestra como "ya no
  disponible" y se puede quitar. Los guardados son privados: **no se expone un contador
  público** de cuántas personas guardaron una lista.
  - **Integración de las listas seguidas al feed** (que una lista seguida aparezca en el feed
    del lector al actualizarse) se deja para un **cambio de continuación** aparte, sobre
    `activity-feed`: toca la composición del feed (sexta fuente + deduplicación) y su matriz
    de visibilidad, y merece su propio ciclo de spec/tests. `following` ya se persiste y se
    expone en esta entrega, listo para que ese cambio lo consuma.

- **Descubrir (capacidad nueva):** listado paginado de listas **públicas** de la comunidad,
  en orden cronológico descendente (no "para vos", no ranking algorítmico). Cada tarjeta
  muestra dueño (con enlace a su perfil), tipo, conteo de ítems y tiempo relativo, más los
  toggles Guardar / Seguir.

- **Detalle `/me/lists/[listId]`** — pase visual: mosaico en la cabecera, filas de ítem con
  carátula (`CoverThumb`) y disco de fallback. **Conserva su URL, su contrato de API y el
  reordenamiento por teclado (↑/↓).**

- **Vista de perfil ajeno `/users/[username]/lists`** hereda la tarjeta nueva (mosaico +
  conteo) y los toggles Guardar / Seguir.

- **API aditiva y retrocompatible:**
  - `GET /api/me/lists` y `GET /api/users/[username]/lists` devuelven además `itemCount` y
    `coverThumbs` (primeras N carátulas) por lista, y aceptan query params opcionales de
    búsqueda / filtro / orden.
  - `POST /api/me/lists/{listId}/pin` y `DELETE .../pin` (o un `PATCH` con `pinned`) para
    fijar / desfijar.
  - `POST /api/me/saved-lists` / `DELETE /api/me/saved-lists/{listId}` / `GET
    /api/me/saved-lists` para guardar, seguir y listar guardadas.
  - `GET /api/lists/discover` para la pestaña Descubrir.

## Capabilities

### New Capabilities

- `list-saves`: guardar (marcador privado) y seguir listas ajenas visibles; superficie
  "Guardadas" en `/me/lists`; degradación cuando una lista guardada deja de ser visible. (La
  integración de las listas seguidas como fuente del feed queda para un cambio de
  continuación sobre `activity-feed`.)
- `list-discovery`: superficie "Descubrir" en `/me/lists` con las listas públicas de la
  comunidad, paginada y en orden cronológico, sin recomendación algorítmica.

### Modified Capabilities

- `lists`: la superficie propia (`Requirement: Lista de listas propias`) pasa de un listado
  plano a una sección con sub-navegación, búsqueda/filtro/orden en servidor, tarjetas con
  mosaico de portadas y conteo de ítems, creación inline y listas fijadas; `Requirement:
  Listas ajenas visibles` expone `itemCount` y `coverThumbs` y ofrece Guardar/Seguir sobre
  las listas visibles.
_(La modificación de `activity-feed` para incorporar las listas seguidas como fuente del feed
se traslada a un cambio de continuación — ver nota en "What Changes".)_

## Impact

- **Base de datos** (migraciones SQL nuevas, nunca editar las aplicadas):
  - Tabla `list_save` (`saver_id`, `list_id`, `following` boolean, `created_at`), con unicidad
    `(saver_id, list_id)` y `ON DELETE CASCADE` desde `user_list` y `app_user`.
  - Columna `user_list.pinned_at timestamptz NULL` para el orden de fijadas (decisión abierta:
    columna vs. tabla aparte — se resuelve en `design.md`).
- **API:**
  - `GET /api/me/lists`, `GET /api/users/[username]/lists`: campos nuevos en la respuesta
    (`itemCount`, `coverThumbs`) y query params opcionales (`q`, `entityType`, `sort`).
    Aditivo — actualizar `route.test.ts` y `docs/04-api/contracts.md`.
  - Endpoints nuevos: pin/unpin, saved-lists (crear/actualizar `following`/borrar/listar),
    `lists/discover`.
- **Servicios:** `src/services/lists/lists.ts` (conteo + carátulas + búsqueda/orden + pin),
  `src/services/lists/saved-lists.ts` (nuevo), `src/services/lists/discovery.ts` (nuevo),
  `src/services/social/visibility.ts` (reutilizado, sin cambios de reglas). `feed.ts` NO se
  toca en esta entrega.
- **Frontend:**
  - `src/app/[locale]/me/lists/page.tsx` (+ manejo de `?tab=`), `.../[listId]/page.tsx` (pase
    visual).
  - `src/components/lists/*`: nueva `ListsSection` (tabs), `ListCard` (mosaico + conteo),
    `ListCoverMosaic`, `SavedListsTab`, `DiscoverListsTab`, `SaveListButton`; `ListsList`,
    `ListDetail`, `ListForm`, `AddToListButton` adaptados.
  - Reutiliza `FilterSelect`, `EmptyState`, `Button`, `CoverThumb`, `DiscPlaceholder`,
    `useInfiniteQuery`, el patrón de tablist de `PopularCommentsTabs`.
- **i18n:** `messages/{es,en}/lists.json` — claves nuevas (pestañas, toolbar, mosaico, guardar/
  seguir, estados vacíos y de "ya no disponible", Descubrir).
- **Tests:** servicios (conteo/carátulas/búsqueda/orden/pin, saved-lists idempotente y
  visibilidad, discovery), rutas (params nuevos, endpoints nuevos, retrocompatibilidad),
  componentes (tabs, tarjeta con/sin carátula, toggles optimistas, estados vacíos, "ya no
  disponible").
- **Docs:** `docs/04-api/contracts.md`, `docs/05-features/lists-and-favorites.md` (mover el
  plan de "propuesto" a implementado), `docs/05-features/README.md`.
- **Sin dependencias nuevas.** Sin cambios en el `Header` global, en el modelo de ítems de
  lista (tipo único, dueño único, orden manual, borrado físico), en el sistema de doble rating
  ni en la URL/contrato del detalle de lista.
