## 1. Extraer render de entradas de feed

- [ ] 1.1 Crear `src/components/feed/FeedEntryBody.tsx`: mover ahí la función `FeedBody` de
      `src/components/feed/FeedList.tsx` (mismas cinco variantes por `kind`), exportada como
      `FeedEntryBody`.
- [ ] 1.2 Actualizar `FeedList.tsx` para importar y usar `FeedEntryBody` en vez de la función
      interna.
- [ ] 1.3 Confirmar que `src/components/feed/FeedList.test.tsx` (si existe) sigue pasando sin
      cambios de comportamiento.

## 2. Servicio de datos de Inicio

- [ ] 2.1 Crear `src/services/home/home.ts` con `listCommunityActivity(viewerId: string |
      null, limit = 10)`: une `rating` + `comment` (mismo join a
      `artist`/`releaseGroup`/`recording`/`appUser` que `feed.ts`), filtrando
      `appUser.profileVisibility = 'public'` y, si `viewerId` no es null, excluyendo
      bloqueos en cualquier dirección (mismo patrón `NOT EXISTS ... user_block` que
      `BLOCKED_SQL` en `feed.ts`, duplicado localmente). Ordena por fecha desc, sin
      paginación, devuelve `(FeedRating | FeedComment)[]` de tamaño `limit`.
- [ ] 2.2 En el mismo archivo, `listPublicLists(viewerId: string | null, limit = 10)`: mismo
      patrón sobre `user_list`, filtrando `audience = 'public'` +
      `appUser.profileVisibility = 'public'` + bloqueo si hay `viewerId`. Devuelve
      `FeedListEvent[]` de tamaño `limit`.
- [ ] 2.3 En el mismo archivo, `listFollowingFeedPreview(userId: string, limit = 5)`: wrapper
      fino sobre `listFeed(userId, 1, limit)` que devuelve solo `entries`.
- [ ] 2.4 Exportar los tipos `FeedRating`, `FeedComment`, `FeedListEvent` desde
      `src/services/feed/feed.ts` si no lo están ya (para importarlos en `home.ts` sin
      duplicar definiciones).

## 3. Componentes de Inicio

- [ ] 3.1 Crear `src/components/home/CommunityActivity.tsx`: recibe `FeedEntry[]`, no
      renderiza nada si está vacío, si no un `<ul>` de entradas usando `FeedEntryBody`.
- [ ] 3.2 Crear `src/components/home/PublicLists.tsx`: mismo patrón sobre `FeedListEvent[]`.
- [ ] 3.3 Crear `src/components/home/FeedPreview.tsx`: recibe `FeedEntry[]` (del feed de
      seguidos) y un link a `/me/feed`; no paginación ni "cargar más".
- [ ] 3.4 Crear `src/components/home/OnboardingPrompt.tsx`: CTA a `/users` y a explorar
      listas públicas, para el caso "usuario logueado sin seguidos".
- [ ] 3.5 Crear `src/components/home/QuickLinks.tsx`: accesos rápidos a diario, favoritos,
      listas, buscador (solo para usuario logueado).

## 4. Página de Inicio

- [ ] 4.1 Reescribir `src/app/[locale]/page.tsx` como Server Component:
      `getCurrentUser()` para la sesión opcional; si hay usuario, `listFollowing(user.id, 1,
      1)` para decidir feed compacto vs. onboarding, y `listFollowingFeedPreview` cuando
      corresponda; siempre `listCommunityActivity(user?.id ?? null)` y
      `listPublicLists(user?.id ?? null)`.
- [ ] 4.2 Componer el layout: tagline + buscador (existente) arriba; para logueado,
      `QuickLinks` + (`FeedPreview` u `OnboardingPrompt`); luego `CommunityActivity` y
      `PublicLists` para ambos estados; CTA de registro/login solo para anónimo.

## 5. Mensajes e i18n

- [ ] 5.1 Crear `messages/es/home.json` y `messages/en/home.json` con las claves de los
      bloques nuevos (títulos de sección, CTA de onboarding, CTA de registro/login en
      Inicio).
- [ ] 5.2 Registrar el namespace `home` en `src/i18n/request.ts`.

## 6. Documentación

- [ ] 6.1 Actualizar `docs/05-features/home.md`: estado a implementado, referenciar este
      cambio (`add-home-page`).
- [ ] 6.2 Actualizar `docs/05-features/README.md` (fila de `home.md`).

## 7. Pruebas

- [ ] 7.1 `src/services/home/home.test.ts`: casos para `listCommunityActivity` (excluye
      perfil privado, excluye bloqueado si hay viewer, incluye para anónimo) y
      `listPublicLists` (excluye lista no pública, excluye perfil privado, excluye
      bloqueado).
- [ ] 7.2 Test de `src/app/[locale]/page.tsx` (o de sus componentes) cubriendo: anónimo ve
      CTA de registro y no ve accesos rápidos; logueado con seguidos ve `FeedPreview`;
      logueado sin seguidos ve `OnboardingPrompt`.
- [ ] 7.3 Correr `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` antes de
      dar la tarea por terminada.
