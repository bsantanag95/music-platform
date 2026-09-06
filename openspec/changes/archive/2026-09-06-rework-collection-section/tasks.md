## 1. Contrato Zod y capa de acceso

- [x] 1.1 En `src/lib/api/schemas.ts`: agregar `q` y `sort` (`recent`|`alpha`|`artist`|`format`) opcionales al request de listado de colección; `counts: { vinyl, cd, cassette, other }` a `CollectionListResponse` (propia y de perfil); schema nuevo `CollectionBulkAudienceSchema` = `{ ids: string[] (1..50, uuid), audience: DiaryAudience }`.
- [x] 1.2 En `src/lib/api/collection.ts`: `getMyCollection` / `getUserCollection` aceptan `q` y `sort`; nuevo `updateEntriesAudienceBulk(ids, audience)` que hace `PATCH /api/me/collection`; validar respuestas con los schemas de 1.1.
- [x] 1.3 En `src/lib/query/keys.ts`: `queryKeys.myCollection(filters)` con las nuevas dimensiones (`q`, `format`, `attribute`, `sort`, `group`).
- [x] 1.4 Tests de los schemas nuevos (parseo de `counts`, unión/forma del `PATCH` en lote, rechazo de `ids` vacío o >50).

## 2. Servicio de dominio

- [x] 2.1 `listOwnCollection`: aceptar `q` (ilike sobre `coalesce(release_group.title)` y sobre el nombre del artista acreditado) y `sort`; `ORDER BY` por `(clave de grupo, sort, id desc)` según decisión 3 del design; sin romper los filtros `format`/`attribute` ni la paginación por offset.
- [x] 2.2 `listOwnCollection`: calcular `counts` por formato con un agregado `GROUP BY format` sobre el conjunto tras aplicar `q` y `attribute` pero ignorando `format`; devolver los cuatro formatos (0 si no hay).
- [x] 2.3 Replicar `q` / `sort` / `counts` en `listProfileCollection` (mismo criterio de visibilidad, sin cambios de reglas).
- [x] 2.4 `updateEntriesAudienceBulk(userId, ids, audience)`: `update collection_entry set audience where id = any(:ids) and user_id = :user returning id`; `404 COLLECTION_ENTRY_NOT_FOUND` si `returning` viene vacío; ids ajenos/inexistentes se ignoran.
- [x] 2.5 Tests de servicio: `q` por título y por artista, cada `sort`, orden por clave de grupo (`format` y `artist`), `counts` (respeta `q`/`attribute`, ignora `format`), lote idempotente, lote con ids ajenos, lote sin ninguna entrada propia.

## 3. Rutas API

- [x] 3.1 `GET /api/me/collection`: leer `q` y `sort` de la query, pasar al servicio, incluir `counts` en la respuesta. Aditivo.
- [x] 3.2 `GET /api/users/[username]/collection`: idem (`q`, `sort`, `counts`).
- [x] 3.3 Nueva ruta `PATCH /api/me/collection` (`route.ts` a nivel colección): parsea `CollectionBulkAudienceSchema`, llama `updateEntriesAudienceBulk`, envuelta en `with-error-handling`, `401` sin sesión.
- [x] 3.4 Tests de ruta: params y campo `counts` nuevos (con retrocompatibilidad sin params), `PATCH` en lote feliz / `404` / `400` fuera de rango / `401`.
- [x] 3.5 Actualizar `docs/04-api/contracts.md`: `q`/`sort`/`counts` en los dos `GET`, nueva entrada `PATCH /api/me/collection`, nota sobre el alcance de `q` (título + artista) y de `counts` (ignora `format`).

## 4. Modo de visualización (mecánica compartida)

- [x] 4.1 `src/components/collection/collection-view-mode.ts` (no cliente): tipo `CollectionViewMode`, lista, default `"shelf"`, clave `localStorage` `"music-platform:collection-view-mode"`, `parseCollectionViewMode()`.
- [x] 4.2 `src/components/collection/use-collection-view-mode.ts` ("use client"): estado con default en SSR, lectura de `localStorage` en `useEffect`, `update` que persiste con try/catch. Devuelve `readonly [mode, update]`.
- [x] 4.3 `src/components/collection/CollectionModeSwitcher.tsx` ("use client"): `role="radiogroup"` + 3 `role="radio"`, `tabIndex` rotativo, flechas, iconos SVG `aria-hidden`, etiqueta `sr-only sm:not-sr-only`, activo `bg-amber/10 text-amber`.
- [x] 4.4 Tests: `parseCollectionViewMode` (válido / inválido / vacío), hook con doble de `localStorage` en memoria (default, lee guardado, persiste, valor corrupto → default), `CollectionModeSwitcher` (roles, `aria-checked`, navegación por flechas, callback).

## 5. Formulario de entrada compartido

- [x] 5.1 `src/components/collection/CollectionEntryForm.tsx`: componente controlado con `{ format, attributes, note }` + `onChange` (y `audience` opcional), extraído del JSX de controles de `CollectionAlbumAction` (selector de formato, toggles de atributos, input de nota ≤140).
- [x] 5.2 `CollectionAlbumAction` pasa a consumir `CollectionEntryForm` para el alta, sin cambiar su contrato ni su comportamiento; su test existente queda verde.
- [x] 5.3 Tests de `CollectionEntryForm` (cambios de formato/atributos/nota emiten `onChange`, límite de nota, toggles de atributo).

## 6. Estantería: componentes de presentación

- [x] 6.1 `src/components/collection/collection-shared.tsx` (o extender el existente): helpers de href (`/album/{id}`, `/artist/{id}`), formato de fecha, agrupación cliente por `format` y por `artist`.
- [x] 6.2 `ShelfGrid.tsx` ("use client"): cuadrícula responsiva de fichas con `CoverThumb` / `DiscPlaceholder`, pie con título + artista + chip de formato; casilla en modo selección; panel de edición expandible bajo la ficha.
- [x] 6.3 `EntriesDetailed.tsx` ("use client"): fila con carátula `size-16`, título + artista, chips de formato y atributos, nota, audiencia + fecha, controles (editar, selector rápido de audiencia, quitar).
- [x] 6.4 `EntriesIndex.tsx` ("use client"): fila compacta `NN · Álbum — artista · formato`, `border-b`, controles en `sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100`.
- [x] 6.5 `CollectionEntryRow` / panel de edición: reusa `CollectionEntryForm`; "Guardar" y "Cancelar"; estados busy/error locales.
- [x] 6.6 Tests de cada renderer (con y sin carátula, con y sin acciones, modo lectura sin controles).

## 7. Toolbar y contenedor `CollectionShelf`

- [x] 7.1 `CollectionToolbar.tsx` ("use client"): buscador con debounce (300 ms), `FilterSelect` de formato, atributo, orden y agrupación, botón "Limpiar filtros" cuando hay filtros activos. Tipos `CollectionFiltersState` + helper `collectionFiltersActive`.
- [x] 7.2 `CollectionShelf.tsx` ("use client"): `useInfiniteQuery` + `initialData` sembrada; encabezado con `counts` por formato como dato; monta toolbar (oculta en `readOnly`), `CollectionModeSwitcher` (visible también en lectura), el renderer según el modo, "cargar más", estados de error.
- [x] 7.3 Agrupación: cuando `group !== "none"`, seccionar con título + conteo por grupo (de `counts` para `format`, contado sobre lo cargado para `artist`).
- [x] 7.4 Edición en línea: mutación optimista sobre `queryKeys.myCollection(...)` con `onMutate` / `onError` (rollback) / `onSettled` (invalida), para el panel de edición y para el selector rápido de audiencia. Mismo patrón que `SaveListButton` / favoritos.
- [x] 7.5 Quitar entrada: optimista, tolera `COLLECTION_ENTRY_NOT_FOUND` como éxito; ajusta `counts` local.
- [x] 7.6 Estados vacíos: colección vacía (con CTA a `/search`) vs. filtrado-vacío (con "limpiar filtros"), distintos y localizados.

## 8. Selección en lote

- [x] 8.1 Modo "Seleccionar" como estado local (`selectionMode`, `selectedIds: Set`); casillas en fichas/filas; salida con "Listo" y con `Escape`.
- [x] 8.2 Barra de acción fija (sticky bottom en mobile, `max-w-md`, borde amber): "N seleccionados" con `aria-live`, opciones de audiencia, "Listo". Llama `updateEntriesAudienceBulk` con actualización optimista y rollback; la selección se limpia al aplicar o al cambiar de filtro.
- [x] 8.3 Tests: entrar/salir de selección, seleccionar N, aplicar audiencia en lote (optimista + rollback ante error), `Escape` cierra.

## 9. Documentación de alcance (hacer al llegar aquí, en orden normal)

- [x] 9.1 `docs/05-features/physical-collection.md`: mover el plan a "implementado en `rework-collection-section`"; actualizar "## Superficies" (`/me/collection` con 3 modos, toolbar de orden/agrupación/búsqueda, edición en línea, cambio de audiencia en lote; perfil hereda la estantería de lectura).
- [x] 9.2 En la sección "## Fuera de alcance" de ese doc: registrar los anti-objetivos de este cambio con criterios de cuándo abordarlos — descubrimiento social de colecciones, contador "N personas tienen este disco", colección en el feed, buscador de catálogo embebido / alta desde `/me/collection`, wishlist, imagen de portada por entrada, `group=artist` con conteo exacto por sección.
- [x] 9.3 `docs/05-features/README.md`: actualizar la fila de colección física (3 modos + toolbar + edición en línea + audiencia en lote + vista de lectura ajena en `rework-collection-section`).

## 10. Cableado de páginas

- [x] 10.1 `src/app/[locale]/me/collection/page.tsx`: sembrar filtros desde `searchParams` (`q`, `format`, `attribute`, `sort`, `group`), resolver primera página con `listOwnCollection`, renderizar `CollectionShelf`.
- [x] 10.2 `src/app/[locale]/users/[username]/page.tsx`: `ProfileCollection` deja de usar `CollectionList` y usa `CollectionShelf` con `readOnly` (sin toolbar, sin edición, sin selección; conmutador de modos visible).
- [x] 10.3 Retirar `CollectionList` (o reducirlo) y actualizar/portar sus tests a `CollectionShelf`.

## 11. i18n

- [x] 11.1 `messages/es/collection.json` y `messages/en/collection.json`: claves nuevas — encabezado con conteos por formato, etiquetas de los 3 modos + `viewModeLabel`, orden (`sort.*`), agrupación (`group.*`), buscador, estado filtrado-vacío, edición en línea (editar/guardar/cancelar), modo selección + barra de acción en lote, títulos de sección por formato/artista.
- [x] 11.2 Verificar que ninguna clave usada quede sin traducir en ambos locales (test de paridad si existe).

## 12. Verificación final

- [x] 12.1 `npm run typecheck`, `npm run lint`, `npm run test` (alcance colección) y `npm run build` en verde.
- [x] 12.2 Verificación en navegador (preview `music-platform-dev`): `/me/collection` en los 3 modos, buscar, ordenar, agrupar, editar una entrada, cambiar audiencia en lote, estado vacío y filtrado-vacío; `/users/[username]` con colección ajena en modo lectura. Capturas desktop + mobile.
- [x] 12.3 Correr el detector mecánico de Impeccable sobre los componentes nuevos: `node C:\Users\besan\.claude\skills\impeccable\scripts/detect.mjs --json src/components/collection`.
- [x] 12.4 Revisar con `openspec validate rework-collection-section --strict` y actualizar `docs/04-api/contracts.md` si algún contrato cambió respecto de lo planificado.
