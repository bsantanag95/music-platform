## 1. Servicios de datos

- [ ] 1.1 Añadir `listMyRecentActivity(userId: string, limit = 5)` en
  `src/services/home/home.ts`: unión de escuchas + ratings + comentarios propios
  (`WHERE user_id = userId`, sin filtro de audiencia), merge por `createdAt` desc,
  `slice(0, limit)`. Devuelve `(FeedListenEntry | FeedRating | FeedComment)[]`
  reutilizando los tipos de `src/services/feed/feed.ts`.
- [ ] 1.2 Añadir `getMostRecentEditedList(userId: string)` en
  `src/services/home/home.ts`: `user_list WHERE owner_id = userId ORDER BY updated_at
  DESC, id DESC LIMIT 1`, con hasta 4 `coverThumbUrl` de sus ítems; devuelve `null` si
  no hay listas. Verificar que el trigger de `updated_at` se dispare al agregar/quitar
  ítems; si no, ordenar por la actividad de `user_list_item`.
- [ ] 1.3 Tests en `src/services/home/home.test.ts`: `listMyRecentActivity` incluye
  entradas privadas propias y ordena por fecha; devuelve `[]` sin actividad.
  `getMostRecentEditedList` devuelve la lista más reciente por `updated_at` y `null`
  sin listas.

## 2. Componentes de Inicio con sesión

- [ ] 2.1 Extraer la rama con sesión de `src/app/[locale]/page.tsx` a
  `src/components/home/AuthenticatedHome.tsx` (Server Component) que recibe el `user` y
  orquesta todos los datos en un solo `Promise.all`.
- [ ] 2.2 Crear `src/components/home/Greeting.tsx`: una línea `home.greeting` con
  `displayName ?? @username`. Sin conteos ni fechas derivadas.
- [ ] 2.3 Crear `src/components/home/RecentSelfActivity.tsx`: lista top-N de entradas
  propias vía `FeedEntryCard`, con encabezado `home.recentActivityTitle` y link "ver
  diario" a `/me/diary`. No renderiza nada si `entries` está vacío.
- [ ] 2.4 Crear `src/components/home/ResumeList.tsx`: tarjeta con título de la lista,
  mini-mosaico de hasta 4 carátulas (`CoverThumb`) y link a la lista. No renderiza
  nada si la lista es `null`.
- [ ] 2.5 Ampliar `src/components/home/OnboardingPrompt.tsx` con una tercera acción
  "registrá tu primera escucha" (link a `/search`). Mantener formato de prosa/botones,
  sin estados de checklist.

## 3. Composición de la página

- [ ] 3.1 Recomponer `AuthenticatedHome` en el orden del spec: saludo → feed preview o
  onboarding → rastro reciente (si hay) → retomar lista (si hay) → `QuickLinks` →
  `CommunityActivity` → `PublicLists` → `PopularComments` → `HomeReleases`.
- [ ] 3.2 Quitar de la rama con sesión el `<h1>{appName}</h1>` + `<p>{tagline}</p>`
  visibles; dejar un `<h1 className="sr-only">` para conservar el landmark.
- [ ] 3.3 Confirmar que la rama anónima de `page.tsx` (hero, `FeatureCarousel`,
  `AnonCta`, layout `compact`, `heroCovers`) queda intacta y que
  `listRecentCoverArt` ya no se invoca cuando hay sesión.
- [ ] 3.4 Ajustar `page.tsx` para delegar: `user ? <AuthenticatedHome user={user} /> :
  <AnonymousHome … />`.

## 4. i18n

- [ ] 4.1 Añadir claves a `messages/es/home.json` y `messages/en/home.json`:
  `greeting`, `recentActivityTitle`, `recentActivitySeeDiary`, `resumeListTitle`,
  `onboardingLogFirstListen` (y las que surjan).
- [ ] 4.2 Verificar paridad de claves ES/EN y que no queden claves huérfanas del
  encabezado retirado.

## 5. Tests de página

- [ ] 5.1 En `src/app/[locale]/page.test.tsx` cubrir la rama con sesión: usuario con
  seguidos ve feed preview y no ve tagline/hero/carrusel; usuario sin seguidos ve el
  onboarding ampliado.
- [ ] 5.2 Cubrir bloques condicionales: con actividad propia aparece el rastro
  reciente; sin actividad no; con lista aparece "retomá una lista"; sin listas no.
- [ ] 5.3 Verificar que el estado anónimo no cambió (test existente sigue en verde).

## 6. Documentación y cierre

- [ ] 6.1 Actualizar `docs/05-features/home.md`: cerrar la estructura del Inicio con
  sesión (hoy el documento se centra en el anónimo), documentar los bloques nuevos y
  el hallazgo sobre `user_list.updated_at`.
- [ ] 6.2 Ejecutar `pnpm typecheck && pnpm lint && pnpm test && pnpm build` y dejar
  todo en verde.
- [ ] 6.3 Validar el cambio: `openspec validate redesign-home-authenticated --strict`.
