## 1. Servicio: enriquecimiento de ítems

- [x] 1.1 En `src/services/lists/lists.ts`, `listItems` pobla `artistName` para ítems de
  `release_group` y de `recording` (subquery escalar `LIST_ITEM_PRIMARY_ARTIST` sobre `credit`,
  espejo del helper del feed).
- [x] 1.2 `listItems` resuelve una carátula representativa para ítems de `recording`
  (`LIST_ITEM_SONG_COVER`: `track → release → release_group`, determinista por `created_at, id`;
  `null` si no hay). `enrichLists` combina esa carátula en el mosaico de la tarjeta con
  `coalesce`.
- [x] 1.3 `serializeDetail` deriva `coverThumbs` de los ítems sin cambios; las listas de
  canciones ahora traen mosaico real tanto en tarjeta como en detalle.
- [x] 1.4 Pruebas de servicio (`lists.test.ts`): `artistName` poblado por tipo; carátula
  representativa presente/ausente; `coverThumbs` de una lista de canciones combinada.
- [x] 1.5 `docs/04-api/contracts.md`: `artistName` aditivo en el detalle propio y ajeno.

## 2. Preferencia de modo de visualización

- [x] 2.1 `src/components/lists/use-list-view-mode.ts`: hook `"use client"` que lee/escribe
  `music-platform:list-view-mode` en `localStorage` con `try/catch`, default `"detailed"`,
  lectura en `useEffect` tras montaje.
- [x] 2.2 `src/components/lists/list-view-mode.ts` (sin `"use client"`): tipo `ListViewMode`,
  vocabulario, default, clave de storage y `parseListViewMode`.
- [x] 2.3 `use-list-view-mode.test.ts`: sin preferencia → default; guardada válida → se
  respeta; guardada inválida → default; persiste al actualizar; storage que lanza → no rompe.

## 3. Conmutador y renderers de ítems

- [x] 3.1 `ListModeSwitcher.tsx` (client): `role="radiogroup"` de 3 opciones, flechas,
  etiqueta mono en ≥sm / icono + `sr-only` en <sm, estado activo en ámbar.
- [x] 3.2 `ItemsDetailed.tsx`: fila con Nº, `CoverThumb` `size-14 sm:size-16`, título
  enlazado, línea `artistName`; `ReorderButtons` + `RemoveItemButton` al pie si hay `actions`.
- [x] 3.3 `ItemsIndex.tsx`: fila compacta `NN · Título — artista` truncada, hairline;
  controles revelados en hover/foco (visibles siempre en <sm).
- [x] 3.4 `ItemsGraphic.tsx`: grilla `grid-cols-3` → `grid-cols-5`, carátula/disco por tile,
  título como caption enlazado (accesible), Nº en badge; selección de tile + barra de acciones
  (Al principio · Subir · Bajar · Al final · Quitar · Listo) con `aria-live`.
- [x] 3.5 `ListItemsView.tsx`: integra `use-list-view-mode` + `ListModeSwitcher` + renderer
  activo; recibe `items`, `entityType`, `manage?`; encabezado "Elementos (N)" enfrentado al
  conmutador. El cambio de modo no se anima para nadie.
- [x] 3.6 `list-item-order.ts`: `moveByOffset` y `moveToEdge` puros; `ListItemsView` los
  compone y llama a `onReorder` con el orden completo; controles compartidos en
  `ListItemControls.tsx`.

## 4. Alta de ítems desde el detalle

- [x] 4.1 `ListItemSearch.tsx` (client): panel inline (no modal) sobre la lista, abierto desde
  un botón "Agregar elemento"; estados carga/vacío/sin-resultados/error; `aria-live` en el
  conteo de resultados.
- [x] 4.2 Ramas `artist` / `release-group`: input con debounce ~300ms → `searchCatalog(q)`;
  resultados filtrados por `kind` según `entityType`; dedupe contra ítems actuales ("Ya
  está"); alta optimista con `addItemToList`, panel persistente.
- [x] 4.3 Rama `recording`: el buscador resuelve álbumes; al elegir uno, expandir tracklist
  con `getReleaseGroupDetail`; selección de pistas → alta por `recordingId` con
  `addItemToList`; dedupe contra ítems actuales.
- [x] 4.4 Cablear el alta al estado del detalle (append optimista + rollback ante
  `ApiError.code`).
- [x] 4.5 Pruebas de componente: alta de álbum, alta de canciones desde tracklist, resultado
  ya presente deshabilitado, error con rollback.

## 5. Cabecera del detalle

- [x] 5.1 `ListDetailHeader.tsx`: título, línea de metadatos mono (audiencia · tipo ·
  `itemsCount` · fecha · "Fijada"); si `canManage`, grupo discreto Editar/Eliminar (mover
  "Eliminar" fuera de la sección de ítems).
- [x] 5.2 Panel de edición inline con el lenguaje de `ListForm` (título ≤100, descripción
  ≤500, audiencia); `entityType` como chip de sólo lectura.
- [x] 5.3 Modo visitante: atribución al dueño (enlace al perfil), tiempo relativo
  (`RelativeDate`), `SaveListButton`.

## 6. Reparto de `ListDetail` y detalle propio

- [x] 6.1 Reescribir `src/components/lists/ListDetail.tsx` para componer `ListDetailHeader` +
  `ListItemsView` con `canManage`; conservar `ListDetailProps` (`initial: UserListDetail`) y
  el manejo de errores por `ApiError.code`.
- [x] 6.2 Migrar/actualizar las pruebas existentes del detalle propio (edición de metadatos,
  quitar, reordenar) al nuevo árbol.
- [x] 6.3 Estados: lista vacía (propietario, con "Agregar elemento" destacado; visitante, con
  texto); ítem sin título → "Elemento no disponible" con opción de quitar (propietario).

## 7. Página de lectura de lista ajena

- [x] 7.1 Crear `src/app/[locale]/users/[username]/lists/[listId]/page.tsx` (Server
  Component): `await params`, validar `listId` uuid → `notFound()`, resolver visitante,
  servicio de detalle ajeno (matriz de visibilidad existente), `catch → notFound()`.
- [x] 7.2 Renderizar `ListDetailHeader` + `ListItemsView` con `canManage={false}`.
- [x] 7.3 Verificar que se resuelven los enlaces desde `DiscoverListsTab`, `SavedListsTab`,
  `FeedActivityList`, `PublicLists` y `ListsList` (ya no caen en `[...unknown]`).
- [x] 7.4 Prueba de la página: lista visible → render; no visible → `notFound`; `username`
  inexistente → `notFound`.

## 8. i18n

- [x] 8.1 Agregar claves ES/EN en `messages/*/lists.json`: nombres y etiquetas de los tres
  modos, "Agregar elemento", placeholders de búsqueda, "Ya está", encabezado de tracklist,
  acciones de la barra de selección (Subir/Bajar/Al principio/Al final/Listo), "Al principio",
  "Al final", "Elemento no disponible", atribución/tiempo en vista lectura.
- [x] 8.2 Verificar `src/test/i18n-test-utils.tsx` cubre las claves nuevas.

## 9. Documentación de alcance y backlog

- [x] 9.1 En `docs/05-features/lists-and-favorites.md`, agregar sección del cambio
  `rework-list-detail`: alcance entregado (3 modos, gestión de ítems, alta embebida, vista
  lectura, carátula de canciones).
- [x] 9.2 Documentar el backlog fuera de alcance con el criterio de cuándo abordarlo:
  - *Por cercanía al cambio (pronto, riesgo bajo):* rating del autor inline en Detallada;
    toggle rankeada/sin-orden.
  - *Por señal de usuarios (esperar pedido o workaround manual):* nota por ítem; portada
    elegible por el dueño; duplicar/derivar lista ajena. Batchear los dos primeros (una
    migración).
  - *Por fricción medida (esperar dolor real y repetido):* drag-and-drop para reordenar;
    endpoint de búsqueda de canciones (gateado a que el rodeo álbum→tracklist resulte
    molesto).
- [x] 9.3 Actualizar el índice `docs/05-features/README.md` si corresponde.

## 10. Cierre

- [x] 10.1 `typecheck`, `lint`, `build` en verde; `vitest` de `src/` en verde (1536 tests).
  Las 22 fallas del run completo son de worktrees viejos en `.claude/worktrees/` (ignorados
  por git, no forman parte de este cambio).
- [x] 10.2 Detector de Impeccable sobre los 10 componentes/página nuevos: `[]` (sin hallazgos).
- [x] 10.3 Verificación en navegador: 3 modos (propietario y lectura ajena), conmutador con
  preferencia global persistida al recargar, reorden en Detallada y en la barra del modo
  Gráfico (persiste a BD), alta de álbum y de canción vía tracklist (dedupe "Ya está"),
  carátula representativa de canción, y la página de lectura ajena resolviendo con atribución
  + Guardar.
- [x] 10.4 `openspec validate rework-list-detail --strict`.
