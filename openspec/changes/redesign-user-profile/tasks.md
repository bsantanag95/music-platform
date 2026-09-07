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

- [ ] 5.1 Endpoint `PATCH /api/me/profile` (bio, pronombres, ubicación, zona horaria) con Zod + `with-error-handling` + test de ruta
- [ ] 5.2 Endpoint `PUT/DELETE /api/me/profile/links` con Zod + test de ruta
- [ ] 5.3 Editores inline cliente (bio, pronombres/ubicación/zona, enlaces) vía `src/lib/api/client.ts`; estados carga/éxito/error recuperable; sin recargar
- [ ] 5.4 Montar los editores solo cuando `relation === "self"`
- [ ] 5.5 Tests de los editores (guardado, vaciado, error recuperable conserva input, ausencia para visitantes)

## 6. Huella de gusto

- [ ] 6.1 `src/services/profiles/stats.ts`: curva de valoraciones (`GROUP BY stars`) filtrada por audiencia reusando los helpers de `src/services/diary/visibility.ts`
- [ ] 6.2 Cresta de décadas (valoraciones ∪ escuchas visibles → `release.release_date` → década) con degradación por datos escasos
- [ ] 6.3 Cresta de géneros vía `release_group_tag` con estado "sin datos de género todavía"
- [ ] 6.4 Reparto por tipo (artistas/álbumes/canciones valorados, colección, listas visibles)
- [ ] 6.5 Envolver el cálculo en `cache()` por request; añadir índices que falten
- [ ] 6.6 Componente `TasteFingerprint`: barras de la curva en CSS/SVG (sin librería), crestas, reparto; excepción sancionada a la Regla de Rareza del ámbar
- [ ] 6.7 Equivalente textual accesible (tabla o resumen `sr-only`) de curva, décadas y géneros
- [ ] 6.8 Endpoint `GET /api/users/[username]/fingerprint` (para hidratación diferida y previsualización) con Zod
- [ ] 6.9 Tests: seguidor ve más que visitante público, sin valoraciones oculta la curva, sin género muestra el estado, equivalente textual presente
- [ ] 6.10 Revisión visual de `TasteFingerprint` (móvil + escritorio) con datos sembrados

## 7. Destacados e himno

- [ ] 7.1 `src/services/profiles/showcase.ts`: lectura de destacados (resolviendo la entidad, omitiendo las inexistentes) e himno
- [ ] 7.2 `replacePinned(userId, items[])` máximo 4, tipos mezclados, nota ≤ 120; `setAnthem/clearAnthem`
- [ ] 7.3 Endpoints `PUT/DELETE /api/me/profile/pinned` y `PUT/DELETE /api/me/profile/anthem` con Zod + tests de ruta
- [ ] 7.4 Componente `PinnedShowcase` (4 carátulas cuadradas + nota) y `AnthemStrip` (tira "suena en bucle")
- [ ] 7.5 Editores inline de destacados e himno (buscador de entidad reutilizando la búsqueda de catálogo existente); solo vista del dueño
- [ ] 7.6 Tests: exceder 4, nota larga, entidad eliminada se omite, himno independiente de la última escucha, ausencia en privado sin autorización

## 8. Vista autorizada: estantes y recencia

- [ ] 8.1 Componente `ProfileRail` que envuelve `ScrollablePreviewList` con eyebrow mono + conteo + "ver todo" → superficie completa
- [ ] 8.2 Integrar rieles de diario, favoritos, listas y colección (reusar los modos `readOnly` y endpoints existentes); colapsar rieles vacíos
- [ ] 8.3 Línea de recencia ("última señal hace…") + microfeed opcional de 3 ítems de actividad visible
- [ ] 8.4 Componer la vista autorizada en `page.tsx` bajo `Suspense` por sección (nada bloquea la `Placa`)
- [ ] 8.5 Tests de composición: estante vacío se oculta, orden de secciones, seguidor vs público
- [ ] 8.6 Revisión visual de la vista pública completa (móvil + escritorio)

## 9. Afinidad

- [ ] 9.1 `src/services/profiles/affinity.ts`: favoritos en común, entidades con `stars >= 4` en ambos, seguidores en común; respeta bloqueo y audiencia; solo visitante autenticado ≠ dueño sobre perfil accesible
- [ ] 9.2 Endpoint `GET /api/users/[username]/affinity` con Zod
- [ ] 9.3 Componente `ProfileAffinity`; se oculta sin coincidencias, para anónimo y para el dueño
- [ ] 9.4 Tests: coincidencias mostradas, sin coincidencias oculta, anónimo/dueño no calcula, bloqueo no calcula

## 10. Panel del dueño y "cómo te ven"

- [ ] 10.1 Componente `OwnerHubPanel`: enlaces y resumen de `/me/diary`, `/me/favorites`, `/me/lists`, `/me/collection`, `/me/followers`, `/me/following`, `/me/follow-requests`, `/me/blocks`, `/me/settings`
- [ ] 10.2 Indicador de solicitudes pendientes (conteo de 2.5) junto a "Solicitudes", presentado como bandeja de entrada; oculto si es 0
- [ ] 10.3 Marcado de elementos privados del dueño en huella y estantes ("solo vos ves esto")
- [ ] 10.4 Toggle cliente "cómo te ven" (público / no-seguidor): re-render forzando la relación sobre datos ya cargados; ocultar bloques cuyos datos no estén disponibles
- [ ] 10.5 Auditar enlaces a la ruta canónica: Header, `WelcomePanel`, cualquier `/me` residual; confirmar que no hay ruta de perfil separada del dueño
- [ ] 10.6 Tests: badge con/sin pendientes, previsualización sin controles de edición, marcado de privados

## 11. Cierre

- [ ] 11.1 Completar claves i18n ES/EN para todas las superficies nuevas; verificar que ningún nombre de catálogo se traduce
- [ ] 11.2 Actualizar `docs/05-features` (nuevo documento de perfil) y `docs/03-api` con los endpoints nuevos
- [ ] 11.3 Actualizar `docs/05-features/phase-5-design.md` (decisiones cerradas: identidad extendida en privado, ruta canónica, himno manual)
- [ ] 11.4 `openspec validate redesign-user-profile --strict`
- [ ] 11.5 `pnpm typecheck && pnpm lint && pnpm test && pnpm build` en verde
- [ ] 11.6 Revisión visual final de las tres vistas (móvil + escritorio) y de `prefers-reduced-motion`
