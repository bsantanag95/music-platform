## 1. Servicio (`src/services/diary/diary.ts`)

- [x] 1.1 Definir `DiaryFilters` (`{ q?: string; context?: ListenContext; reaction?:
  ListenReaction | "none"; audience?: DiaryAudience }`) y exportarlo.
- [x] 1.2 `listMyDiary(userId, page, pageSize, filters?)`: agregar condiciones
  opcionales al `and(...)` existente — `eq` para contexto/audiencia, `isNull` cuando
  `reaction === "none"` o `eq` en otro caso, `or(ilike(...), ilike(...), ilike(...))`
  sobre `artist.name`/`release_group.title`/`recording.title` cuando `q` no está vacío
  (recortar espacios antes de armar el patrón `%texto%`).
- [x] 1.3 `listUserDiary` y `listFeed` quedan sin cambios — no reciben `filters`.
- [x] 1.4 Tests en `diary.test.ts`: cada filtro por separado, combinación de varios,
  `reaction: "none"` vs. sin filtro vs. `reaction: "neutral"` (tres casos distintos),
  búsqueda que solo coincide con una entrada fuera de la primera página. Verificados con
  `PgDialect().sqlToQuery()` sobre la condición real capturada (sin pegarle a Postgres).

## 2. API (`src/app/api/me/diary/route.ts`)

- [x] 2.1 Parsear `q`, `context`, `reaction`, `audience` de `searchParams`. Validar
  `context` contra `LISTEN_CONTEXTS`, `reaction` contra `[...LISTEN_REACTIONS, "none"]`,
  `audience` contra `DIARY_AUDIENCES` — `VALIDATION_ERROR` (400) si el valor no
  pertenece al vocabulario cerrado. `q` no se valida más que recortar espacios.
- [x] 2.2 Pasar el objeto de filtros resultante a `listMyDiary`.
- [x] 2.3 Tests en `route.test.ts`: cada query param inválido devuelve 400 con el
  código correcto; combinación válida de varios params; sin params, comportamiento
  idéntico al actual (retrocompatibilidad — mismo listado, ahora con filtros vacíos).
- [x] 2.4 `docs/04-api/contracts.md` actualizado con los 4 params opcionales nuevos de
  `GET /api/me/diary`.

## 3. Cliente HTTP (`src/lib/api/diary.ts`)

- [x] 3.1 `getMyDiary(page, pageSize, filters?)`: construir el query string incluyendo
  `q`/`context`/`reaction`/`audience` solo cuando están presentes (`URLSearchParams`,
  no concatenación manual de strings).
- [x] 3.2 Sin cambios en `getUserDiary`/`getFeed`.

## 4. `useInfiniteQuery` en `DiaryActivityList`

- [x] 4.1 `src/lib/query/keys.ts`: agregar `myDiary: (filters: DiaryFiltersParams) =>
  ["diary", "mine", filters] as const` — la key completa incluye los filtros vigentes.
- [x] 4.2 `DiaryActivityList` reemplaza `entries`/`page`/`hasNext`/`handleLoadMore` por
  `useInfiniteQuery` (mismo patrón que `ScrollablePreviewList.tsx`): `initialData` con
  la primera página recibida por prop (solo sin filtros activos), `getNextPageParam`
  igual al actual, `placeholderData: keepPreviousData` para no vaciar la lista mientras
  llega el resultado de un filtro nuevo. `expandedId`/`pendingDeleteId`/`savedId`/
  `deletingId` (de acciones, no de carga) siguen siendo `useState` local. Se quitó el
  prop `loadMore` (nunca se usaba fuera de un test — no encaja con un `queryFn` fijo).
- [x] 4.3 Cambiar cualquier filtro actualiza el estado de filtros (local) → nueva
  `queryKey` → TanStack Query recarga desde la página 1 automáticamente.
- [x] 4.4 `onSaved`/`handleDelete` pasan de `setEntries` a `queryClient.setQueryData`
  sobre las páginas cacheadas del `queryKey` vigente, preservando el destello de
  guardado y el cierre automático del formulario ya implementados.
- [x] 4.5 Tests existentes de edición/borrado/destello en `DiaryActivityList.test.tsx`
  siguen pasando (ajustados solo para envolver el render en `QueryClientProvider` y
  para el 3er argumento de filtros que ahora siempre lleva `getMyDiary`).

## 5. Barra de filtros (UI)

- [x] 5.1 Input de búsqueda (mismo estilo de campo que `ListenEntryForm`:
  `bg-ink-surface border-ink-border rounded-md`), con debounce (~300ms) antes de
  actualizar el filtro `q`.
- [x] 5.2 Tres `<select>` (Contexto, Reacción, Audiencia) con opción "Todos"/"Todas" por
  defecto, mismo estilo que el `<select>` de contexto en `ListenEntryForm`. Reusa las
  claves `context.*`/`reaction.*`/`audience.*` ya existentes para las opciones.
- [x] 5.3 Estado vacío distinto: "sin escuchas" (diario realmente vacío, copy actual)
  vs. "sin resultados para estos filtros" (hay entradas pero ninguna coincide) — claves
  nuevas en `diary.json`.
- [x] 5.4 Enlace de texto "Limpiar filtros" cuando hay al menos uno activo.

## 6. i18n

- [x] 6.1 `messages/{es,en}/diary.json`: placeholder del buscador, labels de los tres
  `<select>` (reusan `contextLabel`/`reactionLabel`/`audienceLabel` como `aria-label`),
  opciones "Todos los contextos"/"Todas las reacciones"/"Todas las audiencias", copy del
  estado vacío "sin resultados" y de "limpiar filtros". Paridad de claves ES/EN.

## 7. Tests de componente

- [x] 7.1 `DiaryActivityList.test.tsx`: escribir en el buscador filtra tras el debounce
  (con `waitFor` y timers reales); cambiar cada `<select>` dispara una nueva query con
  el filtro correspondiente; combinar reacción + audiencia a la vez; estado vacío "sin
  resultados" distinto del vacío real; limpiar filtros vuelve a traer todo. Todas las
  aserciones que buscaban texto de fila por `screen` global se acotaron a `within(list)`
  porque la barra de filtros ahora repite ese mismo texto en sus `<option>`.

## 8. Verificación y cierre

- [x] 8.1 Revisión visual en `/me/diary` contra el servidor real: buscar texto (positivo
  y sin resultados), filtrar por contexto, limpiar filtros — todo verificado
  funcionando end-to-end. "Cargar más" ya cubierto por los tests (comparte el mismo
  `queryFn`/`fetchNextPage` que la carga inicial, con los mismos filtros vigentes).
- [x] 8.2 `tsc --noEmit`, `eslint`, `vitest` (668 tests), `next build` en verde.
- [x] 8.3 `docs/05-features/listening-diary-and-ratings.md` no documenta la UI de listado
  del diario propio (es un doc de modelo de datos/rationale) — no requiere cambios.
- [x] 8.4 `openspec validate add-diary-filters --strict` → válido.
