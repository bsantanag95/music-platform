## Why

"Comentarios populares" de Inicio mostró un `♡ N` sintético y ordenaba por él; el 2026-10-06 se
retiró la cifra y el orden quedó como proxy (`length(body) DESC`) porque no existe ninguna señal
real de popularidad. Se decidió implementar likes reales en comentarios, con una forma de
producto acotada para no caer en gamificación (la subjetividad es el producto).

## What Changes

- Tabla `comment_like (comment_id, user_id)` con unicidad y `ON DELETE CASCADE` (migración `0062`).
- Endpoint `PUT`/`DELETE /api/catalog/comments/{commentId}/like` (idempotentes), solo con sesión.
  Se coloca junto a los demás endpoints de comentario (`/api/catalog/comments/{commentId}`).
- Reglas de producto: no se puede likear el propio comentario; la identidad de quién likeó no se
  expone nunca (ni al autor); la cifra `♡ N` solo se muestra desde 3 likes (el ranking usa el
  conteo real); la cifra es igual para todos, autor incluido.
- Likear es actividad social: respeta bloqueos, suspensión social y cuentas desactivadas.
- `Comments.tsx`: botón de like con estado optimista; `listComments` devuelve `likeCount`
  (nulo bajo el umbral) y `likedByMe`.
- `listPopularComments` ordena por likes reales, respeta bloqueos del visitante y oculta
  comentarios moderados; `PopularCommentsTabs` vuelve a mostrar la pill `♡ N`.
- Docs: `sql-model.md`, `contracts.md`, `errors.md`, `home.md`.
- Fuera de alcance: hilos (comentar un comentario), likes en reseñas, notificaciones de likes.

## Capabilities

### New Capabilities
- `comment-likes`: dar/quitar like a un comentario, privacidad, umbral de cifra, restricciones.

### Modified Capabilities
- `home`: el bloque "Comentarios populares" se rankea por likes reales y muestra la cifra desde el umbral.

## Impact

- BD: migración `0062_comment_like.sql`, `src/db/schema.ts`.
- Servicios: `src/services/social.ts` (o módulo nuevo `social/comment-likes.ts`), `src/services/home/home.ts`.
- API: nueva ruta + `src/lib/api/social.ts`, `schemas.ts` (`CommentSchema`, códigos de error).
- UI: `Comments.tsx`, `PopularCommentsTabs.tsx`, `messages/*`.
- Smoke test nuevo `scripts/smoke-test-comment-likes.ts`.
