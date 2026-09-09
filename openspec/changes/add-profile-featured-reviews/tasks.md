## 1. Servicio

- [x] 1.1 `src/services/profiles/reviews.ts` — constantes `PROFILE_REVIEWS_MAX = 4` y el nº de líneas de recorte (o dejar el recorte al componente vía `line-clamp-4`)
- [x] 1.2 Tipo `ProfileReview` (`id`, `title: string | null`, `body`, `stars: string | null`, `detailedScore: number | null`, `updatedAt: string`, `album: { id; title; artistName; coverThumbUrl }`)
- [x] 1.3 `getProfileReviews = cache(async (username, viewerId) => …)` — `getProfileByUsername(username, viewerId)`; si `!profile.accessible` → `null`
- [x] 1.4 Consulta: `review` de `profile.id` con `releaseGroupId` no nulo, `innerJoin release_group`, artista acreditado por subquery escalar sobre `credit` (nombre de tabla explícito, `"release_group"."id"`), `leftJoin rating` por `(userId, releaseGroupId)`; `orderBy(desc(review.updatedAt), desc(review.id))`; `limit(PROFILE_REVIEWS_MAX + 1)`
- [x] 1.5 `total`: `count(*)` de reseñas del dueño con `releaseGroupId` no nulo (query aparte, chico); devolver `{ reviews: rows.slice(0, MAX), total }` o `null`
- [x] 1.6 Tests (`reviews.test.ts` en `src/services/profiles/`, mock de `db` estilo `in-rotation.test.ts` / `feed.test.ts`): perfil no accesible → `null`; devuelve hasta `MAX` ordenadas por `updatedAt` desc; `total` refleja el recuento real; incluye el rating asociado (o `null` si falta)

## 2. Presentación

- [x] 2.1 `src/components/profiles/ProfileReviews.tsx` — Server Component `async function ProfileReviews({ data }: { data: { reviews: ProfileReview[]; total: number } | null })`; si `data` es `null` o `reviews` vacío → `null`
- [x] 2.2 Encabezado `t("reviews.title")` ("Reseñas"); por reseña una tarjeta: `CoverThumb` + título del álbum enlazado (`/album/{id}`) + artista + `FeedRatingMeter` (o el meter del catálogo) con el valor numérico + `title` de la reseña si existe + `body` con `line-clamp-4`
- [x] 2.3 Sin botón de expandir; el enlace al álbum es "leer completa" (o el título del álbum hace de enlace y alcanza)
- [x] 2.4 Si `total > reviews.length`: línea informativa `t("reviews.andMore", { count: total - reviews.length })`, sin enlace
- [x] 2.5 Tests (`ProfileReviews.test.tsx`): colapsa con `null` y con lista vacía; renderiza N tarjetas con álbum enlazado, rating y cuerpo recortado; muestra "y N más" cuando corresponde

## 3. Composición del perfil

- [x] 3.1 `src/app/[locale]/users/[username]/sections.tsx` — `FeaturedReviewsSection({ username, viewerId })` que resuelve `getProfileReviews` y monta `<ProfileReviews>`
- [x] 3.2 `src/app/[locale]/users/[username]/page.tsx` — `<Streamed><FeaturedReviewsSection … /></Streamed>` en la **vista pública de dos columnas** (columna principal, después de `PinnedSection`, antes de `InRotationSection`)
- [x] 3.3 Idem en la **vista del dueño** (después de `ShowcaseSection`, antes de `InRotationSection`)
- [x] 3.4 Ajustar los tests de composición del perfil (`page.test.tsx` / `sections.test.tsx`) para el nuevo `FeaturedReviewsSection` (mock en `./sections`, `vi.mock` del servicio, aserción de orden)

## 4. i18n y docs

- [x] 4.1 `messages/{es,en}/users.json` — bloque `reviews`: `title` ("Reseñas" / "Reviews"), `andMore` ("y {count} más" / "and {count} more"), cualquier rótulo de la tarjeta
- [x] 4.2 Paridad y registro de namespace (`messages.*` tests ya cubren `users`)
- [x] 4.3 `docs/05-features/user-profile.md` — la sección "Reseñas": qué muestra, orden por última edición, tope, visibilidad por accesibilidad del perfil, ubicación en el orden vertical (después de destacados, antes de "En rotación"), automática (sin curación)

## 5. Cierre

- [x] 5.1 `openspec validate add-profile-featured-reviews --strict` pasa
- [x] 5.2 `typecheck`, `lint`, `test` (1209 pasan), `build` en verde (una corrida de `next build` falló transitoriamente en `collect page data`, sin relación con el cambio — patrón flaky ya visto; re-corrida limpia); `getProfileReviews` verificado contra la BD de desarrollo
- [x] 5.3 Verificación cubierta por `reviews.test.ts` (5), `ProfileReviews.test.tsx` (5), `sections.test.tsx` (FeaturedReviewsSection) y `page.test.tsx` (orden: Reseñas entre destacados y En rotación, dueño y público) + comprobación contra la BD de desarrollo. Walk autenticado no factible en este entorno
- [ ] 5.4 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
