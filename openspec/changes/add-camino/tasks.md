## 1. Esquema

- [ ] 1.1 Migración Drizzle: agregar `'custom_journey'` al CHECK `chk_user_list_kind` de
  `user_list`.
- [ ] 1.2 Migración: agregar columna `tracking boolean not null default false` a `list_save`.
- [ ] 1.3 Migración: índice de soporte para "mis trackeos activos" (`(saver_id) WHERE tracking`).
- [ ] 1.4 Migración: índice de soporte para el agregado de descubrimiento
  (`(list_id) WHERE tracking`).
- [ ] 1.5 Actualizar `src/db/schema.ts` (`userList.kind`, `listSave.tracking`) y los tipos
  inferidos correspondientes.
- [ ] 1.6 Generar y revisar el SQL de migración (`drizzle/00XX_add_camino.sql`), sin `Date` como
  parámetro crudo (ver convención del proyecto de SQL crudo).

## 2. Módulo de progreso compartido (refactor sin cambio de comportamiento)

- [ ] 2.1 Extraer `countsByListId` y `deriveJourneyState` de
  `src/services/artist-journeys/artist-journeys.ts` a un módulo compartido
  `src/services/journeys/progress.ts`.
- [ ] 2.2 Generalizar la firma de `countsByListId` de `(ownerId, listIds)` a
  `(trackerId, listIds)`, sin cambiar su comportamiento cuando `trackerId === ownerId`.
- [ ] 2.3 Migrar `artist-journeys.ts` a importar el helper compartido; eliminar la definición
  local duplicada.
- [ ] 2.4 Verificar que `artist-journeys.test.ts` sigue pasando sin modificaciones (criterio de
  aceptación del refactor).

## 3. Servicio y API de Camino dinámico

- [ ] 3.1 `src/services/camino/camino.ts`: crear Camino (`kind = 'custom_journey'`,
  `entityType = 'release-group'`, sin `journeyArtistId`).
- [ ] 3.2 Agregar/quitar ítems de un Camino propio (idempotente, reutiliza `userListItem` con
  `position` incremental, mismo patrón que `setJourneySelection`).
- [ ] 3.3 Progreso derivado de un Camino usando el módulo de `2.`, sin discografía de fondo (el
  Camino ES el conjunto de ítems, no hay universo "no seleccionado" que mostrar).
- [ ] 3.4 Archivar / desarchivar un Camino propio.
- [ ] 3.5 Borrado físico de un Camino propio.
- [ ] 3.6 Listado propio de Caminos dinámicos (`listMyCaminos`), reutilizando el criterio de
  exclusión de `journeyStatesForArtists`/`listMyArtistJourneys` para no aparecer en lecturas
  genéricas de `user_list`.
- [ ] 3.7 Endpoints REST bajo `/api/me/caminos` (crear, listar, detalle, agregar/quitar ítem,
  archivar, desarchivar, borrar), validados con Zod, errores vía `ApiError.code`.
- [ ] 3.8 Tests de servicio (`camino.test.ts`) cubriendo los escenarios de
  `specs/camino/spec.md`.
- [ ] 3.9 Tests de contrato de API (`route.test.ts` por endpoint).

## 4. Tracking sobre listas ajenas (extensión de list-saves)

- [ ] 4.1 Extender el servicio de guardado de listas (`src/services/lists/saved-lists.ts` o
  equivalente) con `setListTracking(trackerId, listId, tracking)`: valida
  `entityType = 'release-group'`, crea el guardado si no existía, activa/desactiva `tracking` sin
  alterar `following`.
- [ ] 4.2 Progreso de una lista ajena trackeada usando el módulo de `2.`, parametrizado por
  `(trackerId, listId)`.
- [ ] 4.3 Endpoint `PATCH` (o específico) sobre `list_save` para alternar `tracking`, reusando o
  extendiendo el contrato existente de guardado/seguimiento.
- [ ] 4.4 Actualizar el contrato de lectura de "Guardadas" para incluir el estado de tracking por
  entrada (solo en listas de álbumes).
- [ ] 4.5 Tests de servicio y de API cubriendo los escenarios de `specs/list-saves/spec.md`
  (Requirement "Trackear el progreso propio sobre una lista ajena" y el Requirement modificado de
  "Superficie Guardadas").

## 5. Superficie /me/caminos

- [ ] 5.1 Página `src/app/[locale]/me/caminos/page.tsx`: requiere sesión, lista Caminos propios +
  listas ajenas trackeadas en una sola vista, distinguiendo el origen de cada entrada.
- [ ] 5.2 Estado vacío localizado cuando no hay Caminos propios ni tracking activo.
- [ ] 5.3 Mensajes i18n (`messages/es/...`, `messages/en/...`) para la nueva sección, con copy
  que distinga "Camino" de "Recorrido" sin ambigüedad.
- [ ] 5.4 Acceso a `/me/caminos` en el menú de usuario del Header, junto al acceso existente a
  `/me/artist-journeys`.
- [ ] 5.5 Acceso a `/me/caminos` en el panel de gestión del perfil propio.
- [ ] 5.6 UI de creación/gestión de un Camino propio (crear, agregar/quitar álbumes, archivar,
  desarchivar, borrar con confirmación de dos pasos).

## 6. Acción de tracking en el detalle de una lista ajena

- [ ] 6.1 En `/users/[username]/lists/[listId]` (vista de lectura de lista ajena), agregar el
  control de tracking junto al de Guardar/Seguir, visible solo cuando `entityType = 'release-group'`.
- [ ] 6.2 Indicador de progreso propio (barra discreta, sin fracción numérica, mismo criterio que
  `artist-journey`) cuando el visitante tiene tracking activo sobre esa lista.

## 7. Descubrimiento público /caminos

- [ ] 7.1 Servicio de agregado: conteo de trackeo activo por lista (`GROUP BY list_id` sobre
  `list_save WHERE tracking`), solo listas públicas de álbumes con al menos un trackeo.
- [ ] 7.2 Filtro por género (join a `release_group_tag` de los álbumes de la lista).
- [ ] 7.3 Filtro por artista (join a través de `release_group` → artista acreditado).
- [ ] 7.4 Endpoint `GET /api/caminos/discover` (o equivalente), accesible sin sesión.
- [ ] 7.5 Página `src/app/[locale]/caminos/page.tsx`: vitrina con toolbar (texto/orden/género/
  artista), sin posiciones numeradas ni distintivos de "top" — mismo criterio que "Populares" de
  `/lists`.
- [ ] 7.6 Tests de servicio y de contrato de API cubriendo `specs/camino-discovery/spec.md`.

## 8. Documentación y cierre

- [ ] 8.1 Nuevo `docs/05-features/caminos.md` (o sección hermana a
  `docs/05-features/lists-and-favorites.md`) documentando el producto cerrado.
- [ ] 8.2 Actualizar `docs/03-data/sql-model.md` con `user_list.kind = 'custom_journey'` y
  `list_save.tracking`.
- [ ] 8.3 Actualizar `docs/04-api/contracts.md` con los endpoints nuevos y el campo `tracking`.
- [ ] 8.4 `typecheck`, `lint`, `test` y `build` pasando antes de proponer el archivo del change.
