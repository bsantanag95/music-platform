## 1. Servicio (`src/services/diary/diary.ts`)

- [ ] 1.1 Definir `DiaryFilters` (`{ q?: string; context?: ListenContext; reaction?:
  ListenReaction | "none"; audience?: DiaryAudience }`) y exportarlo.
- [ ] 1.2 `listMyDiary(userId, page, pageSize, filters?)`: agregar condiciones
  opcionales al `and(...)` existente — `eq` para contexto/audiencia, `isNull` cuando
  `reaction === "none"` o `eq` en otro caso, `or(ilike(...), ilike(...), ilike(...))`
  sobre `artist.name`/`release_group.title`/`recording.title` cuando `q` no está vacío
  (recortar espacios antes de armar el patrón `%texto%`).
- [ ] 1.3 `listUserDiary` y `listFeed` quedan sin cambios — no reciben `filters`.
- [ ] 1.4 Tests en `diary.test.ts`: cada filtro por separado, combinación de varios,
  `reaction: "none"` vs. sin filtro vs. `reaction: "neutral"` (tres casos distintos),
  búsqueda que solo coincide con una entrada fuera de la primera página.

## 2. API (`src/app/api/me/diary/route.ts`)

- [ ] 2.1 Parsear `q`, `context`, `reaction`, `audience` de `searchParams`. Validar
  `context` contra `LISTEN_CONTEXTS`, `reaction` contra `[...LISTEN_REACTIONS, "none"]`,
  `audience` contra `DIARY_AUDIENCES` — `VALIDATION_ERROR` (400) si el valor no
  pertenece al vocabulario cerrado. `q` no se valida más que recortar espacios.
- [ ] 2.2 Pasar el objeto de filtros resultante a `listMyDiary`.
- [ ] 2.3 Tests en `route.test.ts`: cada query param inválido devuelve 400 con el
  código correcto; combinación válida de varios params; sin params, comportamiento
  idéntico al actual (retrocompatibilidad).
- [ ] 2.4 Si existe contrato documentado en `docs/04-api/`, agregar los 4 params
  opcionales nuevos de `GET /api/me/diary`.

## 3. Cliente HTTP (`src/lib/api/diary.ts`)

- [ ] 3.1 `getMyDiary(page, pageSize, filters?)`: construir el query string incluyendo
  `q`/`context`/`reaction`/`audience` solo cuando están presentes (`URLSearchParams`,
  no concatenación manual de strings).
- [ ] 3.2 Sin cambios en `getUserDiary`/`getFeed`.

## 4. `useInfiniteQuery` en `DiaryActivityList`

- [ ] 4.1 `src/lib/query/keys.ts`: agregar `myDiary: (filters: DiaryFiltersState) =>
  ["diary", "mine", filters] as const` (o similar) — la key completa incluye los
  filtros vigentes.
- [ ] 4.2 `DiaryActivityList` reemplaza `entries`/`page`/`hasNext`/`handleLoadMore` por
  `useInfiniteQuery` (mismo patrón que `ScrollablePreviewList.tsx`): `initialData` con
  la primera página recibida por prop, `getNextPageParam` igual al actual.
  `expandedId`/`pendingDeleteId`/`savedId`/`loading` (de acciones, no de carga) siguen
  siendo `useState` local.
- [ ] 4.3 Cambiar cualquier filtro actualiza el estado de filtros (local) → nueva
  `queryKey` → TanStack Query recarga desde la página 1 automáticamente.
- [ ] 4.4 `onSaved`/`handleDelete` pasan de `setEntries` a `queryClient.setQueryData`
  sobre las páginas cacheadas del `queryKey` vigente, preservando el destello de
  guardado y el cierre automático del formulario ya implementados.
- [ ] 4.5 Confirmar que los tests existentes de edición/borrado/destello en
  `DiaryActivityList.test.tsx` siguen pasando sin cambiar sus aserciones (son la red de
  seguridad de esta migración).

## 5. Barra de filtros (UI)

- [ ] 5.1 Input de búsqueda (mismo estilo de campo que `ListenEntryForm`:
  `bg-ink-surface border-ink-border rounded-md`), con debounce (~300ms) antes de
  actualizar el filtro `q`.
- [ ] 5.2 Tres `<select>` (Contexto, Reacción, Audiencia) con opción "Todos"/"Todas" por
  defecto, mismo estilo que el `<select>` de contexto en `ListenEntryForm`. Reusar las
  claves `context.*`/`reaction.*`/`audience.*` ya existentes para las opciones.
- [ ] 5.3 Estado vacío distinto: "sin escuchas" (diario realmente vacío, copy actual)
  vs. "sin resultados para estos filtros" (hay entradas pero ninguna coincide) — clave
  nueva en `diary.json`.
- [ ] 5.4 Botón/enlace para limpiar todos los filtros a la vez cuando hay al menos uno
  activo.

## 6. i18n

- [ ] 6.1 `messages/{es,en}/diary.json`: placeholder del buscador, labels de los tres
  `<select>`, opción "Todos"/"Todas", copy del estado vacío "sin resultados", copy de
  "limpiar filtros". Paridad de claves ES/EN.

## 7. Tests de componente

- [ ] 7.1 `DiaryActivityList.test.tsx`: escribir en el buscador filtra tras el debounce
  (usar `vi.useFakeTimers` o `waitFor` con el mock de `getMyDiary` recibiendo el `q`
  esperado); cambiar cada `<select>` dispara una nueva query con el filtro
  correspondiente; combinar dos filtros a la vez; estado vacío "sin resultados" distinto
  del vacío real; limpiar filtros vuelve a traer todo.

## 8. Verificación y cierre

- [ ] 8.1 Revisión visual del usuario en `/me/diary`: buscar, filtrar por cada campo,
  combinar filtros, limpiar filtros, estado vacío por filtro sin resultados, que
  "cargar más" (scroll/botón) siga trayendo resultados coherentes con los filtros
  vigentes.
- [ ] 8.2 `tsc --noEmit`, `eslint`, `vitest`, `next build` en verde.
- [ ] 8.3 `docs/05-features/listening-diary-and-ratings.md` actualizada si documenta el
  listado del diario propio.
- [ ] 8.4 `openspec validate add-diary-filters --strict` → válido.
