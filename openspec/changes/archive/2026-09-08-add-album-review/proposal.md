## Why

La dirección `redefine-content-hierarchy` (D4) define la **reseña** como la superficie
crítica del álbum: un texto elaborado con título, rating asociado, ciclo de vida propio
(editable, destacable, con fecha de publicación) y peso social alto — distinta del
`comment`, que es una unidad conversacional corta. Hoy no existe: lo más parecido es un
`comment` sin título, sin rating y sin jerarquía. Sin un objeto reseña real, "el álbum
como unidad de crítica" no se sostiene y el producto no se diferencia de un servicio de
streaming.

Es la primera pieza de la **Fase 0** de `redefine-content-hierarchy`, después de
`canonicalize-release-group` (ya archivado).

## What Changes

- **Nueva entidad `review`** con la **misma forma de target que el resto de tablas
  sociales**: tres FK nullable (`artist_id`, `release_group_id`, `recording_id`) +
  `CHECK (num_nonnulls(...) = 1)`, igual que `rating`, `comment`, `favorite` y
  `listen_entry`. **No** es `target_type`/`target_id` polimórfico. Campos:
  `id`, `user_id`, target, `title` (**opcional**, 1–120), `body` (1–10000),
  `created_at`, `updated_at`.
- **Título opcional y secundario** (D7): no es un encabezado. Se muestra en la línea de
  metadato de la reseña — `Reseña de @usuario ★★★★½ · «Título»`, patrón Letterboxd — y
  solo cuando existe. Evita la fricción de obligar a titular; quien quiere, lo aprovecha.
- **Una reseña vigente por (usuario, target)**: índices únicos parciales por columna, igual
  que `rating`. La reseña es **editable**, no append-only (D4).
- **La reseña siempre lleva rating** (D4): crear o editar una reseña exige que exista un
  `rating` propio para ese target. El endpoint acepta `stars` (+ `detailedScore` opcional)
  en el mismo request y hace **upsert del `rating`**; si no se envían y no hay rating
  previo, responde error de validación localizado. El `rating` sigue siendo la única
  fuente de verdad de la valoración (la reseña **no** duplica `stars`).
- **Restricción de Fase 1 en la capa de validación, no en el esquema**: la API de
  escritura de reseñas **solo acepta `release-group`** como target; `artist` y `recording`
  responden un error localizado ("las reseñas de artista y canción llegan más adelante").
  El esquema ya las soporta — habilitarlas después es levantar la restricción, **sin
  migración**.
- **Endpoints REST** espejo de comentarios:
  - `GET /api/catalog/[target]/[id]/reviews` — listado paginado con autor, rating vigente
    del autor y fechas.
  - `POST /api/catalog/[target]/[id]/reviews` — crear/reemplazar la reseña propia
    (idempotente por target).
  - `PATCH /api/catalog/reviews/[reviewId]` — editar título/cuerpo (y opcionalmente el
    rating) de la reseña propia.
  - `DELETE /api/catalog/reviews/[reviewId]` — borrado físico de la reseña propia; **no**
    toca el `rating`.
- **Borrado físico**, sin `deleted_at` ni historial — mismo criterio que `rating` y
  `comment` (ADR 0009).
- **Página de álbum**: el área social reservada (`catalog-album` → "Acciones sociales del
  álbum") incorpora las reseñas de la comunidad y el editor de reseña propia
  (cuerpo + estrellas si aún no valoró, título opcional) como acción primaria, junto a
  rating y comentarios.

### Non-Goals

- **Integración con el feed.** `review` **no** entra en `activity-feed` en este cambio.
  La composición, visibilidad y —sobre todo— la jerarquía de presentación del feed se
  rediseñan en la Fase 2 de `redefine-content-hierarchy` (tiers por intención), y la
  reseña se suma ahí como entrada de Tier 1. Meterla ahora obligaría a reproducir dos
  requisitos densos de `activity-feed` con ~15 escenarios para un tratamiento provisional.
  En Fase 1 la reseña se ve en la página de álbum (lectura pública) y —cuando llegue la
  reorganización de perfil— como reseña destacada del autor.
- Reseñas de artista y canción como superficie visible (el esquema las soporta; la UI y la
  API las difieren).
- Reacciones o comentarios **sobre** una reseña (D4 los contempla a futuro; no en Fase 1).
- Reseñas destacadas en el perfil (parte de la reorganización de perfil de Fase 1).
- Migrar `comment` ni cambiar su comportamiento.

## Capabilities

### New Capabilities

- `album-review`: la entidad reseña (forma de target de 3 FK nullable + CHECK, una vigente
  por usuario/target, editable), su acoplamiento obligatorio con el `rating`, sus
  endpoints, el borrado físico y la restricción de escritura a `release-group` en Fase 1.

### Modified Capabilities

- `catalog-album`: el área social reservada del detalle de álbum incorpora la lectura
  pública de reseñas y el editor de reseña propia para usuarios autenticados.

## Impact

- **Migración SQL nueva** (`0017_review.sql`): `CREATE TABLE review` con las 3 FK nullable
  `ON DELETE CASCADE`, `CHECK (num_nonnulls(...) = 1)`, `CHECK (title IS NULL OR
  char_length(title) BETWEEN 1 AND 120)`, `CHECK (char_length(body) BETWEEN 1 AND 10000)`,
  índices únicos parciales `uq_review_user_{artist,release_group,recording}` y de lectura
  por target, trigger `fn_touch_updated_at`. Espejo en `src/db/schema.ts`.
- **Servicio**: `src/services/social.ts` (o un `src/services/social/reviews.ts` nuevo) —
  `listReviews`, `createOrReplaceReview`, `updateReview`, `deleteReview`, reutilizando
  `resolveSocialTarget`, `targetValues`, `validateRating` y el upsert de `rating`
  existentes.
- **API**: rutas nuevas bajo `src/app/api/catalog/[target]/[id]/reviews/` y
  `src/app/api/catalog/reviews/[reviewId]/`; schemas Zod en `src/lib/api/schemas.ts`
  (`ReviewSchema`, `ReviewRequestSchema`, `ReviewsResponseSchema`).
- **UI**: `src/components/social/` (nuevo `Reviews.tsx` / editor), integración en
  `SocialSection.tsx` y en la página de álbum; mensajes i18n en el namespace `catalog`
  (`album`/`social`).
- **Docs**: `docs/04-api/contracts.md` (endpoints nuevos), `docs/03-data/sql-model.md`
  (tabla `review`), y `docs/02-architecture/code-walkthrough.md` si corresponde.
- **Sin cambios** en `rating`, `comment`, la resolución de carátula ni el modelo de
  audiencias.
