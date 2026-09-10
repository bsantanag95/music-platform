## 1. Servicios de descubrimiento

- [x] 1.1 Generalizar `listDiscoverLists` en `src/services/lists/discovery.ts` para aceptar `readerId: string | null`: con `null`, omitir la exclusión de listas propias y devolver `saved`/`following` en `false`.
- [x] 1.2 Nuevo helper `saveCountsFor(listIds: string[]): Promise<Map<string, number>>` (`GROUP BY list_id` sobre `list_save`, apoyado en `idx_list_save_list`). Ubicarlo en `saved-lists.ts` o en un nuevo `community.ts`.
- [x] 1.3 Nuevo `listFeaturedLists()` — listas con fila en `user_list_featured`, orden `rank ASC`, sin filtrar por tipo de entidad, enriquecidas con `enrichLists` y `saveCountsFor`.
- [x] 1.4 Nuevo `listPopularLists(readerId: string | null, page, pageSize)` — audiencia `public` + perfil `public`, `save_count >= 1`, orden `save_count DESC, createdAt DESC`, excluye bloqueos y (con sesión) listas propias.
- [x] 1.5 Nuevo `listsFromFollowing(readerId: string, page, pageSize)` — dueños en `listFollowing(readerId)`, `audience IN ('followers','public')`, orden `createdAt DESC`, excluye bloqueos, perfiles no visibles y listas propias.
- [x] 1.6 Tests de servicio para 1.1–1.5 (matriz de visibilidad, bloqueos, umbral de guardados, lector anónimo).

## 2. API

- [x] 2.1 `GET /api/lists/discover` pasa a ser público: resuelve sesión opcional, llama `listDiscoverLists` con `readerId` nullable. Actualizar su test (deja de responder 401 sin sesión).
- [x] 2.2 Nuevo `GET /api/lists/popular` (público, paginado, validación Zod de `page`/`pageSize`).
- [x] 2.3 Nuevo `GET /api/lists/from-following` (requiere sesión: `401 AUTH_REQUIRED` sin ella; paginado).
- [x] 2.4 Tests de ruta para 2.1–2.3.
- [x] 2.5 Documentar los tres endpoints en `docs/04-api/contracts.md`.

## 3. Conteo de guardados en la UI

- [x] 3.1 Añadir `saveCount` (opcional) al modelo de tarjeta de lista y renderizarlo en `ListCard` / `ListCoverMosaic` cuando esté presente.
- [x] 3.2 Mostrar el conteo de guardados en `ListDetailHeader` para listas de audiencia `public` (detalle propio y ajeno); nunca para `followers`/`private` salvo al dueño.
- [x] 3.3 Claves i18n del conteo en `messages/{es,en}/lists.json` (`{count, plural, ...}`).

## 4. Superficie `/[locale]/lists`

- [x] 4.1 Nueva ruta `src/app/[locale]/lists/page.tsx` — Server Component con `resolveSession()`; compone Destacadas → Populares → De usuarios seguidos (solo con sesión) → Recientes; omite las secciones vacías; estado vacío global si no hay ninguna.
- [x] 4.2 Componente de sección reutilizable (encabezado + grilla/`ListsList` + "cargar más" donde aplique). Paginación cliente con TanStack Query para Populares, De seguidos y Recientes (patrón de `DiscoverListsTab`).
- [x] 4.3 Claves i18n en `messages/{es,en}/lists.json`: título de la superficie y de cada sección, textos de estado vacío.
- [x] 4.4 `generateMetadata` con título localizado.
- [x] 4.5 Tests de la página: composición por sesión, omisión de secciones vacías, sección "De seguidos" ausente para anon, estado vacío global.

## 5. Header

- [x] 5.1 Añadir el enlace "Listas" → `/lists` en la barra general `md+` de `src/components/layout/Header.tsx` (orden: Buscador · Explorar · Listas), con `common.lists` como etiqueta, visible con y sin sesión.
- [x] 5.2 Añadir el mismo enlace al bloque de barra general del panel móvil.
- [x] 5.3 Actualizar `Header.test.tsx`: el enlace "Listas" aparece con y sin sesión y apunta a `/lists`, no a `/me/lists`.

## 6. Documentación y specs

- [x] 6.1 Actualizar `docs/05-features/lists-and-favorites.md`: nueva superficie `/lists` y sus secciones; revisar la sección de privacidad del conteo de guardados (pasa a público el agregado, privados los individuales).
- [x] 6.2 Actualizar la nota **D7** en `openspec/changes/redefine-content-hierarchy/design.md` para registrar la ruta propia `/lists` como divergencia deliberada.
- [x] 6.3 Confirmar que `docs/05-features/README.md` y su tabla de features indexan la nueva superficie.

## 7. Verificación

- [x] 7.1 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` en verde.
- [x] 7.2 Verificación visual en navegador: `/lists` con sesión y en incógnito (secciones, "De seguidos" ausente para anon, conteo de guardados en tarjetas), enlace del Header en desktop y móvil.
- [x] 7.3 `openspec validate add-community-lists-surface --type change --strict` en verde.
