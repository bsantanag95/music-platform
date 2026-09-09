## 1. Migración y schema

- [x] 1.1 `drizzle/0020_app_user_onboarded_at.sql`: `ALTER TABLE app_user ADD COLUMN onboarded_at TIMESTAMPTZ;` seguido de `UPDATE app_user SET onboarded_at = created_at;` (los usuarios existentes ya están onboardeados)
- [x] 1.2 Espejo en `src/db/schema.ts` (`appUser.onboardedAt`) con comentario de sincronización; correr la migración y verificar que ningún `app_user` tiene `onboarded_at` nulo

## 2. Servicio de onboarding

- [x] 2.1 `src/services/onboarding/onboarding.ts` — `seedAlbumFavorites(userId, releaseGroupIds: string[])`: valida ≤ 6 y que cada RG exista (`VALIDATION_ERROR` si no); crea `favorite` de álbum para los RG sin favorito propio previo (audiencia por defecto); llama `replaceAlbumFavorites(userId, favoriteIds)`; NO crea `rating` ni `listen_entry`. Devuelve los álbumes favoritos resultantes
- [x] 2.2 `markOnboarded(userId)`: `UPDATE app_user SET onboarded_at = now() WHERE id = $1 AND onboarded_at IS NULL` (idempotente); `isOnboarded(userId)` / lectura del flag donde haga falta
- [x] 2.3 `completeOnboarding(userId, releaseGroupIds)`: si ya onboardeado → no-op (devuelve estado actual); si no → `seedAlbumFavorites` + `markOnboarded`
- [x] 2.4 Tests: seed de 4 álbumes → 4 favoritos fijados, cero `rating`/`listen_entry`; > 6 → `VALIDATION_ERROR`; RG inexistente → `VALIDATION_ERROR`; `[]` válido y solo marca; idempotencia (segunda llamada no re-siembra ni re-marca); test estructural: el módulo no escribe en `rating`

## 3. Zod y API

- [x] 3.1 `src/lib/api/schemas.ts`: `OnboardingRequestSchema` (`{ albumReleaseGroupIds: z.array(z.uuid()).max(6) }`), `OnboardingResponseSchema` (`{ albumFavorites: [...], onboardedAt: string }`)
- [x] 3.2 `src/app/api/me/onboarding/route.ts`: `POST` (requireUser, `safeParse` → `completeOnboarding(user.id, ids)`); devuelve `{ albumFavorites, onboardedAt }`
- [x] 3.3 `src/app/api/me/onboarding/route.test.ts`: sin sesión → `AUTH_REQUIRED`; 7 ids → `VALIDATION_ERROR` antes del servicio; id no UUID → `VALIDATION_ERROR`; happy path; segunda llamada idempotente
- [x] 3.4 Fetcher `src/lib/api/onboarding.ts` (`completeOnboarding(ids)`)

## 4. Redirección post-alta y guard

- [x] 4.1 `src/components/auth/AuthForm.tsx`: en modo `register`, `router.push("/welcome")` en vez de `/` (login sin cambio)
- [x] 4.2 `src/app/api/auth/google/callback/route.ts`: tras `resolveOrCreateOAuthUser`, si `user.onboardedAt == null` → `redirect(/<locale>/welcome)`; si no → destino actual
- [x] 4.3 `resolveOrCreateOAuthUser` devuelve la fila completa (ya lo hace) — confirmar que `onboardedAt` viene en el `.returning()` del insert y en el select de identidad existente; ajustar si falta
- [x] 4.4 `src/app/[locale]/welcome/page.tsx` (Server Component): `resolveSession` → sin sesión `redirect(/auth/login)`; cargar el usuario, si `onboardedAt != null` → `redirect(/)`; si no, render de `TwoDoorOnboarding`

## 5. UI del onboarding

- [x] 5.1 i18n: namespace nuevo `onboarding` en `messages/{es,en}/onboarding.json` (título de la página, copy de cada puerta, "sugerimos 3–5", contador, "Guardar y continuar", "Registrado: {title}", "Ir a Inicio", "Saltar", estados vacíos/carga). Registrar el namespace en el request config de next-intl si hace falta
- [x] 5.2 `src/components/onboarding/AlbumIdentityPicker.tsx` (client): buscador contra `GET /api/catalog/search` filtrando `kind === "release-group"`; resultados con carátula (`LazyCoverImage`) + título + año + artista; selección con tope 6, contador; estado local, sin guardar todavía
- [x] 5.3 `src/components/onboarding/NowPlayingPicker.tsx` (client): buscador (acepta `release-group` y `recording` vía `songContext`); al elegir → `POST /api/me/diary` (`createListenEntry` fetcher existente) + feedback "Registrado: {title}"; permite varias
- [x] 5.4 `src/components/onboarding/TwoDoorOnboarding.tsx` (client): compone las dos puertas como secciones hermanas + botón "Ir a Inicio" siempre visible → `completeOnboarding(pickerIds)` → `router.push("/")`; "Saltar" hace lo mismo con `[]`
- [x] 5.5 `src/components/home/OnboardingPrompt.tsx` (o bloque hermano en `AuthenticatedHome`): recibe `onboardedAt`; si es nulo, muestra enlace "Completá tu perfil musical" → `/welcome`. `AuthenticatedHome` pasa el flag (una lectura más en el `Promise.all`)

## 6. Verificación y regresión

- [x] 6.1 Tests de composición: `welcome/page` (guard: sin sesión → login; onboardeado → `/`; pendiente → render); `AuthenticatedHome` muestra/oculta el enlace según `onboardedAt`
- [x] 6.2 Confirmar sin regresión: registro/login local y Google siguen creando sesión; `replaceAlbumFavorites` / diario / favoritos intactos; `auth-pages.test` y `layout.test` en verde
- [x] 6.3 Verificación: guard de `/welcome` sin sesión → redirige a login (navegador). Efectos de `completeOnboarding` end-to-end contra la BD (script): 3 álbumes → 3 `user_album_pin` + 3 `favorite`, `onboarded_at` fijado, **0 `rating` y 0 `listen_entry` creados** (IQ5), idempotencia confirmada (2ª llamada no re-siembra). El recorrido de la UI como usuario nuevo logueado no se ejecutó por la restricción de crear cuentas en el navegador-agente; queda cubierto por los tests de servicio/ruta/composición

## 7. Docs

- [x] 7.1 `docs/05-features/` — nuevo doc (o sección) de onboarding de dos puertas: qué escribe cada puerta, salteable, una sola vez, relación con Álbumes favoritos (IQ5) y con el onboarding social de Inicio
- [x] 7.2 `docs/03-data/sql-model.md`: `app_user.onboarded_at`
- [x] 7.3 `docs/04-api/contracts.md`: `POST /api/me/onboarding`

## 8. Cierre

- [x] 8.1 `openspec validate add-two-door-onboarding --strict` pasa
- [x] 8.2 `typecheck`, `lint`, `test`, `build` en verde
- [ ] 8.3 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
