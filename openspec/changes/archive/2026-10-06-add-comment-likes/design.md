## Context

Los comentarios (`comment`) se borran físicamente (ADR 0009), se moderan con `moderation_status`
y su API vive en `/api/catalog/comments/{commentId}`. La actividad social pasa por
`requireUser` + `requireSocialActivityAllowed`; los bloqueos viven en `user_block`
(`isBlockedBetween`, y `NOT_BLOCKED_SQL` en `home.ts`). La cuenta desactivada se filtra con
`activeUserCondition()`. `listPopularComments` hoy ordena por `length(body)`.

## Goals / Non-Goals

**Goals:** likes reales, anónimos y con umbral de cifra; ranking real en Inicio; UI optimista.

**Non-Goals:** hilos, likes en reseñas, notificaciones, mostrar quién likeó, cache del ranking.

## Decisions

1. **`COUNT(*)` en vez de `comment.like_count` + trigger.** El PK `(comment_id, user_id)` ya
   indexa por `comment_id` y basta a esta escala; evita deriva y el conteo debe excluir cuentas
   desactivadas, lo que un contador denormalizado complicaría. Se puede denormalizar luego sin
   cambiar contratos.
2. **Esquema:** `comment_like(comment_id uuid FK comment ON DELETE CASCADE, user_id uuid FK
   app_user ON DELETE CASCADE, created_at)`, PK `(comment_id, user_id)` e índice por `user_id`
   (cascada de cuentas / `likedByMe`). Sin id propio: nada la referencia. `created_at` es solo
   contable; nunca se expone.
3. **`PUT`/`DELETE`** en vez de `POST`/`DELETE`: ambos idempotentes (`INSERT … ON CONFLICT DO
   NOTHING`; `DELETE` sin error si no existe). Ruta `/api/catalog/comments/{commentId}/like` por
   coherencia con la edición/borrado existentes (el brief original decía `/api/comments/[id]/like`).
   Respuesta `{ liked, likeCount }` con `likeCount` ya umbralizado.
4. **Orden de validaciones del `PUT`:** UUID → `requireUser` → `requireSocialActivityAllowed` →
   comentario visible existe (404) → no es el propio (403) → sin bloqueo (`BLOCKED`) → insert.
   `DELETE` omite suspensión, bloqueo y propio.
5. **Umbral en el servicio, no en la UI:** `thresholdedLikeCount(n)` (constante
   `COMMENT_LIKE_DISPLAY_THRESHOLD = 3`) se aplica en `listComments` y en la respuesta del endpoint, de
   modo que el número real bajo el umbral nunca sale del servidor. El ranking de Inicio usa el conteo
   real internamente y solo expone la cifra umbralizada.
6. **`listComments`** añade una subconsulta correlacionada del conteo (join con usuario activo) y
   `EXISTS` para `likedByMe` con `viewerId` opcional (el `GET` resuelve `getCurrentUser` sin exigir
   sesión). Las páginas que arman `initial` pasan el visitante.
7. **`listPopularComments(viewerId?)`:** las tres consultas añaden el conteo, filtran
   `moderation_status='visible'` y `NOT_BLOCKED_SQL` si hay visitante, y ordenan por
   `likes DESC, length(body) DESC, created_at DESC`. Se mantiene el pool `perType * 3` y el `slice`.
8. **UI optimista:** estado local por comentario (`liked`, `likeCount`); al pulsar el botón cambia
   al instante, se llama a `likeComment`/`unlikeComment` (cliente en `src/lib/api/social.ts`,
   validado con Zod) y la cifra visible se actualiza con el `likeCount` de la respuesta (ya
   umbralizado, así que no se filtra el número real). Ante `ApiError` se revierte y se muestra
   `errors.<code>.description`.

## Risks / Trade-offs

- [Subconsulta de conteo en cada lista/ranking] → cubierta por el PK; volumen bajo; reevaluar con
  contador denormalizado si el ranking se encarece.
- [Inferir quién likeó] → solo sale el propio `likedByMe`; nunca ids ni timestamps.
- [Auto-like solo en servicio] → la regla cruza tablas y no puede ser `CHECK`; se cubre con test y smoke.
- [Gamificación] → umbral, sin auto-like, sin identidades, sin ranking por persona.

## Migration Plan

`0062_comment_like.sql` crea tabla e índice; sin backfill. Reversión: `DROP TABLE comment_like` y
revertir el código (el ranking vuelve a `length(body)`).
