## Why

La página de artista cierra con "Notas de la comunidad", pero hoy es una caja de comentarios con
otro nombre: `variant="notes"` solo cambia el título, el texto de ayuda y los botones. No hay
ninguna diferencia de datos ni de comportamiento respecto de Álbum y Canción. Un artista, a
diferencia de una obra, ofrece varios asuntos de conversación (por dónde empezar, sus discos, sus
canciones), y mezclarlos en una sola lista cronológica los vuelve ilegibles.

## What Changes

- Los comentarios **de artista** llevan un **tema**: `start` ("Para empezar", pensado para quien
  llega al artista), `albums` ("Álbumes"), `songs` ("Canciones") y `general` ("General", por
  defecto). Los comentarios de álbum y de canción no cambian.
- La sección del final de la página de artista pasa a llamarse **Comentarios**, con filtro por tema
  (Todos + un chip por tema) y selector de tema al escribir. Reemplaza a "Notas de la comunidad".
- Las notas existentes de artista pasan al tema `general`.
- `GET /api/catalog/artist/{id}/comments` acepta `topic` opcional; `POST` acepta `topic` (por
  defecto `general`). Cada comentario de artista devuelve su `topic`.
- Las entradas del feed, la actividad de la comunidad y "Comentarios populares" de Inicio muestran
  el tema de los comentarios de artista.
- Se elimina `variant="notes"` de `Comments` y las claves i18n `notes*` / `noNotes` / `loginToNote`.
- **BREAKING (interno):** `Comments` pierde la prop `variant`; el contrato REST solo añade campos y
  un parámetro opcional, así que los clientes existentes siguen funcionando.

## Capabilities

### New Capabilities
- `artist-comment-topics`: tema de los comentarios de artista (catálogo cerrado, valor por
  defecto, filtro, inmutabilidad) y su presentación en la sección Comentarios.

### Modified Capabilities
- `catalog-artist`: la opinión sobre el artista deja de presentarse como "notas" y pasa a
  comentarios con tema.
- `artist-page-layout`: "Notas de la comunidad" pasa a "Comentarios" al final de la página.
- `activity-feed`: las entradas de comentario de artista muestran el tema.
- `home`: "Comentarios populares" muestra el tema en los comentarios de artista.

## Impact

- **BD:** migración nueva `0065_comment_topic.sql` (columna `comment.topic`, tres `CHECK`, índice);
  espejo en `src/db/schema.ts`; `docs/03-data/sql-model.md`.
- **Servicios:** `src/services/social.ts` (`listComments`, `createComment`, `serializeComment`),
  `src/services/feed/feed.ts`, `src/services/activity/community-activity.ts`,
  `src/services/home/home.ts`, `src/services/profiles/data-export.ts`.
- **API:** `src/app/api/catalog/[target]/[id]/comments/route.ts` y `src/lib/api/schemas.ts`;
  `docs/04-api/contracts.md`.
- **UI:** `src/components/social/Comments.tsx`, layout de artista, `messages/{es,en}/catalog.json`.
- **Docs:** `docs/05-features/catalog-browsing.md`, `docs/05-features/activity-feed.md`,
  `docs/05-features/home.md`.
- Sin dependencias nuevas.

## Goals

- Que la conversación sobre un artista se pueda ordenar por asunto sin cambiar el modelo de
  comentarios (sigue siendo la misma tabla, con likes, moderación y bloqueos intactos).
- Dejar las restricciones de la base listas para que el cambio `add-comment-replies` solo tenga que
  relajar una.

## Non-Goals

- **Respuestas / debate:** es el cambio `add-comment-replies`, que depende de este.
- Notificaciones de cualquier tipo.
- Temas para comentarios de álbum o de canción.
- Cambiar el tema de un comentario ya publicado.
- Temas `Integrantes`, `Shows` o `Lanzamientos` (descartados por ahora).
- Adjuntar un álbum a una recomendación de "Para empezar" (posible evolución).
