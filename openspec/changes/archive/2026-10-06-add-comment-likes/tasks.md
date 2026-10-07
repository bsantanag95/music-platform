## 1. Base de datos

- [x] 1.1 `drizzle/0062_comment_like.sql`: tabla, PK `(comment_id, user_id)`, FKs en cascada, índice por `user_id`
- [x] 1.2 Espejo en `src/db/schema.ts` (+ tipo `CommentLikeRow`) y `docs/03-data/sql-model.md`
- [x] 1.3 Aplicar la migración en una BD de scratch

## 2. Servicio y API

- [x] 2.1 `src/services/social/comment-likes.ts`: `likeComment`, `unlikeComment`, `thresholdedLikeCount`, constante de umbral
- [x] 2.2 Ruta `src/app/api/catalog/comments/[commentId]/like/route.ts` (`PUT`/`DELETE`) con `withErrorHandling`
- [x] 2.3 `listComments` con `likeCount` (umbralizado) y `likedByMe`; `GET` resuelve el visitante opcional
- [x] 2.4 Esquemas Zod (`CommentSchema`, respuesta del like), cliente `src/lib/api/social.ts`, códigos de error si falta alguno
- [x] 2.5 Tests unitarios del servicio y de la ruta (orden de validaciones, idempotencia, umbral, bloqueo, suspensión, propio, oculto)

## 3. UI de comentarios

- [x] 3.1 Botón de like con `aria-pressed` y estado optimista en `Comments.tsx`; cifra sin botón para anónimo y autor
- [x] 3.2 Claves i18n (`messages/*`) y tests de componente (optimista, reversión, anónimo)

## 4. Comentarios populares

- [x] 4.1 `listPopularComments(viewerId?)` por likes reales, visibles y sin bloqueos; actualizar JSDoc
- [x] 4.2 Pasar el visitante desde `AnonymousHome`/`AuthenticatedHome`; actualizar sus tests
- [x] 4.3 `PopularCommentsTabs`: pill `♡ N` (desde 3) con `aria-label` `home.popularCommentsLikeWord`; tests

## 5. Docs y verificación

- [x] 5.1 `docs/04-api/contracts.md`, `errors.md` y `docs/05-features/home.md` (estado, decisiones y retirar «sprint futuro»)
- [x] 5.2 `scripts/smoke-test-comment-likes.ts` (fixtures `smoke_like_*`, limpieza) y su nota de limpieza en `AGENTS.md`
- [x] 5.3 Correr el smoke test contra BD de scratch
- [x] 5.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
