## 1. Servicio generalizado

- [x] 1.1 Nuevo `src/services/activity/community-activity.ts`: `listCommunityActivity(viewerId, page = 1, pageSize = 10)` — ratings + comentarios + reseñas de perfiles `public`, `LIMIT pageSize + 1` por fuente sin offset, fusión en memoria por `createdAt`/`updatedAt` descendente, `.slice((page-1)*pageSize, page*pageSize+1)`, `hasNext = merged.length > pageSize`. Excluye bloqueos cuando hay `viewerId`.
- [x] 1.2 Retirar `listCommunityActivity` de `src/services/home/home.ts`; actualizar sus imports.
- [x] 1.3 Actualizar `AnonymousHome.tsx` y `AuthenticatedHome.tsx` para importar la nueva función y desestructurar `.entries` (llamando con `page=1, pageSize=previewLimit`).
- [x] 1.4 Tests de servicio: mezcla de las tres fuentes, orden cronológico, exclusión por bloqueo, paginación (`hasNext`), lector anónimo.

## 2. API

- [x] 2.1 Nuevo `GET /api/activity/recent` (público, `getCurrentUser`, `page`/`pageSize`, sin filtros).
- [x] 2.2 Tests de ruta: con sesión, sin sesión, paginación inválida.

## 3. Componentes

- [x] 3.1 Generalizar `CompactActivityRow` (`src/components/home/CommunityActivity.tsx`) para aceptar `FeedReview`: rama `review` con `t("reviewVerbTitled", {title})`/`t("reviewVerb")` + cuerpo `line-clamp-2`. Exportar el componente de fila para reuso.
- [x] 3.2 Nuevo `src/components/activity/CommunityActivitySection.tsx` (client, patrón `CommunityListSection`): `useInfiniteQuery` contra `GET /api/activity/recent` o `GET /api/me/feed` según `source`, "cargar más", reusa la fila de 3.1.
- [x] 3.3 `queryKeys`: `recentActivity()` / reuso de la key existente de feed para "de seguidos" si aplica.

## 4. Superficie `/[locale]/activity`

- [x] 4.1 Nueva ruta `src/app/[locale]/activity/page.tsx` — Server Component con `resolveSession()`; compone Recientes → De la gente que seguís (solo con sesión); omite secciones vacías; estado vacío global si no hay ninguna.
- [x] 4.2 `generateMetadata` con título localizado.
- [x] 4.3 Tests de la página: composición con/sin sesión, omisión de secciones vacías, "De seguidos" ausente para anon, estado vacío global.

## 5. Header

- [x] 5.1 Añadir el enlace "Actividad" → `/activity` en la barra general `md+` de `Header.tsx` (orden: Buscador · Explorar · Listas · Actividad · Registrar), visible con y sin sesión.
- [x] 5.2 Añadir el mismo enlace al bloque de barra general del panel móvil.
- [x] 5.3 Actualizar `Header.test.tsx`: el enlace "Actividad" aparece con y sin sesión y apunta a `/activity`, no a `/me/feed`.

## 6. i18n

- [x] 6.1 `feed.community.*` en `messages/{es,en}/feed.json`: `pageTitle`, `heading`, `intro`, `recentHeading`, `followingHeading`, `emptyTitle`, `emptyDescription`. Reusar `reviewVerb`/`reviewVerbTitled`/`commentLabel`/`ratingVerb`/`loadMore`/`loadingMore`/`loadError` ya existentes.
- [x] 6.2 `common.activity` o clave equivalente para la etiqueta del enlace del Header (verificar si ya existe una reutilizable antes de crear una nueva).

## 7. Documentación y specs

- [x] 7.1 Actualizar `docs/05-features/activity-feed.md` y/o `home.md`: nueva superficie `/activity`, generalización de `listCommunityActivity`, y que el preview de Inicio pasa a poder mostrar reseñas.
- [x] 7.2 Confirmar que `docs/05-features/README.md` indexa la nueva superficie.

## 9. Rediseño en pestañas y tercera fuente "Tu actividad"

- [x] 9.1 Nuevo `src/components/activity/ActivityTabs.tsx` (client, ARIA tabs, mismo
      patrón que `PopularCommentsTabs`/`ListsSection`): monta solo el panel activo, cada
      uno una `CommunityActivitySection` completa.
- [x] 9.2 `CommunityActivitySection` gana `emptyMessage` (antes: sin entradas, no
      renderizaba nada) y una tercera fuente `own` sobre `listMyRecentActivity`.
- [x] 9.3 `page.tsx`: sin sesión, "Recientes" sin pestañas (sin cambios); con sesión,
      `ActivityTabs` con las tres fuentes si `anySection`; si no, estado vacío global.
- [x] 9.4 Tests de `ActivityTabs`, `CommunityActivitySection` y `page.tsx` actualizados
      para el nuevo layout.

## 8. Verificación

- [x] 8.1 `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` en verde.
- [x] 8.2 Verificación visual en navegador: `/activity` con sesión y en incógnito (secciones, "De seguidos" ausente para anon, reseñas visibles en Recientes), enlace del Header en desktop y móvil, preview de Inicio sin regresión visual.
- [x] 8.3 `openspec validate add-community-activity-surface --type change --strict` en verde.
