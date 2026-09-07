## 1. Modelo de datos y migraciones

- [x] 1.1 Migración Drizzle: columnas nullable en `app_user` (`bio`, `pronouns`, `location`, `timezone`, `avatar_url`) con sus CHECK de longitud (200 / 40 / 80 / 64 / 400) — `drizzle/0014_user_profile_redesign.sql`
- [x] 1.2 Migración Drizzle: tabla `user_profile_link` (`user_id` FK CASCADE, `kind` CHECK conjunto cerrado, `url` CHECK ≤ 400, `position`), índice `(user_id, position)`
- [x] 1.3 Migración Drizzle: tabla `user_pinned_item` (triple FK nullable `artist_id`/`release_group_id`/`recording_id` + CHECK `num_nonnulls = 1`, `note` CHECK ≤ 120, `position`), índice `(user_id, position)`
- [x] 1.4 Migración Drizzle: tabla `user_showcase` (`user_id` PK/FK CASCADE, `anthem_recording_id` FK `ON DELETE SET NULL`, `updated_at` por trigger `fn_touch_updated_at`)
- [x] 1.5 Migración Drizzle: tabla `release_group_tag` (`release_group_id` FK CASCADE, `tag`, `count`, PK `(release_group_id, tag)`, índice por `tag`)
- [x] 1.6 Mirror de schema en `src/db/schema.ts` con las tablas y columnas nuevas y sus tipos `$inferSelect`
- [x] 1.7 Script de seed idempotente `scripts/seed-release-group-tags.ts` (deriva tags del artista principal; `ON CONFLICT DO NOTHING`); ejecución documentada en la cabecera del script
- [x] 1.8 Verificar `pnpm typecheck` y que las migraciones aplican sobre una base limpia (`pnpm db:migrate` aplicado contra BD de scratch por el usuario)

## 2. Servicios base de perfil

- [x] 2.1 `src/services/profiles/identity.ts`: `getExtendedIdentity` / `getExtendedIdentityByUsername` (identidad + enlaces ordenados + contadores) + contrato Zod en `schemas.ts` (`ExtendedIdentitySchema`, `ProfileLinkSchema`) y constantes en `social/types.ts`
- [x] 2.2 `updateIdentity(userId, input)`: `UpdateProfileIdentityRequestSchema` (recorte, límites), cadena vacía → null, claves ausentes se ignoran, `ApiError` tipado
- [x] 2.3 `replaceLinks(userId, links[])`: `ReplaceProfileLinksRequestSchema`, máx. 5, `kind` cerrado, URL `http(s)` ≤ 400, posición por orden, transacción delete+insert
- [x] 2.4 `src/services/profiles/profile-view.ts`: `getProfileView(username, viewerId)` compone `getProfileByUsername` (relación/accesible/bloqueo) + identidad extendida; `getProfileByUsername` sin tocar
- [x] 2.5 `countPendingFollowRequests(userId)` en `src/services/social/following.ts`
- [x] 2.6 Tests: `identity.test.ts` (recorte, vaciado, bio > 200, pronombres > 40, USER_NOT_FOUND, 6 enlaces, URL no http, kind inválido, posición por orden) + `following.test.ts` (conteo de pendientes)

## 3. Placa y monograma compartido

- [x] 3.1 `src/components/social/monogram.ts` (`monogramLetter`, `monogramStyle`, `MONOGRAM_STYLES`) + `monogram.test.ts`
- [x] 3.2 `UserCard` consume `monogram.ts`; sin cambio visual; tests existentes en verde
- [x] 3.3 `src/components/profiles/Placa.tsx` (Server): monograma, nombre display, `@username · pronombres`, línea mono (seguidores · seguidos · miembro desde · ubicación), bio serif, chips de enlaces externos (`target=_blank rel=noopener`), clúster `FollowButton` + `BlockButton`
- [x] 3.4 Responsive: apilada en móvil, `sm:flex-row` con acción al extremo; sin sombras; hover ámbar en chips
- [x] 3.5 `Placa.test.tsx`: pública, privada sin autorización (bio/enlaces/contadores siguen), dueño (sin bloqueo), anónimo (sin bloqueo), otro autenticado (con bloqueo)

## 4. Vista privada (hito: construir primero)

- [x] 4.1 `src/components/profiles/PrivateThreshold.tsx` (Server): aviso sobre superficie con hairline + disco de vinilo como marca de agua, eyebrow mono, cuerpo serif, CTA `FollowButton` repetido
- [x] 4.2 `src/services/profiles/affinity.ts` → `mutualFollowersHint(viewerId, ownerId)` (solo cantidad) + `affinity.test.ts`
- [x] 4.3 Hint de seguidores en común integrado en `PrivateThreshold` (`mutualFollowers > 0`)
- [x] 4.4 `page.tsx` reescrito: `getProfileView` + `resolveSession`; compone `Placa` siempre, `PrivateThreshold` cuando `!accessible && !isOwn`; estantes existentes conservados para `accessible || isOwn` (los rieles llegan en el Grupo 8)
- [x] 4.5 Claves i18n ES/EN: `memberSince`, `profileLinksLabel`, `linkKind.*`, `privateNotice*`
- [x] 4.6 `page.test.tsx`: privado anónimo, privado con solicitud pendiente, público mínimo, bloqueado, cálculo del hint solo autenticado+bloqueado-fuera
- [ ] 4.7 Revisión visual en navegador (móvil + escritorio) — requiere dev server + `DATABASE_URL` + usuario de prueba; pendiente en el entorno del usuario

## 5. Edición de identidad del dueño

- [x] 5.1 `PATCH /api/me/profile` ampliado (`UpdateOwnProfileRequestSchema`: visibilidad y/o identidad, todo opcional) + `route.test.ts`
- [x] 5.2 `PUT/DELETE /api/me/profile/links` (`ReplaceProfileLinksRequestSchema`, `replaceLinks` devuelve el conjunto persistido) + `route.test.ts`
- [x] 5.3 `OwnerIdentityEditor` (bio+pronombres+ubicación+zona) y `OwnerLinksEditor` (filas kind+URL, agregar/quitar, máx 5) vía `apiFetch`; estados saving/saved/error recuperable; sin recargar
- [x] 5.4 Editores montados en `page.tsx` solo cuando `isOwn`
- [x] 5.5 Tests: `OwnerIdentityEditor.test.tsx`, `OwnerLinksEditor.test.tsx` (guardado, deshabilitado sin cambios, error conserva input, tope de 5, quitar fila) + `page.test.tsx` (editores solo para el dueño)

## 6. Huella de gusto

- [x] 6.1 `src/services/profiles/stats.ts` → `computeRatingStats` (`GROUP BY stars`); valoraciones visibles solo para dueño/seguidor aprobado (regla del feed, no tienen audiencia propia — spec revisado); resto filtrado por `audiencesForProfile`
- [x] 6.2 `computeDecades` (release_group visibles → `min(year)` por álbum → década) con degradación (vacío si no hay fechas)
- [x] 6.3 `computeGenres` vía `release_group_tag` (top 8); `genreDataAvailable` false cuando no hay filas
- [x] 6.4 Reparto: artistas/álbumes/canciones valorados + colección + listas (audience-filtered)
- [x] 6.5 `getTasteFingerprint` envuelto en `cache()`; migración `0015_profile_stats_indexes.sql` (`idx_rating_user`) + mirror
- [x] 6.6 `src/components/profiles/TasteFingerprint.tsx` (Server): curva en 10 barras CSS ámbar, crestas de décadas/géneros en barras `paper-muted`, reparto mono
- [x] 6.7 Equivalente textual: `<table class="sr-only">` con caption + filas para la curva, `<ul class="sr-only">` para cada cresta; barras `aria-hidden`
- [x] 6.8 `GET /api/users/[username]/fingerprint` + `TasteFingerprintResponseSchema` (Zod) — devuelve `{ fingerprint: null }` sin acceso
- [x] 6.9 Tests: `stats.test.ts` (mock db por tabla: seguidor ve curva, visitante no, sin género, décadas), `TasteFingerprint.test.tsx`, `fingerprint/route.test.ts`
- [ ] 6.10 Revisión visual de `TasteFingerprint` (móvil + escritorio) con datos sembrados — pendiente en el entorno del usuario

## 7. Destacados e himno

- [x] 7.1 `src/services/profiles/showcase.ts` → `getShowcase` (resuelve entidad por LEFT JOIN + `PRIMARY_ARTIST_SQL`, omite las borradas)
- [x] 7.2 `replacePinned` (máx 4, tipos mezclados, nota ≤ 120, FK inválida → VALIDATION_ERROR), `setAnthem` (upsert), `clearAnthem`
- [x] 7.3 `PUT/DELETE /api/me/profile/pinned` y `/anthem` + contrato Zod (`ShowcaseSchema`, `ReplacePinnedRequestSchema`, `SetAnthemRequestSchema`) + `route.test.ts` de ambos
- [x] 7.4 `PinnedShowcase.tsx` (grid de 4 carátulas cuadradas + artista + nota) y `AnthemStrip.tsx` (tira "suena en bucle")
- [x] 7.5 `OwnerShowcaseEditor.tsx`: reordenar/quitar/nota + alta **desde los favoritos del usuario** (NO buscador de catálogo embebido — respeta la memoria `list-detail-scope`); himno se elige de favoritos tipo `recording`; solo vista del dueño
- [x] 7.6 Tests: `showcase.test.ts` (>4, nota larga, FK→VALIDATION_ERROR, entidad borrada omitida, himno no lee escuchas), `pinned/anthem route.test.ts`, `PinnedShowcase.test.tsx`, `page.test.tsx` (ausente si bloqueado fuera)

## 8. Vista autorizada: estantes y recencia

- [x] 8.1 `src/components/profiles/ProfileRail.tsx` — encabezado uniforme (título display + conteo mono). `ScrollablePreviewList` NO era reutilizable (es específico de feed/self); el estante mantiene el componente de lectura existente como cuerpo
- [x] 8.2 `src/app/[locale]/users/[username]/sections.tsx` — `DiaryRail`/`FavoritesRail`/`ListsRail`/`CollectionRail` reusan los modos `readOnly` y sus endpoints; colapsan a `null` cuando no hay contenido visible y el visitante no es el dueño (el dueño ve un estante vacío)
- [x] 8.3 `src/services/profiles/recency.ts` → `getProfileRecency` (max timestamp de escuchas/favoritos/listas/colección visibles + valoraciones si aplica) + `ProfileRecency.tsx` ("última señal hace…"); el microfeed de 3 ítems se difiere (no hay endpoint de actividad reciente por-usuario)
- [x] 8.4 `page.tsx` reescrito: Placa + nav + umbral inmediatos; cada sección (`OwnerEditors`, showcase, huella, recencia, 4 rieles) bajo su propio `<Suspense>`
- [x] 8.5 `sections.test.tsx` (riel vacío colapsa, dueño ve estante vacío, conteo, showcase/huella null) + `page.test.tsx` reescrito + `recency.test.ts`
- [ ] 8.6 Revisión visual de la vista pública completa (móvil + escritorio) — pendiente en el entorno del usuario

## 9. Afinidad

- [x] 9.1 `getProfileAffinity` en `affinity.ts`: intersección de favoritos (owner filtrado por audiencia), entidades con `stars >= 4` en ambos (solo si `relation === "following"`), `mutualFollowersHint`; null para anónimo/dueño/bloqueo/sin-acceso/sin-coincidencias
- [x] 9.2 `GET /api/users/[username]/affinity` + `ProfileAffinityResponseSchema` (Zod) → `{ affinity: null }` cuando no aplica
- [x] 9.3 `ProfileAffinity.tsx` (Server): seguidores en común + filas de favoritos/valoraciones en común con enlace a la entidad; la página no lo monta si `getProfileAffinity` devuelve null
- [x] 9.4 Tests: `affinity.test.ts` (null anónimo/self/bloqueo/sin-coincidencias, favoritos en común resueltos), `affinity/route.test.ts`, `sections.test.tsx` (AffinitySection null/render)

## 10. Panel del dueño y "cómo te ven"

- [x] 10.1 `src/components/profiles/OwnerHubPanel.tsx` (Server): grid de enlaces a las 9 superficies `/me/*` (`HubSection` en `sections.tsx` hace el fetch bajo `<Suspense>`)
- [x] 10.2 Badge de solicitudes pendientes (`countPendingFollowRequests`) en "Solicitudes", enmarcado como bandeja (`hub.pendingRequests`); oculto en 0
- [~] 10.3 Marcado per-ítem de elementos privados en huella/estantes: diferido (requiere hilar un prop nuevo por los 4 componentes de lectura). El previsualizador "cómo te ven" cubre el objetivo por comparación
- [x] 10.4 `ViewAsBanner.tsx` + `?preview=1` en `page.tsx`: recompone el perfil como visitante anónimo (`getProfileView(username, null)`), sin editores/hub; banner con enlace de vuelta. Navegación por query param, sin estado cliente
- [x] 10.5 Auditado: Header, Footer, `WelcomePanel`, `CommunityActivity`, `PopularCommentsTabs`, `PublicLists` ya enlazan a `/users/{username}`; no existe ruta de perfil del dueño separada (no hay `page.tsx` en `/me`)
- [x] 10.6 Tests: `OwnerHubPanel.test.tsx` (enlaces, badge con/sin pendientes), `page.test.tsx` (hub + banner para el dueño, `?preview=1` recompone como anónimo sin editores, ausentes para visitantes)

## 11. Cierre

- [x] 11.1 Claves i18n ES/EN completas para todas las superficies nuevas; `messages.consistency`/`messages.keys` en verde (nombres de catálogo nunca se traducen — solo textos de UI)
- [x] 11.2 `docs/05-features/user-profile.md` nuevo + `docs/04-api/contracts.md` con los endpoints nuevos (`/links`, `/pinned`, `/anthem`, `/fingerprint`, `/affinity`) y el `PATCH /api/me/profile` ampliado
- [x] 11.3 `docs/05-features/phase-5-design.md` §4.4: decisiones cerradas (identidad extendida en privado, ruta canónica del dueño, himno manual)
- [x] 11.4 `openspec validate redesign-user-profile --strict` ✅
- [x] 11.5 `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` ✅ (991/991, 155 archivos) · `pnpm build` ✅ (compila, typecheck de build, todas las rutas nuevas generadas)
- [ ] 11.6 Revisión visual final de las tres vistas (móvil + escritorio) y `prefers-reduced-motion` — pendiente en el entorno del usuario (dev server + BD)
