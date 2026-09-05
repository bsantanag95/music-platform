## Context

`listMyDiary(userId, page, pageSize)` (`src/services/diary/diary.ts`) arma el listado con
`selectEntries()` — un `SELECT` con `leftJoin` a `artist`/`release_group`/`recording` (uno
de los tres siempre `NULL` según el `CHECK chk_listen_entry_single_target`) — filtrado por
`eq(listenEntry.userId, userId)`, ordenado por `createdAt DESC, id DESC` y paginado con
`limit(pageSize + 1)` (el `+1` para saber `hasNext` sin un segundo `COUNT`). `listenEntry`
tiene columnas de texto plano para `listenContext`/`reaction`/`audience` (validadas por
`CHECK` en la migración cruda, no por enum de Postgres), y un índice compuesto
`(userId, createdAt)` que ya cubre el `WHERE` + `ORDER BY` actuales.

`GET /api/me/diary` (`src/app/api/me/diary/route.ts`) resuelve `page`/`pageSize` con
`parsePagination(searchParams)` y no lee ningún otro query param hoy.

`DiaryActivityList.tsx` mantiene `entries`/`page`/`hasNext`/`loading`/`loadError` como
`useState` propio, con `handleLoadMore` llamando `getMyDiary(page + 1, 20)` a mano — el
mismo patrón que tenía `DiaryList` antes de `redesign-diary`. `ScrollablePreviewList.tsx`
(Inicio) ya resuelve el caso "refetch por cambio de parámetro + carga incremental" con
`useInfiniteQuery` de TanStack Query, incluyendo `initialData` desde lo resuelto en el
servidor para no repetir la primera página.

Restricciones del proyecto: sin `fetch` directo desde componentes (`src/lib/api/client.ts`
es el único punto de acceso HTTP), TanStack Query reservado para datos post-primer-render
(refetch/debounce/carga progresiva — este caso encaja al pie de la letra), Zod para
validar toda respuesta HTTP, código y comentarios en español, sin `any`, sin dependencias
nuevas, migraciones SQL crudas nunca editadas tras aplicarse.

## Goals / Non-Goals

**Goals:**

- Buscar y filtrar sobre **todo** el diario propio, no solo la página ya cargada en el
  cliente — los filtros viajan al servidor.
- Filtros combinables: búsqueda de texto + contexto + reacción + audiencia a la vez.
- Cambiar cualquier filtro dispara una recarga limpia (vuelve a página 1); "cargar más"
  seguido de eso sigue trayendo resultados coherentes con los filtros vigentes.
- Migrar la paginación de `DiaryActivityList` a `useInfiniteQuery`, alineándolo con el
  patrón ya validado en `ScrollablePreviewList`.

**Non-Goals:**

- Nada de agregados o estadísticas (conteos por contexto, "escuchaste 40 veces este mes")
  — `PRODUCT.md` los excluye explícitamente como anti-feature de gamificación.
- Sin sincronización de filtros con la URL (`searchParams` del router) en este cambio —
  quedan como estado local del componente. Se pierde al recargar la página; aceptado
  como limitación conocida (ver Riesgos).
- Sin cambios a `listUserDiary` (diario público de perfil) ni a `listFeed` — el alcance es
  exclusivamente `/me/diary`.
- Sin índices nuevos en `listen_entry` — el volumen por usuario es de uso personal
  orgánico, no justifica el costo de una migración para este cambio (ver Riesgos).
- Sin búsqueda difusa/tolerante a acentos o typos — coincidencia parcial simple
  (`ILIKE %texto%`), consistente con el resto del catálogo (ver `catalog-search`).

## Decisions

### 1. Filtros como parámetro opcional de `listMyDiary`, no una función nueva

`listMyDiary(userId, page, pageSize, filters?)` donde:

```ts
export interface DiaryFilters {
  q?: string;
  context?: ListenContext;
  reaction?: ListenReaction | "none";
  audience?: DiaryAudience;
}
```

Se arman condiciones `and(...)` adicionales sobre el `where` existente, cada una opcional:

```ts
const conditions = [eq(listenEntry.userId, userId)];
if (filters?.context) conditions.push(eq(listenEntry.listenContext, filters.context));
if (filters?.reaction === "none") conditions.push(isNull(listenEntry.reaction));
else if (filters?.reaction) conditions.push(eq(listenEntry.reaction, filters.reaction));
if (filters?.audience) conditions.push(eq(listenEntry.audience, filters.audience));
if (filters?.q?.trim()) {
  const pattern = `%${filters.q.trim()}%`;
  conditions.push(or(ilike(artist.name, pattern), ilike(releaseGroup.title, pattern), ilike(recording.title, pattern))!);
}
```

**Por qué:** `listMyDiary` ya arma su `where` con `and(...)`; agregar condiciones opcionales
es el cambio más chico posible y no toca `listUserDiary`/`listFeed`, que no reciben
`filters`. **Alternativa considerada:** una función `searchMyDiary` separada — se
descarta porque duplicaría el 90% de `selectEntries()`/paginación/serialización sin
necesidad; los filtros son genuinamente opcionales sobre el mismo listado.

### 2. Búsqueda: `ILIKE` sobre las tres columnas de título ya joineadas, con `OR`

`selectEntries()` ya hace `leftJoin` a `artist`/`release_group`/`recording` — exactamente
una de las tres tiene el título real por fila (las otras dos son `NULL` por el `CHECK` de
un solo objetivo). `ILIKE` de Postgres es case-insensitive nativo; contra `NULL` siempre
da `false` sin lanzar, así que el `OR` de las tres solo puede ser verdadero en la columna
que corresponde al tipo de objetivo de esa fila.

**Alternativa considerada:** `to_tsvector`/`websearch_to_tsquery` (búsqueda de texto
completo de Postgres). Se descarta para este cambio — es más potente (stemming, ranking)
pero pide una columna generada + índice GIN, migración nueva y mantenimiento; el volumen
por usuario no lo justifica todavía. Si el catálogo global ya tiene este patrón en otro
lado (`catalog-search`), evaluar reusarlo es un cambio aparte, no parte de este.

### 3. `reaction=none` como valor explícito de filtro, no la ausencia del parámetro

La ausencia del query param `reaction` significa "no filtrar por reacción" (todas). El
valor literal `"none"` significa "solo las que no tienen reacción" (`IS NULL`) — un
filtro real y útil (siguiendo el propio principio del dominio: "Presencia ≠ Criterio",
`PRODUCT.md` — muchas escuchas legítimamente no tienen reacción). Sin este valor
explícito no habría forma de pedir ese subconjunto.

### 4. Validación de query params: 400 si el valor no pertenece al enum cerrado

`route.ts` valida `context`/`reaction`/`audience` contra `LISTEN_CONTEXTS`/
`[...LISTEN_REACTIONS, "none"]`/`DIARY_AUDIENCES` (`services/diary/types.ts`, ya
exportados) antes de llamar al servicio — mismo criterio que usa `parsePagination` para
`page`/`pageSize`: `VALIDATION_ERROR` con 400 en vez de dejar pasar un valor inválido que
silenciosamente no filtre nada. `q` no se valida más que recortar espacios — cualquier
texto es válido (subcadena vacía = sin filtro).

### 5. Frontend: `DiaryActivityList` migra a `useInfiniteQuery`

Sigue el patrón exacto de `ScrollablePreviewList.tsx`:

- `queryKey: queryKeys.myDiary(filters)` (nueva entrada en `src/lib/query/keys.ts`) —
  incluir los filtros en la key es lo que hace que TanStack Query trate cada combinación
  de filtros como una serie de páginas independiente y descarte/recarga al cambiar
  cualquiera.
- `initialData` desde la primera página ya resuelta en el servidor (`page.tsx` sigue
  llamando `listMyDiary` sin filtros para el render inicial — los filtros parten vacíos).
- `getNextPageParam` igual que hoy: `lastPage.hasNext ? lastPage.page + 1 : undefined`.
- Cambiar cualquier filtro **invalida la query actual** (nueva `queryKey`) en vez de
  llamar a un `handleLoadMore` que ya no existe; TanStack Query re-pide la página 1 con
  los filtros nuevos.
- El estado de edición/borrado (`expandedId`, `pendingDeleteId`, `savedId`) sigue siendo
  `useState` local — no son datos del servidor, son estado de interacción de la UI.
- La actualización optimista tras editar (`onSaved`) pasa de `setEntries` a
  `queryClient.setQueryData` sobre las páginas cacheadas (mismo `queryKey` vigente).

**Alternativa considerada:** mantener `useState` a mano y refetch manual al cambiar un
filtro (si (`useEffect` con filtros como dependencia). Se descarta — es exactamente el
caso que `AGENTS.md` reserva para TanStack Query ("refetch, debounce, carga progresiva"),
reimplementarlo a mano es la deuda técnica que el proyecto ya evitó una vez en
`ScrollablePreviewList`.

### 6. Barra de filtros: buscador + 3 `<select>`, sin sincronizar con la URL

Un input de texto (mismo estilo que los inputs de `ListenEntryForm`: `bg-ink-surface`,
`border-ink-border`, `rounded-md`) con `debounce` de ~300ms antes de disparar la query
(evita una request por tecla), más tres `<select>` (Contexto, Reacción, Audiencia) con
una opción "Todos"/"Todas" por defecto — mismo patrón visual que el `<select>` de
contexto ya existente en `ListenEntryForm`, no un componente nuevo. Sin chips ni
selección múltiple: cada filtro es de un solo valor a la vez, que es todo lo que pide el
alcance.

**Por qué no sincronizar con la URL:** agrega superficie (parseo de `searchParams`,
reconciliación con el estado de TanStack Query, back/forward del navegador) para un
beneficio menor en una página estrictamente privada (nadie comparte un link a "mi
diario filtrado por Público + 'radiohead'"). Queda como mejora incremental si se pide
después.

## Risks / Trade-offs

- **[`ILIKE` sin índice de texto escala mal con diarios muy grandes]** → Aceptado para
  v1: el volumen es de uso personal orgánico (no se pre-carga catálogo, `PRODUCT.md`).
  Si se vuelve un problema real, es una migración de índice GIN aparte, no bloquea este
  cambio.
- **[Los filtros se pierden al recargar la página (sin URL sync)]** → Limitación conocida
  y aceptada explícitamente (Non-Goals) — el estado de interacción normal de esta página
  ya se pierde al recargar (ej. qué entrada estaba expandida), no es una regresión nueva.
- **[Migrar a `useInfiniteQuery` toca el mecanismo de edición optimista existente]** →
  Riesgo de regresión en `onSaved`/`handleDelete`; mitigado con los tests de
  `DiaryActivityList.test.tsx` ya existentes (edición, borrado, destello de guardado) que
  deben seguir pasando tal cual tras la migración — son la red de seguridad.
- **[`reaction=none` es fácil de confundir con "sin filtro"]** → Mitigado con el nombre
  explícito (no vacío/omitido) y un test dedicado que lo distingue de la ausencia del
  parámetro.

## Migration Plan

Cambio de frontend + servicio de lectura + query params aditivos. Sin migración de DB
(columnas y `CHECK`s existentes cubren todos los valores filtrables). `GET /api/me/diary`
sigue funcionando idéntico sin los params nuevos — deploy directo, sin feature flag.
Rollback = revertir el commit; no hay estado persistido nuevo.

## Open Questions

- Copy exacto de los labels/placeholder de la barra de filtros (ES/EN) — se resuelve al
  implementar `tasks.md`, seguramente reusando `context.*`/`reaction.*`/`audience.*` ya
  existentes para las opciones de cada `<select>` y agregando solo el placeholder del
  buscador y la opción "Todos".
- Duración exacta del debounce del buscador (300ms propuesto) — ajustar en
  `/impeccable polish` si se siente lento o demasiado sensible al probarlo.
