## 1. Esquema de base de datos

- [x] 1.1 Migración SQL nueva: tabla `list_save` (`saver_id`, `list_id`, `following boolean
      not null default false`, `created_at`), PK `(saver_id, list_id)`, FKs a `app_user` y
      `user_list` con `ON DELETE CASCADE`, índice por `saver_id`.
- [x] 1.2 Migración SQL nueva: tabla `user_list_pin` (`owner_id`, `list_id`, `pinned_at
      timestamptz not null default now()`), PK `(owner_id, list_id)`, FKs a `app_user` y
      `user_list` con `ON DELETE CASCADE`, índice por `owner_id`.
- [x] 1.3 `src/db/schema.ts`: declarar ambas tablas y exportar sus tipos inferidos
      (`ListSaveRow`, `UserListPinRow`).
- [x] 1.4 Aplicar migraciones en local y verificar el esquema resultante. (Migración 0013
      aplicada; `tsc --noEmit` en verde.)

## 2. Servicio: enriquecer el listado de listas propias y ajenas

- [x] 2.1 `src/services/lists/lists.ts`: `enrichLists(listIds)` resuelve `itemCount` (count por
      `list_id`) y `coverThumbs` (`row_number() over (partition by list_id order by
      position)` filtrando `rn <= 4` y carátula no nula) en dos consultas acotadas.
- [x] 2.2 `listMyLists`: acepta `ListFilters { q?, entityType?, sort? }`, validados
      (`VALIDATION_ERROR` fuera de rango); `ilike` sobre `user_list.title`, filtro por
      `entityType`, orden `recent` (default) / `alpha`, fijadas primero (`left join
      user_list_pin`, `pinned_at is null` asc + `pinned_at` desc).
- [x] 2.3 `listUserLists`: incluye `itemCount` y `coverThumbs` en cada lista visible; sin
      cambios en la matriz de visibilidad.
- [x] 2.4 `UserListSummary` (servicio + `UserListSummarySchema`) ganan `itemCount`,
      `coverThumbs` y `pinned`; el detalle los deriva de sus ítems y su pin.
- [x] 2.5 Tests en `src/services/lists/lists.test.ts` reescritos con proxy encadenable:
      conteo/carátulas (parciales, lista de artistas → vacío, lista vacía → `0`), búsqueda,
      filtro por tipo, orden alfabético, fijadas primero, `sort`/`entityType` inválidos.

## 3. Servicio: fijar listas

- [x] 3.1 `src/services/lists/lists.ts`: `pinList` / `unpinList` idempotentes
      (`onConflictDoNothing` / `delete`), `LIST_NOT_FOUND` si la lista no es del `ownerId`.
- [x] 3.2 Fijar/desfijar escribe en `user_list_pin`, nunca en `user_list` → no dispara el
      trigger de `updated_at` ni un evento de feed (garantizado por diseño de tabla aparte).
- [x] 3.3 Tests: fijar, desfijar, idempotencia, lista ajena → `LIST_NOT_FOUND`.

## 4. Servicio: guardar y seguir listas ajenas

- [x] 4.1 `src/services/lists/saved-lists.ts` (nuevo): `saveList(saverId, listId, { following
      })` con validación previa (lista existe y es visible para el `saver` vía
      `audiencesForProfile` + bloqueos; no propia → `VALIDATION_ERROR`; no visible →
      `LIST_NOT_FOUND`), upsert `ON CONFLICT (saver_id, list_id) DO UPDATE SET following`.
- [x] 4.2 `unsaveList(saverId, listId)` idempotente.
- [x] 4.3 `listSavedLists(saverId, page, pageSize)`: listas guardadas con dueño, tipo,
      `itemCount`, `coverThumbs`, `following`; orden por `created_at` desc; marca
      `unavailable: true` cuando la lista dejó de ser visible o fue borrada, sin filtrarla.
- [x] 4.4 Tests en `src/services/lists/saved-lists.test.ts`: guardar visible, seguir/dejar de
      seguir, idempotencia, guardar propia (validación), guardar no visible
      (`LIST_NOT_FOUND`), lista guardada que pasa a privada → `unavailable`, borrado en
      cascada, bloqueo posterior, sin sesión cubierto en la ruta.

## 5. Servicio: descubrir listas públicas

- [x] 5.1 `src/services/lists/discovery.ts` (nuevo): `listDiscoverLists(readerId, page,
      pageSize)` — `user_list.audience = 'public'`, perfil del dueño `public`, `owner_id !=
      readerId`, sin bloqueo en ninguna dirección; enriquecer con `itemCount`/`coverThumbs` y
      con `saved`/`following` del lector (`left join list_save`); orden `created_at` desc.
- [x] 5.2 Tests en `src/services/lists/discovery.test.ts`: listas públicas recientes, exclusión
      de propias, exclusión por bloqueo, `followers`/`private` nunca aparecen, perfil privado
      con lista pública excluido, estado de guardado reflejado, paginación inválida.

## 6. Feed de listas seguidas — fuera de alcance de esta entrega

La integración al feed (que una lista seguida aparezca en el feed del lector al
actualizarse) toca la composición bajo demanda de `activity-feed` (sexta fuente +
deduplicación por clave de evento) y su matriz de visibilidad, y arrastra el churn de ~11
tests posicionales del feed. Se traslada al cambio de continuación
**`add-followed-lists-to-feed`**, que modificará `activity-feed`. En esta entrega `following`
ya se persiste y se expone (`src/services/lists/saved-lists.ts`: `followedListIds`,
`savedStateFor`), listo para que ese cambio lo consuma. `src/services/feed/feed.ts` no se
toca acá.

## 7. API: rutas

- [ ] 7.1 `GET /api/me/lists`: parsear y validar `q`, `entityType`, `sort` opcionales;
      respuesta con `itemCount`/`coverThumbs`. Actualizar `route.test.ts` (retrocompatible sin
      params).
- [ ] 7.2 `GET /api/users/[username]/lists`: `itemCount`/`coverThumbs` en la respuesta;
      `route.test.ts`.
- [ ] 7.3 `POST` y `DELETE /api/me/lists/{listId}/pin` (o `PATCH` con `{ pinned }` — seguir la
      decisión de `design.md`); `with-error-handling`, `AUTH_REQUIRED` sin sesión,
      `LIST_NOT_FOUND` si no es propia. `route.ts` + `route.test.ts`.
- [ ] 7.4 `POST /api/me/saved-lists` (`{ listId, following }`), `DELETE
      /api/me/saved-lists/{listId}`, `GET /api/me/saved-lists?page=&pageSize=`. Validación,
      códigos de error, tests.
- [ ] 7.5 `GET /api/lists/discover?page=&pageSize=`. Validación, `AUTH_REQUIRED` sin sesión,
      tests.
- [ ] 7.6 `docs/04-api/contracts.md`: documentar los campos nuevos, los query params y los
      endpoints nuevos en la sección "Listas".

## 8. Capa de acceso cliente

- [ ] 8.1 `src/lib/api/schemas.ts`: esquemas Zod para `ListSummary` con `itemCount`/
      `coverThumbs`, `SavedListSummary` (con `following`, `unavailable`), `DiscoverListSummary`
      (con `saved`/`following`), y las respuestas paginadas.
- [ ] 8.2 `src/lib/api/lists.ts`: `getMyLists(page, pageSize, filters)`, `pinList`/`unpinList`,
      `saveList`/`unsaveList`/`getSavedLists`, `getDiscoverLists` — todas por `apiFetch` +
      esquema.
- [ ] 8.3 `src/lib/query/keys.ts`: `queryKeys.myLists(filters)`, `queryKeys.savedLists()`,
      `queryKeys.discoverLists()`.

## 9. UI: sección con sub-navegación

- [ ] 9.1 `src/app/[locale]/me/lists/page.tsx`: leer y validar `searchParams.tab`
      (`mine`|`saved`|`discover`, fallback `mine`); resolver la primera página del panel
      activo en el servidor; renderizar encabezado + `ListsSection` + panel.
- [ ] 9.2 `src/components/lists/ListsSection.tsx` (client): tira de pestañas con `<Link>` a
      `?tab=`, semántica `tablist`/`tab`/`tabpanel`, navegación por flechas (patrón
      `PopularCommentsTabs`), acción "Nueva lista" persistente.
- [ ] 9.3 `src/components/lists/ListCoverMosaic.tsx` (server): grilla 2×2 de `CoverThumb`/
      `LazyCoverImage` o `DiscPlaceholder`; sin sombras, separación por hairline; realce de
      borde en hover con `prefers-reduced-motion`; `aria-hidden` (decorativo).
- [ ] 9.4 `src/components/lists/ListCard.tsx` (server): mosaico + título enlazado + metadatos
      (tipo, `itemCount`, audiencia o dueño según contexto); usada por las tres pestañas y por
      el perfil ajeno.

## 10. UI: pestaña "Mis listas"

- [ ] 10.1 `src/components/lists/MyListsTab.tsx` (client): grid de `ListCard` (1-col / 2-col
      ≥md), `useInfiniteQuery` sembrado con `initialData`.
- [ ] 10.2 Toolbar: buscador con debounce (300ms) + `FilterSelect` de tipo + `FilterSelect`
      de orden + "Limpiar filtros"; misma disposición que `FeedList`/`DiaryActivityList`.
- [ ] 10.3 Creación inline: "Nueva lista" abre `ListForm` arriba de la pared; al crear, la
      lista entra al frente (invalidar/optimista) sin cambiar de ruta.
- [ ] 10.4 Menú por tarjeta: Editar (a `/me/lists/[listId]`), Fijar/Desfijar (optimista),
      Eliminar con confirmación (reusar el patrón actual de `ListsList`).
- [ ] 10.5 Estados: vacío real (sin listas) con CTA a crear; "sin resultados" (con filtros)
      distinto; error inline reintentable; `aria-live` al cargar más.

## 11. UI: pestañas "Guardadas" y "Descubrir"

- [ ] 11.1 `src/components/lists/SaveListButton.tsx` (client): toggle Guardar + toggle Seguir,
      optimista con rollback (patrón `favorites`), estados de error accesibles.
- [ ] 11.2 `src/components/lists/SavedListsTab.tsx` (client): grid de `ListCard` con dueño y
      `SaveListButton`; entrada "ya no disponible" (`unavailable`) con opción de quitar;
      `useInfiniteQuery`; vacío localizado que explica cómo guardar listas.
- [ ] 11.3 `src/components/lists/DiscoverListsTab.tsx` (client): grid de `ListCard` con dueño,
      tiempo relativo y `SaveListButton`; `useInfiniteQuery`; vacío ("todavía no hay listas
      públicas").
- [ ] 11.4 `/users/[username]/lists`: usar `ListCard` (mosaico + conteo) y `SaveListButton`
      sobre las listas ajenas (no sobre las propias).

## 12. UI: pase visual del detalle

- [ ] 12.1 `src/components/lists/ListDetail.tsx`: `ListCoverMosaic` en la cabecera; filas de
      ítem con `CoverThumb` + disco de fallback; conservar edición de metadatos, reordenar
      ↑/↓, borrar y la URL.
- [ ] 12.2 `src/app/[locale]/me/lists/[listId]/page.tsx`: sin cambios de contrato; ajustar
      solo el layout si hace falta para la cabecera nueva.

## 13. i18n

- [ ] 13.1 `messages/{es,en}/lists.json`: claves nuevas (pestañas, toolbar, orden, mosaico
      `aria`, fijar/desfijar, guardar/seguir, "ya no disponible", estados vacíos de Guardadas
      y Descubrir, tiempo relativo si no se reusa uno existente).
- [ ] 13.2 `messages/{es,en}/feed.json`: etiqueta del origen "lista seguida" si la UI del feed
      la distingue.

## 14. Componentes: tests

- [ ] 14.1 `ListsSection` — pestaña activa desde `?tab=`, fallback con valor inválido,
      navegación por flechas, "Nueva lista" visible en las tres.
- [ ] 14.2 `ListCard` / `ListCoverMosaic` — mosaico con carátulas, mosaico de discos (lista de
      artistas), carátulas parciales, lista vacía con conteo `0`, mosaico `aria-hidden`.
- [ ] 14.3 `MyListsTab` — filtros (búsqueda, tipo, orden, limpiar), creación inline entra al
      frente, fijar reordena, vacío vs. "sin resultados", `aria-live`.
- [ ] 14.4 `SaveListButton` — toggle optimista y rollback en error, Guardar y Seguir
      independientes.
- [ ] 14.5 `SavedListsTab` / `DiscoverListsTab` — render con datos, "ya no disponible" con
      quitar, estados vacíos, estado de guardado reflejado en Descubrir.

## 15. Documentación y verificación final

- [ ] 15.1 `docs/05-features/lists-and-favorites.md`: mover la sección del plan de
      "propuesto" a implementado, dejando la integración al feed marcada como continuación;
      `docs/05-features/README.md`: actualizar estado.
- [ ] 15.2 `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm run build` — los
      cuatro en verde.
- [ ] 15.3 Verificación manual en navegador (cuenta y datos reales): las tres pestañas,
      `?tab=` enlazable y tras reload, creación inline, fijar, guardar/seguir una lista ajena
      y verla en el feed, Descubrir, "ya no disponible", detalle con mosaico; mobile 375px sin
      overflow; foco ámbar 2px visible; `prefers-reduced-motion` respetado.
- [ ] 15.4 Detector de diseño de Impeccable sobre los componentes tocados
      (`node .claude/skills/impeccable/scripts/detect.mjs --json <archivos>`) — sin hallazgos.
- [ ] 15.5 `openspec validate rework-lists-section --strict` en verde.
