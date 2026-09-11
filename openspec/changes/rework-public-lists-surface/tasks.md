## 1. Servicios

- [x] 1.1 Extender `listDiscoverLists` en `src/services/lists/discovery.ts` con filtros opcionales `q` (título y descripción), `entityType` y `sort` (`recent` por defecto; `popular` por conteo agregado de guardados desc, luego creación desc), conservando el `where` de visibilidad actual (audiencia `public`, perfil `public`, sin bloqueos, sin listas propias con sesión, `official_withdrawn_at IS NULL`).
- [x] 1.2 En `sort=popular`, incluir las listas sin guardados al final (LEFT JOIN / conteo) y poblar `saveCount` en las entradas; sin `sort`, mantener el orden y la respuesta exactos de hoy.
- [x] 1.3 Rechazar `entityType`/`sort` inválidos con `ApiError("VALIDATION_ERROR", 400, ...)`.
- [x] 1.4 Actualizar `listFeaturedLists` en `src/services/lists/community.ts` para devolver primero las listas editoriales oficiales publicadas y luego las de `user_list_featured` por `rank`, deduplicando por `id`.
- [x] 1.5 Tests de servicio en `src/services/lists/discovery.test.ts` y `src/services/lists/community.test.ts`.

## 2. API

- [x] 2.1 En `src/app/api/lists/discover/route.ts`, parsear y validar `q`, `entityType` y `sort` y pasarlos a `listDiscoverLists`; sin parámetros, el contrato y la respuesta no cambian.
- [x] 2.2 Reusar los helpers de validación de enums ya existentes (`LIST_ENTITY_TYPES`, `PUBLIC_LIST_SORTS` de `src/services/lists/types.ts`).
- [x] 2.3 Tests de ruta en `src/app/api/lists/discover/route.test.ts`: params válidos, inválidos → `400 VALIDATION_ERROR`, sin params = contrato actual, paginación.
- [x] 2.4 Extender `getDiscoverLists` en `src/lib/api/lists.ts` para aceptar filtros (`q`, `entityType`, `sort`) sin romper las llamadas existentes.

## 3. Frontend

- [x] 3.1 Crear `src/components/lists/CommunityListsToolbar.tsx` (cliente): búsqueda con debounce de 300 ms, select de tipo de entidad, select de orden (Populares / Recientes) y acción "Limpiar filtros"; escribe la URL con `router.replace(..., { scroll: false })` dentro de `startTransition` y lee el estado con `useSearchParams`.
- [x] 3.2 Crear `src/components/lists/CommunityExploreGrid.tsx` (cliente): grilla paginada con `useInfiniteQuery` y `queryKey` que incluye los filtros, `initialData` provisto por el servidor, conteo de resultados en `role="status"`, estado "sin resultados" localizado, error de carga y botón "Cargar más".
- [x] 3.3 Actualizar `src/app/[locale]/lists/page.tsx`: parsear `searchParams`, determinar vitrina vs explorar, hacer SSR de la primera página filtrada y renderizar toolbar + (grilla o secciones según el modo); envolver el uso de `useSearchParams` en `Suspense`.
- [x] 3.4 Ajustar lo mínimo necesario en `CommunityListSection`/`CommunityListCard`/`lists-shared` para la reutilización, sin alterar el comportamiento de las secciones existentes (no hizo falta tocarlos: `CommunityListCard` se reutilizó tal cual).
- [x] 3.5 Tests: `CommunityListsToolbar.test.tsx` (debounce, actualización de URL, limpiar), `CommunityExploreGrid.test.tsx` (filtros, paginación, vacío, error) y actualización de `src/app/[locale]/lists/page.test.tsx` para cubrir vitrina y explorar (incluido el caso sin sesión).

## 4. i18n

- [x] 4.1 Agregar las claves nuevas bajo `lists.community.*` en `messages/es/lists.json` y `messages/en/lists.json` (búsqueda, filtro por tipo, "todos los tipos", orden y sus opciones, "limpiar filtros", conteo de resultados, "sin resultados" y su descripción), sin duplicar claves ya existentes (`searchPlaceholder`, `sortLabel`, etc.).

## 5. Documentación

- [x] 5.1 Actualizar `docs/04-api/contracts.md`: parámetros opcionales de `GET /api/lists/discover` y la diferencia entre `sort=popular` (incluye 0 guardados al final) y la sección "Populares" (solo ≥1 guardado).
- [x] 5.2 Actualizar `docs/05-features/lists-and-favorites.md`: estados vitrina/explorar, toolbar, y "Destacadas" con las listas editoriales oficiales.

## 6. Verificación

- [x] 6.1 Ejecutar `pnpm run typecheck`.
- [x] 6.2 Ejecutar `pnpm run lint`.
- [x] 6.3 Ejecutar `pnpm run test` (206 archivos / 1359 tests).
- [x] 6.4 Ejecutar `pnpm run build`.
- [ ] 6.5 Verificar manualmente: vitrina, filtro por texto y tipo, orden Populares/Recientes, estado sin resultados, limpiar filtros, con y sin sesión, y que una lista editorial oficial publicada aparezca en Destacadas.
