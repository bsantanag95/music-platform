## 0. Prerrequisito

- [x] 0.1 Confirmar que `add-artist-comment-topics` está aplicado y archivado (columna `topic`, `COMMENT_TOPICS`, `Comments` con temas) y que `0065` ya está en `_migrations`; comprobar que `0066` siga libre

## 1. Base de datos

- [x] 1.1 Crear `drizzle/0066_comment_replies.sql`: `ADD COLUMN parent_id UUID REFERENCES comment (id) ON DELETE CASCADE`; índice parcial `idx_comment_parent (parent_id, created_at) WHERE parent_id IS NOT NULL`; `DROP CONSTRAINT chk_comment_artist_topic_required` y recrearlo como `artist_id IS NULL OR topic IS NOT NULL OR parent_id IS NOT NULL`; `ADD CONSTRAINT chk_comment_reply_no_topic CHECK (parent_id IS NULL OR topic IS NULL)`
- [x] 1.2 Reflejar `parentId` y los `CHECK` en `comment` de `src/db/schema.ts`
- [x] 1.3 Actualizar `docs/03-data/sql-model.md` (sección `comment`: `parent_id`, cascada, herencia de tema)

## 2. Servicio y API

- [x] 2.1 Helper único `rootCommentsOnly()` (`parent_id IS NULL`) y usarlo en `listComments`; documentar en el código qué lecturas necesitan ver respuestas y cuáles no
- [x] 2.2 `src/services/social.ts`: `createReply(rootId, userId, body)` (resuelve la raíz si recibe una respuesta, copia el objetivo, rechaza con `REPLIES_NOT_ALLOWED` si no es artista y con `COMMENT_NOT_FOUND` si la raíz no existe o está oculta); `listReplies(rootId, page, pageSize, viewerId)` (más antigua primero); `replyCount` en `listComments` (visibles, sin cuentas desactivadas)
- [x] 2.3 Rutas `GET/POST /api/catalog/comments/{commentId}/replies` con `withErrorHandling`, `await params`, sesión y suspensión social en `POST`
- [x] 2.4 `src/lib/api/schemas.ts` y `src/lib/api/social.ts`: `parentId`, `replyCount`, esquemas de la lista de respuestas, funciones cliente
- [x] 2.5 Registrar `REPLIES_NOT_ALLOWED` en `docs/04-api/errors.md` y `messages/{es,en}` (`errors.REPLIES_NOT_ALLOWED`)
- [x] 2.6 Actualizar `docs/04-api/contracts.md` (rutas nuevas, `replyCount`, `parentId`)
- [x] 2.7 Pruebas del servicio y de las rutas: reply a raíz, reply a reply, raíz inexistente/oculta, álbum, `replyCount` con ocultas y cuentas desactivadas, orden del hilo, edición, borrado en cascada, bloqueos, suspensión social

## 3. Otras superficies (nada debe mostrar respuestas por accidente)

- [x] 3.1 `src/services/feed/feed.ts` y `src/services/activity/community-activity.ts`: solo raíces vía `rootCommentsOnly()`; prueba con una respuesta insertada
- [x] 3.2 `src/services/home/home.ts` ("Comentarios populares"): solo raíces; prueba con una respuesta con más likes que cualquier raíz
- [x] 3.3 `src/services/social/comment-likes.ts`: confirmar que las respuestas se pueden likear con las mismas reglas; prueba
- [x] 3.4 `src/services/moderation.ts` / `moderation-queries.ts`: la cola y las acciones sobre un comentario cubren respuestas; prueba de ocultar una respuesta y una raíz
- [x] 3.5 `src/services/profiles/data-export.ts`: incluir `parentId` en la exportación de comentarios

## 4. Interfaz

- [x] 4.1 `src/components/social/Comments.tsx`: contador y botón "Ver N respuestas" por raíz (solo con `topics`), carga del hilo, lista de respuestas con sangría mínima y botón de like, formulario de respuesta con sesión, edición y borrado propios, actualización de `replyCount`
- [x] 4.2 `messages/{es,en}/catalog.json`: textos de hilo, respuesta, vacíos y errores
- [x] 4.3 Pruebas de `Comments` (desplegar, responder, responder a una respuesta cuelga de la raíz, sin controles en álbum/canción, accesibilidad: `aria-expanded` del hilo)

## 5. Documentación y ADR

- [x] 5.1 ADR nuevo "Respuestas de un nivel en comentarios de artista" (un nivel, misma tabla, tema heredado, solo artista en el servicio, sin actividad propia, notificaciones derivables); índice de ADR si existe
- [x] 5.2 `docs/05-features/home.md`: reemplazar la nota "Hilos… se discute cuando el paradigma gire…" por la decisión tomada y su alcance
- [x] 5.3 `docs/05-features/activity-feed.md`: las respuestas no generan entradas

## 6. Verificación

- [x] 6.1 Smoke test `scripts/smoke-test-comment-replies.ts` contra BD de scratch (`ALLOW_SMOKE_ON_REAL_DB=1`): migración, `CHECK`, cascada, `replyCount`, que feed/actividad/populares no muestran respuestas; borra sus fixtures (usuarios `smoke_reply_*`, artista sintético `5e0ce000-…`); documentar su limpieza en `AGENTS.md`
- [x] 6.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 6.3 Probar en el navegador un hilo de punta a punta en la página de artista (escritorio y móvil)
