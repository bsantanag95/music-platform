## 1. Paginación de "Tu rastro reciente"

- [x] 1.1 Reescribir `listMyRecentActivity` en `src/services/home/home.ts` con la misma
      técnica de paginación que `listFeed` (`page`, `pageSize`, `limit(pageSize + 1)` por
      fuente, merge + sort + slice), devolviendo `{ entries, page, pageSize, hasNext }`.
- [x] 1.2 Actualizar el único call site (`AuthenticatedHome.tsx`) al nuevo shape.
- [x] 1.3 Actualizar `home.test.ts` para el nuevo contrato de `listMyRecentActivity` y
      agregar casos de paginación (`hasNext`, página 2).

## 2. Endpoint y fetcher de rastro reciente

- [x] 2.1 Agregar `RecentActivityResponseSchema` en `src/lib/api/schemas.ts` (mismo shape
      que `FeedResponseSchema`, `entries` como unión `listen | rating | comment`).
- [x] 2.2 Crear `src/app/api/me/recent-activity/route.ts` (mismo esqueleto que
      `src/app/api/me/feed/route.ts`: `parsePagination` + `requireUser` +
      `listMyRecentActivity`).
- [x] 2.3 Crear `src/lib/api/home.ts` con `getRecentActivity(page, pageSize)`, análogo a
      `getFeed` en `src/lib/api/diary.ts`.
- [x] 2.4 Test de la ruta (`route.test.ts`), siguiendo el patrón de
      `src/app/api/me/feed/route.test.ts`.

## 3. Simplificar "Tu feed" a paginación real

- [x] 3.1 Eliminar `listFollowingFeedPreview` de `src/services/home/home.ts` (y su test).
- [x] 3.2 `AuthenticatedHome.tsx` pasa a resolver la página inicial de "Tu feed" con
      `listFeed(user.id, 1, 10)` en vez del wrapper.

## 4. Componente `ScrollablePreviewList`

- [x] 4.1 Nuevas query keys en `src/lib/query/keys.ts` (`homeFeedPreview`,
      `homeRecentActivity`).
- [x] 4.2 Crear `src/components/home/ScrollablePreviewList.tsx` ("use client"):
      `useInfiniteQuery` con `initialData` desde `initialEntries`/`initialHasNext`,
      discriminante `source: "feed" | "self"` para elegir `getFeed` vs `getRecentActivity`
      internamente, contenedor `overflow-y-auto` de altura fija por variante, sentinel +
      `IntersectionObserver` (con `root` en el contenedor) para disparar `fetchNextPage`,
      spinner mientras `isFetchingNextPage`.
- [x] 4.3 Componente de spinner circular reutilizable (CSS `animation: spin`, sin
      dependencias), con `role="status"` + `aria-label` localizado.
- [x] 4.4 Clase utilitaria de scrollbar temática en `src/app/globals.css`
      (`scrollbar-width`/`scrollbar-color` + `::-webkit-scrollbar*`, tokens
      `--color-ink-border` en reposo / `--color-amber` en hover).
- [x] 4.5 Elegir y documentar (comentario en el código) la altura fija `max-h-*` por
      variante — `max-h-[32rem]` (feed) / `max-h-[20rem]` (self), documentada como
      aproximación en `ScrollablePreviewList.tsx`. **Pendiente de ajuste fino**: no se pudo
      verificar contra datos reales mixtos en el navegador (ver tarea 6.3).

## 5. Integrar en Home

- [x] 5.1 `FeedPreview.tsx`: sigue resolviendo título/link server-side; delega la lista a
      `ScrollablePreviewList` con `source="feed"`.
- [x] 5.2 `RecentSelfActivity.tsx`: mismo tratamiento con `source="self"`.
- [x] 5.3 Traducciones: no hizo falta ninguna nueva — el spinner reutiliza
      `feed.loadingMore`, ya existente en `es`/`en`.

## 6. Pruebas y verificación

- [x] 6.1 Test de `ScrollablePreviewList` con `QueryClientProvider` y un mock de
      `IntersectionObserver` que expone el callback (`ScrollablePreviewList.test.tsx`):
      carga inicial sin pedir datos, carga incremental al intersectar el sentinel,
      selección correcta de fetcher por `source`, sin más solicitudes cuando `hasNext` es
      `false`. Se agregó además un stub no-op global de `IntersectionObserver` en
      `src/test/setup.ts` (jsdom no lo implementa).
- [x] 6.2 `tsc --noEmit`, `eslint .`, `vitest run` (608/608) y `next build` en verde.
- [x] 6.3 Verificación visual en navegador: **completada y confirmada por el usuario**
      (2026-09-04). El agente no pudo autenticar una sesión propia para ver el Home con
      datos, así que la revisión humana quedó pendiente en su momento; el usuario la
      confirma realizada al cerrar el cambio: altura estable del contenedor al pasar de 5 a
      10, scrollbar temática, spinner al llegar al fondo, en "Tu feed" y "Tu rastro reciente"
      con datos reales mixtos, y ajuste de `HEIGHT_BY_SOURCE` en `ScrollablePreviewList.tsx`
      si la altura no aproximaba bien 5 filas.
- [x] 6.4 Actualizar `docs/05-features/home.md` con el nuevo comportamiento de carga
      incremental.
