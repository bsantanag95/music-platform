## 1. Extraer render de entradas de feed

- [x] 1.1 Crear `src/components/feed/FeedEntryBody.tsx`: mover ahí la función `FeedBody` de
      `src/components/feed/FeedList.tsx` (mismas cinco variantes por `kind`), exportada como
      `FeedEntryBody`.
- [x] 1.2 Actualizar `FeedList.tsx` para importar y usar `FeedEntryBody` en vez de la función
      interna. Ajuste sobre el plan: también se extrajo `FeedEntryCard` (autor + cuerpo +
      fecha, el wrapper completo de `<li>`) al mismo archivo, porque los 3 bloques de Inicio
      necesitan exactamente ese wrapper — sin esto se hubiera duplicado 3 veces más.
- [x] 1.3 Confirmar que `src/components/feed/FeedList.test.tsx` (si existe) sigue pasando sin
      cambios de comportamiento. No existe ese archivo — no hay tests de componente para
      `FeedList` en el repo (solo tests de servicio/ruta); nada que correr acá.

## 2. Servicio de datos de Inicio

- [x] 2.1 Crear `src/services/home/home.ts` con `listCommunityActivity(viewerId: string |
      null, limit = 10)`: une `rating` + `comment` (mismo join a
      `artist`/`releaseGroup`/`recording`/`appUser` que `feed.ts`), filtrando
      `appUser.profileVisibility = 'public'` y, si `viewerId` no es null, excluyendo
      bloqueos en cualquier dirección (mismo patrón `NOT EXISTS ... user_block` que
      `BLOCKED_SQL` en `feed.ts`, duplicado localmente). Ordena por fecha desc, sin
      paginación, devuelve `(FeedRating | FeedComment)[]` de tamaño `limit`.
- [x] 2.2 En el mismo archivo, `listPublicLists(viewerId: string | null, limit = 10)`: mismo
      patrón sobre `user_list`, filtrando `audience = 'public'` +
      `appUser.profileVisibility = 'public'` + bloqueo si hay `viewerId`. Devuelve
      `FeedListEvent[]` de tamaño `limit`.
- [x] 2.3 En el mismo archivo, `listFollowingFeedPreview(userId: string, limit = 5)`: wrapper
      fino sobre `listFeed(userId, 1, limit)` que devuelve solo `entries`.
- [x] 2.4 Exportar los tipos `FeedRating`, `FeedComment`, `FeedListEvent` desde
      `src/services/feed/feed.ts` si no lo están ya (para importarlos en `home.ts` sin
      duplicar definiciones). Ya estaban exportados como `interface` públicas — nada que
      cambiar ahí.

## 3. Componentes de Inicio

- [x] 3.1 Crear `src/components/home/CommunityActivity.tsx`: recibe `FeedEntry[]`, no
      renderiza nada si está vacío, si no un `<ul>` de entradas usando `FeedEntryBody`.
      Ajuste sobre el plan: reusa `FeedEntryCard` (autor + cuerpo + fecha), no solo
      `FeedEntryBody` — ver nota en tarea 1.1/1.2 sobre la extracción ampliada.
- [x] 3.2 Crear `src/components/home/PublicLists.tsx`: mismo patrón sobre `FeedListEvent[]`.
- [x] 3.3 Crear `src/components/home/FeedPreview.tsx`: recibe `FeedEntry[]` (del feed de
      seguidos) y un link a `/me/feed`; no paginación ni "cargar más". Agrega un mensaje
      compacto para el caso "sigue a alguien pero sin actividad visible aún" (no estaba en
      el plan original, pero hacía falta un estado para esa combinación).
- [x] 3.4 Crear `src/components/home/OnboardingPrompt.tsx`: CTA a `/users` (buscar gente) y a
      `/search` (explorar catálogo), para el caso "usuario logueado sin seguidos".
- [x] 3.5 Crear `src/components/home/QuickLinks.tsx`: accesos rápidos a diario, favoritos,
      listas, buscador (solo para usuario logueado).

## 4. Página de Inicio

- [x] 4.1 Reescribir `src/app/[locale]/page.tsx` como Server Component:
      `getCurrentUser()` para la sesión opcional; si hay usuario, `listFollowing(user.id, 1,
      1)` para decidir feed compacto vs. onboarding, y `listFollowingFeedPreview` cuando
      corresponda; siempre `listCommunityActivity(user?.id ?? null)` y
      `listPublicLists(user?.id ?? null)`.
- [x] 4.2 Componer el layout: tagline + buscador (existente) arriba; para logueado,
      `QuickLinks` + (`FeedPreview` u `OnboardingPrompt`); luego `CommunityActivity` y
      `PublicLists` para ambos estados; CTA de registro/login solo para anónimo. Se agregó
      además un mensaje de respaldo cuando ambos bloques comunitarios están vacíos (no
      estaba en el plan, pero una página en blanco tras el buscador se sentía como un error).

## 5. Mensajes e i18n

- [x] 5.1 Crear `messages/es/home.json` y `messages/en/home.json` con las claves de los
      bloques nuevos (títulos de sección, CTA de onboarding, CTA de registro/login en
      Inicio). El CTA de registro/login en sí reusa las claves ya existentes de
      `common.json` (`login`/`register`), no duplicadas en `home.json`.
- [x] 5.2 Registrar el namespace `home` en `src/i18n/request.ts`.

## 6. Documentación

- [x] 6.1 Actualizar `docs/05-features/home.md`: estado a implementado, referenciar este
      cambio (`add-home-page`).
- [x] 6.2 Actualizar `docs/05-features/README.md` (fila de `home.md`).

## 7. Pruebas

- [x] 7.1 `src/services/home/home.test.ts`: casos para `listCommunityActivity` (excluye
      perfil privado, excluye bloqueado si hay viewer, incluye para anónimo) y
      `listPublicLists` (excluye lista no pública, excluye perfil privado, excluye
      bloqueado). Ajuste: igual que se decidió en `add-ratings-comments-feed`, la
      visibilidad por perfil privado/bloqueo no se testea aparte — es SQL condicional
      (`PUBLIC_PROFILE`, `NOT_BLOCKED_SQL`) que estos mocks de query no ejercitan; los casos
      reales cubiertos son fusión/orden entre fuentes, límite tras fusionar, y el mapeo
      created/updated + cast de `entityType` de `listPublicLists`.
- [x] 7.2 Test de `src/app/[locale]/page.tsx` (o de sus componentes) cubriendo: anónimo ve
      CTA de registro y no ve accesos rápidos; logueado con seguidos ve `FeedPreview`;
      logueado sin seguidos ve `OnboardingPrompt`. Implementado como
      `src/app/[locale]/page.test.tsx`, invocando el Server Component directo (mismo patrón
      que `artist/[id]/page.test.tsx`) e inspeccionando el árbol de elementos devuelto sin
      renderizar (los hijos son Server Components async que no se ejecutan si no se
      renderiza), en vez de test de componentes individuales.
- [x] 7.3 Correr `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` antes de
      dar la tarea por terminada. typecheck ✓, lint ✓, test (436/436) ✓, build ✓ (`/[locale]`
      pasa a ser dinámico porque ahora lee sesión, esperado).
