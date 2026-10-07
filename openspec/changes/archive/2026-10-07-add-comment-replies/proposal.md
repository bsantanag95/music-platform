## Why

Con los temas de `add-artist-comment-topics`, la sección Comentarios de un artista ya se ordena por
asunto, pero sigue siendo una lista plana: quien abre "Mejor álbum???" no puede recibir respuestas
legibles, solo más comentarios sueltos sin saber a quién contestan. Para que un tema funcione como
conversación hace falta poder responder.

## What Changes

- Un comentario de artista puede recibir **respuestas de un solo nivel**. Responder a una respuesta
  la cuelga de la misma raíz (no hay anidamiento profundo).
- Las respuestas **heredan el tema de su raíz** y no tienen tema propio.
- Solo los comentarios de **artista** admiten respuestas por ahora. Álbum y Canción no cambian; la
  restricción vive en el servicio, no en el esquema, para habilitarlos después sin migración.
- Las respuestas **no generan entradas propias** en el feed ni en la actividad de la comunidad, ni
  aparecen en "Comentarios populares" de Inicio: esas superficies siguen mostrando solo raíces.
- Las respuestas reciben likes, edición, borrado, reportes, bloqueos y moderación como cualquier
  comentario. Borrar o moderar una raíz arrastra a sus respuestas.
- Cada comentario raíz de artista indica cuántas respuestas visibles tiene; las respuestas se cargan
  al abrirlo y se leen de la más antigua a la más reciente.
- Nuevos: `POST/GET /api/catalog/comments/{commentId}/replies` y `replyCount` en el comentario.
- Migración `0066_comment_replies.sql`: `parent_id` autorreferenciado con `ON DELETE CASCADE`, índice
  y relajación de `chk_comment_artist_topic_required` (creada en `add-artist-comment-topics`) para que
  una respuesta pueda tener `topic` nulo.
- ADR nuevo de respuestas de un nivel; se actualiza la nota de "Hilos" en `docs/05-features/home.md`.
- **Notificaciones: fuera de alcance.** Quien publica un tema no recibe aviso de las respuestas
  (riesgo conocido; ver diseño).

## Capabilities

### New Capabilities
- `comment-replies`: respuestas de un nivel a comentarios de artista (estructura, herencia de tema,
  listado, límites, visibilidad en las demás superficies).

### Modified Capabilities
- `activity-feed`: las respuestas no generan entradas de feed ni de actividad de comunidad.
- `home`: "Comentarios populares" cuenta y muestra solo comentarios raíz.
- `comment-likes`: los likes se pueden dar también a respuestas, con las mismas reglas.

## Impact

- **Dependencia:** requiere `add-artist-comment-topics` aplicado y archivado primero (columna
  `topic`, `COMMENT_TOPICS`, el componente `Comments` con temas). Hasta entonces los deltas de este
  cambio no tocan la capability `artist-comment-topics`, que aún no existe en `openspec/specs/`.
- **BD:** `drizzle/0066_comment_replies.sql`; `src/db/schema.ts`; `docs/03-data/sql-model.md`.
- **Servicios:** `src/services/social.ts` (raíces vs respuestas, `replyCount`, crear/listar
  respuestas), `feed.ts`, `community-activity.ts`, `home.ts`, `comment-likes.ts`,
  `moderation*.ts`, `profiles/data-export.ts`.
- **API:** nuevas rutas bajo `/api/catalog/comments/{commentId}/replies`; `schemas.ts`;
  `docs/04-api/contracts.md`, `errors.md`.
- **UI:** `Comments.tsx` (hilo desplegable, formulario de respuesta), `messages/{es,en}`.
- **Docs:** `docs/05-features/home.md`, ADR nuevo, `docs/02-architecture/adr/`.
- Sin dependencias nuevas.

## Goals

- Poder responder a un tema de un artista y leer la conversación en orden, sin salir de la página.
- Que nada que hoy muestra "comentarios" empiece a mostrar respuestas por accidente.
- Dejar la estructura lista para notificaciones futuras sin construirlas ahora.

## Non-Goals

- **Notificaciones** de respuestas (llegarán después; se derivarán de `parent_id`).
- Respuestas en comentarios de álbum o de canción.
- Anidamiento de más de un nivel, menciones (`@usuario`) y citas.
- Hilos con título, orden por actividad o foro completo.
- Cambiar el tema de un hilo.
