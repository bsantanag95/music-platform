# add-diary-social-surfaces — Tasks

## 1. Servicio de visibilidad y lecturas sociales

- [x] 1.1 Crear `src/services/diary/visibility.ts` con `audiencesForProfile(profile)` (función pura
      que devuelve `DiaryAudience[]` según la matriz D1).
- [x] 1.2 Crear `listUserDiary(username, viewerId, page, pageSize)` en `src/services/diary/diary.ts`
      (404 `USER_NOT_FOUND`, lista vacía sin permiso, paginación `limit+1`, reutiliza
      `selectEntries`/`serializeEntry`).
- [x] 1.3 Crear `listFeed(viewerId, page, pageSize)` en `src/services/diary/diary.ts` (seguidos
      aceptados + `audience IN (followers, public)` + `NOT EXISTS` defensivo sobre `user_block`,
      con autor en la respuesta).
- [x] 1.4 Unit tests de `audiencesForProfile` cubriendo toda la matriz (bloqueado mutuo, dueño, privado
      con relación `incoming`, seguidor aprobado, público anónimo).
- [x] 1.5 Unit tests de `listUserDiary` y `listFeed` (permiso → lista; sin permiso → vacía sin
      consultar; 404; paginación; exclusión de `private`).
- [x] 1.6 Test de regresión en la capa de bloqueo social (`src/services/social/`) que verifique que bloquear
      revoca cualquier relación `accepted` / `requested` preexistentes en ambas direcciones — contrato del que depende D3.

## 2. API y schemas

- [x] 2.1 Agregar en `src/lib/api/schemas.ts`: `AuthorSummarySchema`, `FeedEntrySchema`
      (extiende `ListenEntrySchema` con `author`) y `FeedResponseSchema`.
- [x] 2.2 Crear `GET /api/users/[username]/diary` (sesión opcional con `resolveSession`,
      `parsePagination`, `withErrorHandling`).
- [x] 2.3 Crear `GET /api/me/feed` (`requireUser`, `parsePagination`, `withErrorHandling`).
- [x] 2.4 Cliente API: `getUserDiary(username, page, pageSize)` y `getFeed(page, pageSize)` vía
      `apiFetch` con Zod (en `src/lib/api/diary.ts` o módulo `feed.ts`).
- [x] 2.5 Route tests de ambos endpoints (200, 404 `USER_NOT_FOUND`, 400 `VALIDATION_ERROR`,
      401 `AUTH_REQUIRED`, lista vacía sin permiso).

## 3. UI: diario en perfil y página de feed

- [x] 3.1 Extender `DiaryList` con props opcionales `readOnly`, `showAuthor`, `loadMore` y `empty`
      (oculta edición/borrado/audiencia en readOnly; autor + enlace al perfil con `showAuthor`;
      reemplaza `getMyDiary` cuando hay `loadMore`).
- [x] 3.2 Renderizar sección de diario en `users/[username]/page.tsx` cuando
      `profile.accessible || isOwn`, con estado vacío localizado y textos i18n.
- [x] 3.3 Crear página `me/feed` (Server Component con `requirePageUser` + `listFeed`) y componente
      de feed reutilizando `DiaryList` en modo lectura con autor.
- [x] 3.4 Agregar enlace "Feed" al `Header` autenticado junto a "Diario" (i18n es/en).
- [x] 3.5 Component tests de `DiaryList` en modo lectura y del feed (estado vacío, autor visible,
      sin controles de edición).

## 4. Smoke test

- [x] 4.1 Crear `scripts/smoke-test-diary-social.ts` contra BD scratch (`ALLOW_SMOKE_ON_REAL_DB=1`)
      con usuarios `smoke-social-*` (patrón de `smoke-test-social.ts`): verifica la matriz de
      visibilidad en perfil y feed, y limpia usuarios y entradas al terminar.

## 5. Documentación (mismo cambio)

- [x] 5.1 Actualizar `docs/04-api/contracts.md` con `GET /api/users/[username]/diary` y
      `GET /api/me/feed`, y la forma de `entry` con `author`.
- [x] 5.2 Cerrar en `docs/05-features/phase-5-design.md` §14 la decisión de actividad pública de
      perfil privado y actualizar la sección de feed (v1 solo diario).
- [x] 5.3 Actualizar `docs/05-features/activity-feed.md` (estado ⚪→🟡, alcance v1) y
      `docs/README.md` (estado de `05-features`).
- [x] 5.4 Verificar en `docs/04-api/errors.md` que no se requieren códigos de error nuevos.

## 6. Validación final

- [x] 6.1 Ejecutar `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` con todo
      verde.
- [x] 6.2 Ejecutar el smoke test de diario social contra BD scratch y verificar limpieza de
      fixtures.
- [x] 6.3 Archivar el change con `openspec archive` y sincronizar las specs a `openspec/specs/`.
