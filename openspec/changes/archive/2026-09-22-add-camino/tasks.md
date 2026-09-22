## 1. Esquema

- [x] 1.1 Migración Drizzle: agregar `'custom_journey'` al CHECK `chk_user_list_kind` de
  `user_list`.
- [x] 1.2 Migración: agregar columna `tracking boolean not null default false` a `list_save`.
- [x] 1.3 Migración: índice de soporte para "mis trackeos activos" (`(saver_id) WHERE tracking`).
- [x] 1.4 Migración: índice de soporte para el agregado de descubrimiento
  (`(list_id) WHERE tracking`).
- [x] 1.5 Actualizar `src/db/schema.ts` (`userList.kind`, `listSave.tracking`) y los tipos
  inferidos correspondientes.
- [x] 1.6 Generar y revisar el SQL de migración (`drizzle/0043_add_camino.sql`), sin `Date` como
  parámetro crudo (ver convención del proyecto de SQL crudo).

## 2. Módulo de progreso compartido (refactor sin cambio de comportamiento)

- [x] 2.1 Extraer `countsByListId` y `deriveJourneyState` de
  `src/services/artist-journeys/artist-journeys.ts` a un módulo compartido
  `src/services/journeys/progress.ts`.
- [x] 2.2 Generalizar la firma de `countsByListId` de `(ownerId, listIds)` a
  `(trackerId, listIds)`, sin cambiar su comportamiento cuando `trackerId === ownerId`.
- [x] 2.3 Migrar `artist-journeys.ts` a importar el helper compartido; eliminar la definición
  local duplicada.
- [x] 2.4 Verificar que `artist-journeys.test.ts` sigue pasando sin modificaciones (criterio de
  aceptación del refactor) — 19/19 tests, sin tocar el archivo.

## 3. Servicio y API de Camino dinámico

- [x] 3.1 `src/services/camino/camino.ts`: crear Camino (`kind = 'custom_journey'`,
  `entityType = 'release-group'`, sin `journeyArtistId`).
- [x] 3.2 Agregar/quitar ítems de un Camino propio (idempotente, reutiliza `userListItem` con
  `position` incremental, mismo patrón que `setJourneySelection`).
- [x] 3.3 Progreso derivado de un Camino usando el módulo de `2.`, sin discografía de fondo (el
  Camino ES el conjunto de ítems, no hay universo "no seleccionado" que mostrar).
- [x] 3.4 Archivar / desarchivar un Camino propio.
- [x] 3.5 Borrado físico de un Camino propio.
- [x] 3.6 Listado propio de Caminos dinámicos (`listMyCaminos`), reutilizando el criterio de
  exclusión de `journeyStatesForArtists`/`listMyArtistJourneys` para no aparecer en lecturas
  genéricas de `user_list`.
- [x] 3.7 Endpoints REST bajo `/api/me/caminos` (crear, listar, detalle, agregar/quitar ítem,
  archivar, desarchivar, borrar), validados con Zod, errores vía `ApiError.code`.
- [x] 3.8 Tests de servicio (`camino.test.ts`) cubriendo los escenarios de
  `specs/camino/spec.md`.
- [x] 3.9 Tests de contrato de API (`route.test.ts` por endpoint).

## 4. Tracking sobre listas ajenas (extensión de list-saves)

- [x] 4.1 Extender el servicio de guardado de listas (`src/services/lists/saved-lists.ts`) con
  `setListTracking(trackerId, listId, tracking)`: valida `entityType = 'release-group'`, crea el
  guardado si no existía, activa/desactiva `tracking` sin alterar `following`.
- [x] 4.2 Progreso de una lista ajena trackeada usando el módulo de `2.`, parametrizado por
  `(trackerId, listId)` (`listTrackedLists`).
- [x] 4.3 Endpoint `PATCH /api/me/saved-lists/[listId]` para alternar `tracking`, extendiendo el
  endpoint existente de guardado/seguimiento.
- [x] 4.4 Actualizar el contrato de lectura de "Guardadas" para incluir el estado de tracking por
  entrada (`SavedListSummary.tracking`).
- [x] 4.5 Tests de servicio y de API cubriendo los escenarios de `specs/list-saves/spec.md`
  (Requirement "Trackear el progreso propio sobre una lista ajena" y el Requirement modificado de
  "Superficie Guardadas").

## 5. Superficie /me/caminos

- [x] 5.1 Página `src/app/[locale]/me/caminos/page.tsx`: requiere sesión, lista Caminos propios +
  listas ajenas trackeadas en una sola vista, distinguiendo el origen de cada entrada.
- [x] 5.2 Estado vacío localizado cuando no hay Caminos propios ni tracking activo.
- [x] 5.3 Mensajes i18n (`messages/es/camino.json`, `messages/en/camino.json`) para la nueva
  sección, con copy que distinga "Camino"/"Path" de "Recorrido"/"Journey" sin ambigüedad.
- [x] 5.4 Acceso a `/me/caminos` en el menú de usuario del Header, junto al acceso existente a
  `/me/artist-journeys` (`user-menu-items.ts`, id `caminos`).
- [x] 5.5 Acceso a `/me/caminos` en el panel de gestión del perfil propio (mismo `USER_MENU_ITEMS`
  con `surfaces: BOTH`, igual que `artistJourneys`).
- [x] 5.6 UI de creación/gestión de un Camino propio: crear (`CaminoForm`), archivar/desarchivar/
  borrar con confirmación de dos pasos (`CaminoList`), quitar álbumes (`CaminoManager`). El alta de
  álbumes reusa la acción contextual "Añadir a..." existente (`AddToListPanel` extendido con una
  sección de Caminos para objetivos de álbum), sin buscador de catálogo embebido.

## 6. Acción de tracking en el detalle de una lista ajena

- [x] 6.1 En `/users/[username]/lists/[listId]` (vista de lectura de lista ajena), agregar el
  control de tracking (`TrackListButton`) junto al de Guardar/Seguir, visible solo cuando
  `entityType = 'release-group'`.
- [x] 6.2 Indicador de progreso propio (barra discreta, sin fracción numérica, mismo criterio que
  `artist-journey`) cuando el visitante tiene tracking activo sobre esa lista.

## 7. Descubrimiento público /caminos

- [x] 7.1 Servicio de agregado (`src/services/camino/discovery.ts`): conteo de trackeo activo por
  lista (`GROUP BY` sobre `list_save WHERE tracking`), solo listas públicas de álbumes con al
  menos un trackeo.
- [x] 7.2 Filtro por género (EXISTS contra `release_group_tag` de los álbumes de la lista).
- [x] 7.3 Filtro por artista (EXISTS contra `credit`/`artist`; búsqueda por nombre, no por id —
  sin autocompletado en v1).
- [x] 7.4 Endpoint `GET /api/caminos/discover`, accesible sin sesión.
- [x] 7.5 Página `src/app/[locale]/caminos/page.tsx`: vitrina con filtros género/artista vía
  querystring, sin posiciones numeradas ni distintivos de "top" — mismo criterio que "Populares"
  de `/lists`.
- [x] 7.6 Tests de servicio y de contrato de API cubriendo `specs/camino-discovery/spec.md`.
- [x] 7.7 (agregado durante la implementación) Ruta de lectura ajena dedicada
  `/users/[username]/caminos/[caminoId]` (`getUserCaminoDetail`, `CaminoReadView`): un Camino
  descubierto en `/caminos` no puede enlazar a `/users/[username]/lists/[listId]` porque esa ruta
  excluye `kind = 'custom_journey'` (Requirement "Exclusión..." de `camino`). `TrackedListSummary`
  y `CaminoDiscoverySummary` ganan `kind` para que el cliente resuelva la ruta correcta.

## 8. Documentación y cierre

- [x] 8.1 Nuevo `docs/05-features/caminos.md` documentando el producto cerrado.
- [x] 8.2 Actualizar `docs/03-data/sql-model.md` con `user_list.kind = 'custom_journey'` y
  `list_save.tracking` (agregó también la sección `list_save`, que faltaba documentar por
  completo desde `rework-lists-section`).
- [x] 8.3 Actualizar `docs/04-api/contracts.md` con los endpoints nuevos y el campo `tracking`.
- [x] 8.4 `typecheck`, `lint`, `test` y `build` pasando antes de proponer el archivo del change —
  2970/2970 tests, lint sin errores, `next build` con exit 0 (todas las rutas nuevas presentes:
  `/caminos`, `/me/caminos`, `/me/caminos/[caminoId]`, `/users/[username]/caminos/[caminoId]`,
  `/api/caminos/discover`, `/api/me/caminos/**`).

## 9. Descubribilidad: estante de perfil + acceso general del Header

Agregado tras revisión del usuario en su entorno real (2026-09-22): un Camino recién creado sin
ningún trackeo activo era invisible en la práctica — no aparece en `/caminos` (exige ≥1 trackeo
activo) ni en ninguna superficie del perfil (excluido de "Listas" a propósito). Sin un lugar
donde un visitante lo encontrara por primera vez, nadie podía activar el primer trackeo. Ver
Requirements nuevos "Estante 'Caminos' en el perfil de un usuario" y "Acceso general desde el
Header" en `specs/camino/spec.md`.

- [x] 9.1 `listVisibleCaminos` (`src/services/camino/camino.ts`): Caminos visibles de un perfil
  ajeno, no archivados, con progreso del dueño + estado de tracking del visitante — mismo molde
  que `listUserLists`, sobre `kind = 'custom_journey'`.
- [x] 9.2 Estante "Caminos" en el perfil (`CaminosRail` en `sections.tsx`, `CaminosCarousel`,
  `CaminoProfileCard` reusando `ListCard` genérico), wireado en `page.tsx` después de `ListsRail`
  — mismo patrón que los cinco estantes ya existentes (Exploración/Favoritos/Diario/Listas/
  Colección), documentado en la memoria `profile-redesign`.
- [x] 9.3 Acción de tracking deshabilitada en el propio perfil del dueño (`canTrack`) — no se
  puede trackear el propio Camino; hallazgo al portar el patrón de `SaveListButton` (Listas
  tiene el mismo problema latente sin resolver, fuera de alcance de este change).
- [x] 9.4 Página dedicada `/users/[username]/caminos` (listado completo, paginado, sin buscador/
  filtros en v1 — mismo punto de partida que tuvo `/users/[username]/diary`).
- [x] 9.5 `ProfileLevel3Links` gana la puerta "Todos los Caminos".
- [x] 9.6 Acceso a `/caminos` en la barra general del Header, junto a "Listas" — accesible sin
  sesión.
- [x] 9.7 Tests nuevos: `camino.test.ts` (`listVisibleCaminos`), `sections.test.tsx`
  (`CaminosRail`), `caminos/page.test.tsx` (página dedicada), `Header.test.tsx` (link general).
  `typecheck`/`lint`/tests relacionados verificados en verde.

## 10. Rediseño de /me/caminos: pestañas "Mis Caminos" · "Trackeados"

Pedido explícito del usuario: mockups comparando 4 enfoques de organización para `/me/caminos`
(dos secciones simples / lista unificada con badge de origen / toolbar compartido + secciones /
pestañas al estilo `/me/lists`), publicados como canvas de diseño. Eligió **pestañas** — mismo
patrón que "Mis listas · Guardadas · Descubrir", ya usado en esta app para el mismo problema
(contenido propio vs. ajeno). Reemplaza el `CaminoList.tsx` combinado (tarea 5.6 original) por
dos superficies independientes. Ver Requirement reescrito "Listado propio en /me/caminos, en
pestañas" en `specs/camino/spec.md`.

- [x] 10.1 `caminos-tabs.ts` + `CaminosSection.tsx`: sub-navegación por `?tab=`, calcada de
  `lists-tabs.ts`/`ListsSection.tsx`.
- [x] 10.2 Pestaña "Mis Caminos" (`MyCaminosList.tsx`): buscador, orden (recientes/alfabético/
  estado), filtro de estado, y los tres modos de visualización de Recorridos — calcados pieza por
  pieza de `ArtistJourneyList`/`ArtistJourneysDetailed`/`ArtistJourneysIndex`/
  `ArtistJourneysGraphic`/`ArtistJourneyModeSwitcher`/`ArtistJourneyCardMenu`/
  `ArtistJourneyDeleteConfirm` (equivalentes `MyCaminosDetailed`/`MyCaminosIndex`/
  `MyCaminosGraphic`/`CaminoModeSwitcher`/`CaminoCardMenu`/`CaminoDeleteConfirm`,
  `camino-view-mode.ts`/`use-camino-view-mode.ts`). Reusa `normalizeForSearch` de
  `artist-journey-list-shared.tsx` en vez de duplicarlo (utilidad pura, sin acoplamiento de
  dominio).
- [x] 10.3 Pestaña "Trackeados" (`TrackedCaminosList.tsx`): buscador (título o dueño) + orden
  (recientes/más progreso), sin filtro de estado ni modo de vista — deliberadamente más liviana,
  mismo criterio que "Guardadas" frente a "Mis listas". `listTrackedLists`/`TrackedListSummary`
  ganan `coverThumbUrl` (vía `enrichLists`) para el mosaico de cada fila.
- [x] 10.4 `/me/caminos/page.tsx` reescrito: resuelve la pestaña activa server-side y solo
  consulta el servicio que corresponde (`listMyCaminos` o `listTrackedLists`, nunca ambos).
- [x] 10.5 `CaminoList.tsx` (combinado, de la tarea 5.6 original) eliminado — sin usos
  remanentes.
- [x] 10.6 Hallazgo: `src/test/i18n-test-utils.tsx` nunca registró el namespace `camino` —
  cualquier test que usara `renderWithIntl` sobre un componente de Camino confiando en texto
  traducido (no solo roles/aria) habría fallado en silencio mostrando claves crudas
  (`camino.stateArchived`). Corregido agregando `camino` a `messagesByLocale` (es/en).
- [x] 10.7 Tests nuevos: `MyCaminosList.test.tsx` (13), `TrackedCaminosList.test.tsx` (5),
  `me/caminos/page.test.tsx` (despacho por pestaña, 3). `typecheck`/`lint`/suite completa
  verificados en verde.

## 11. Vista de detalle de un Camino: diseño alineado a Recorrido + registrar escucha

Pedido explícito del usuario: la vista de detalle de un Camino (gestión propia y lectura
trackeada) debía tener un diseño similar al de la página de gestión de Recorrido, porque ambos
tratan álbumes — y diferenciar claramente entre Camino propio y trackeado. Consultado si además
debía ofrecer registrar/quitar escucha por álbum (como Recorrido) o solo mostrar el ✓ existente
sin acción: el usuario eligió paridad completa. Ver Requirements nuevos "Vista de detalle de un
Camino, con álbumes y artista acreditado" y "Registrar y quitar una escucha desde el detalle de un
Camino" en `specs/camino/spec.md`.

- [x] 11.1 `CaminoAlbum`/`CaminoAlbumSchema` ganan `artistName` (artista acreditado en rol
  `primary`, vía subconsulta `credit`/`artist` correlacionada por `release_group_id` — mismo
  patrón que `LIST_ITEM_PRIMARY_ARTIST` de `services/lists/lists.ts`) y `firstReleaseYear`
  (columna directa de `release_group`). Necesario porque, a diferencia de Recorrido, un Camino
  puede mezclar álbumes de artistas distintos: cada fila necesita decir de quién es.
- [x] 11.2 `CaminoAlbumList.tsx` (nuevo, compartido entre gestión propia y lectura trackeada):
  mismo diseño que `ArtistJourneySelectionView` — orden (fecha de lanzamiento/alfabético,
  reutilizando `sortByYear`/`sortAlphabetically` de `artist-journey-sort.ts`), modo de
  visualización (Lista/Gráfico), ✓ + registrar/quitar escucha + "Ampliar" (`ListenEntryForm`) —
  pero sin agrupar por categoría (un Camino es un conjunto plano, no tiene el eje "de
  estudio/en vivo" de una discografía) y mostrando el artista acreditado bajo cada título. El ✓ y
  las acciones de escucha solo aparecen cuando el caller pasa `progressActions` — su ausencia
  oculta esa parte de la fila por completo, no la deshabilita.
- [x] 11.3 `CaminoManager.tsx` (gestión propia) reescrito: encabezado con carátula del primer
  álbum (o disco de reemplazo), badge de estado, Archivar/Eliminar (con confirmación de 2 pasos,
  antes ausente — Recorrido sí la tenía), barra de progreso con fracción. Registrar/quitar
  escucha refresca `camino` vía `getMyCamino` (mismo motivo que `ArtistJourneyManager`: el ✓ y el
  progreso agregado son derivados del servidor). "Quitar" álbum sigue pegando al servidor al
  instante (sin editor de borrador, a diferencia de Recorrido) — gana su propio indicador de
  ocupado por fila (`removingId`).
- [x] 11.4 `CaminoReadView.tsx` (lectura trackeada) reescrito a componente de cliente: mismo
  encabezado, pero de solo lectura (sin Archivar/Eliminar) y con un botón de tracking inline
  (reemplaza `TrackListButton` en esta página únicamente — `TrackListButton` se deja intacto para
  sus otros 3 usos). El ✓/registrar/quitar escucha de cada álbum refleja el diario de **quien
  trackea**, nunca el del dueño (mismo criterio que el progreso agregado, capability
  `list-saves`), y solo se ofrece mientras el tracking está activo — sin él, la lista es de solo
  exploración. Progreso derivado enteramente en el cliente (`selectedCount = albums.length`,
  `listenedCount = viewerListened.size`), sin endpoint nuevo: `listenedReleaseGroupIds` (ya
  existente en `services/journeys/progress.ts`) alcanza para el estado inicial por álbum.
- [x] 11.5 Página `/users/[username]/caminos/[caminoId]` actualizada: reemplaza
  `countsByListId` por `listenedReleaseGroupIds` sobre los álbumes del Camino cuando el tracking
  está activo, y pasa `trackingListenedIds` en vez de un agregado `trackingProgress`.
- [x] 11.6 Tests nuevos: `CaminoManager.test.tsx` (12), `CaminoReadView.test.tsx` (7) — cubren
  encabezado, archivar/desarchivar, borrar con confirmación, quitar álbum, orden, y registrar/
  quitar escucha en ambos contextos, incluyendo que dos personas trackeando el mismo Camino ven
  progresos independientes. `page.test.tsx` del detalle ajeno extendido con el caso de tracking
  activo. `typecheck`/`lint`/suite completa (3022 tests) verificados en verde.
