## 1. Migración y schema

- [x] 1.1 `drizzle/0017_review.sql`: `CREATE TABLE review` con `id`, `user_id` (FK `ON DELETE CASCADE`), `artist_id` / `release_group_id` / `recording_id` (FK nullable `ON DELETE CASCADE`), `title` (nullable), `body`, `created_at`, `updated_at`
- [x] 1.2 CHECKs en la migración: `num_nonnulls(artist_id, release_group_id, recording_id) = 1`, `title IS NULL OR char_length(title) BETWEEN 1 AND 120`, `char_length(body) BETWEEN 1 AND 10000`
- [x] 1.3 Índices: únicos parciales `uq_review_user_artist` / `uq_review_user_release_group` / `uq_review_user_recording` (`WHERE <col> IS NOT NULL`); lectura `idx_review_artist` / `idx_review_release_group` / `idx_review_recording`
- [x] 1.4 Trigger `trg_review_touch BEFORE UPDATE ... EXECUTE FUNCTION fn_touch_updated_at()`
- [x] 1.5 Espejo en `src/db/schema.ts` (`review` pgTable + `ReviewRow` type) con comentario de sincronización; correr la migración en local y verificar `\d review`

## 2. Servicio

- [x] 2.1 `REVIEWABLE_TARGET_TYPES = ["release-group"] as const` y helper `assertReviewableTarget(target)` que lanza `ApiError("REVIEW_TARGET_NOT_SUPPORTED", 400, ...)`
- [x] 2.2 `listReviews(target, page, pageSize)`: `LEFT JOIN` con `rating` del autor sobre el mismo target; devuelve `{ reviews, page, pageSize, hasNext }` con autor, título, cuerpo, `stars`/`detailedScore` vigentes (o null), `createdAt`, `updatedAt`; ordena por `created_at desc, id desc`
- [x] 2.3 `createOrReplaceReview(target, userId, { title?, body, stars?, detailedScore? })`: normaliza `title` `""`→`null`; transacción — si hay `stars`, `validateRating` + upsert de `rating` (reutiliza el upsert existente); si no hay `stars` ni `rating` previo → `ApiError("REVIEW_REQUIRES_RATING", 400)`; upsert de `review` con `onConflictDoUpdate` sobre el índice parcial del target
- [x] 2.4 `updateReview(reviewId, userId, { title?, body?, stars?, detailedScore? })`: valida propiedad (`PERMISSION_DENIED`), aplica cambios, upsert de `rating` si llegan `stars`, toca `updated_at` vía trigger
- [x] 2.5 `deleteReview(reviewId, userId)`: valida propiedad, `DELETE` físico; **no** toca `rating`
- [x] 2.6 Ubicar en `src/services/social.ts` o extraer `src/services/social/reviews.ts` reutilizando `resolveSocialTarget`, `targetValues`, `validateRating`

## 3. Zod y API

- [x] 3.1 `src/lib/api/schemas.ts`: `ReviewRequestSchema` (`title` opcional 1–120 —`""` y ausente equivalen a null—, `body` 1–10000, `stars?`, `detailedScore?`), `ReviewSchema` (con `user`, `title: string | null`, `rating: { stars, detailedScore } | null`, `createdAt`, `updatedAt`), `ReviewsResponseSchema`, `ReviewMutationResponseSchema`
- [x] 3.2 `src/app/api/catalog/[target]/[id]/reviews/route.ts`: `GET` (paginado, público) y `POST` (crear/reemplazar, `requireUser`, `assertReviewableTarget`)
- [x] 3.3 `src/app/api/catalog/reviews/[reviewId]/route.ts`: `PATCH` (editar) y `DELETE` (borrado físico), ambos `requireUser`
- [x] 3.4 Registrar los códigos de error nuevos (`REVIEW_REQUIRES_RATING`, `REVIEW_TARGET_NOT_SUPPORTED`, `REVIEW_NOT_FOUND`) donde el proyecto centraliza `ApiError.code` y `docs/04-api/errors.md`

## 4. UI — página de álbum

- [x] 4.1 Mensajes i18n `catalog` (`album`/`social`, es/en): encabezado de reseñas, labels del editor (cuerpo, título opcional con placeholder que no presione a titular, estrellas), estados vacíos, confirmación de borrado, textos de error localizados de los códigos nuevos
- [x] 4.2 `src/components/social/Reviews.tsx`: listado de reseñas de la comunidad (línea de metadato `autor · estrellas · «título» si existe`, cuerpo con plegado si es largo) + editor de reseña propia (cuerpo, título opcional, estrellas solo si no hay rating), con estados de carga/éxito/error/sesión
- [x] 4.3 Integrar en `SocialSection.tsx` y en la página de álbum, diferenciando visualmente "Reseñas" de "Comentarios" (secciones separadas; reseña con línea de metadato + cuerpo largo, comentario nota corta); una reseña sin título no deja hueco
- [x] 4.4 `getReviews` en `src/lib/api/catalog.ts` (o donde vivan los fetchers de catálogo) validando con `ReviewsResponseSchema`
- [x] 4.5 Verificación visual en el navegador: anónimo (lee, no escribe), autenticado sin rating (editor pide estrellas), autenticado con rating (editor sin estrellas), reseña con y sin título, editar, borrar, cambio de locale

## 5. Tests

- [x] 5.1 Servicio: crear con estrellas / crear sin estrellas con rating previo / crear sin estrellas sin rating (`REVIEW_REQUIRES_RATING`) / crear sin título (`title` null) / `""` normaliza a null / segunda reseña reemplaza / artista y canción rechazados (`REVIEW_TARGET_NOT_SUPPORTED`) / listado con `LEFT JOIN` devuelve rating vigente y null tras borrar rating / borrar reseña no toca rating / borrar rating deja la reseña con rating null / editar/borrar ajeno `PERMISSION_DENIED`
- [x] 5.2 API: rutas GET/POST/PATCH/DELETE con sesión y sin sesión; paginación inválida; body inválido; título de 121 caracteres rechazado
- [x] 5.3 Componente `Reviews.tsx`: render de listado con y sin título, editor condicional por rating, estados

## 6. Docs

- [x] 6.1 `docs/04-api/contracts.md`: endpoints nuevos con shape de request/response y códigos de error
- [x] 6.2 `docs/03-data/sql-model.md`: tabla `review` (propósito, restricciones, relación con `rating`, borrado físico)
- [x] 6.3 Nota en `docs/` de que la integración con el feed es un cambio posterior (Fase 2 de `redefine-content-hierarchy`)

## 7. Cierre

- [x] 7.1 `openspec validate add-album-review --strict` pasa
- [x] 7.2 `typecheck`, `lint`, `test`, `build` en verde
- [x] 7.3 Confirmar que ningún consumidor del feed asume que `review` es un `kind` válido (no lo es en esta versión)
- [x] 7.4 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
