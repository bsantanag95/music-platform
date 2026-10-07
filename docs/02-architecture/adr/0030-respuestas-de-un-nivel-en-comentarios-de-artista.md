# ADR 0030 — Respuestas de un nivel en comentarios de artista

## Estado

Aceptado (cambio `add-comment-replies`, 2026-10). Cierra la decisión de «hilos» (comentar un comentario) que
`add-comment-likes` había dejado fuera, solo para los comentarios de artista.

## Contexto

Con los temas de `add-artist-comment-topics` (sin ADR propio: es una columna), la sección Comentarios de un
artista se ordena por asunto, pero seguía siendo una lista plana: quien abre un tema («¿mejor álbum?») no puede
recibir respuestas legibles. Álbum y Canción, en cambio, tienen comentarios de opinión personal; allí responder no
es la misma conversación. No existen notificaciones.

## Decisión

- Una respuesta es una fila de `comment` con `parent_id` (`ON DELETE CASCADE`) que apunta a una **raíz**
  (`parent_id NULL`). **Un solo nivel**: responder a una respuesta cuelga la nueva de la misma raíz; el servicio sube
  a la raíz.
- La respuesta **copia el `artist_id`** de su raíz (lo fija el servicio, nunca el cliente) y **hereda el tema**: tiene
  `topic NULL`. `chk_comment_artist_topic_required` se recrea permitiendo `topic NULL` si hay `parent_id`, y
  `chk_comment_reply_no_topic` impide que una respuesta tenga tema propio.
- **Solo comentarios de artista** admiten respuestas, **validado en el servicio** (`REPLIES_NOT_ALLOWED`), no en el
  esquema: habilitar álbum/canción más adelante es cambiar una condición, sin migración. Mismo patrón que las reseñas.
- **Las respuestas no generan actividad propia**: ni feed, ni actividad de la comunidad, ni «Comentarios populares».
  Toda lectura de «comentarios como contenido de primer nivel» pasa por `rootCommentsOnly()`
  (`src/services/social/comment-roots.ts`); las lecturas que sí deben ver las respuestas (likes, moderación,
  reportes, exportación, edición, borrado, hilo) leen `comment` completo.
- El listado de la página devuelve **solo raíces**, con `replyCount` (respuestas visibles, sin las ocultas ni las de
  cuentas desactivadas); el hilo sale de `GET /api/catalog/comments/{id}/replies`, paginado, **de la más antigua a la
  más reciente**.
- Likes, reportes, moderación y bloqueos funcionan igual que en un comentario. Borrar o moderar una raíz arrastra al
  hilo (borrado físico, ADR 0009).
- **Sin notificaciones** en esta etapa. «Te respondieron» se derivará de `comment.parent_id` y del autor de la raíz,
  sin datos extra.

## Alternativas consideradas

- **Tabla `comment_reply` aparte:** duplica likes, reportes, moderación, bloqueos y exportación, que ya referencian
  `comment.id`.
- **Niveles ilimitados** (CTE recursivo, sangrías): mucho más costo de lectura y de moderación, sin una necesidad que
  lo pida.
- **Copiar el tema a cada respuesta:** dato duplicado que habría que mantener si algún día el tema se pudiera cambiar.
- **Incluir las respuestas dentro de cada raíz en el listado:** consulta más pesada y página de tamaño impredecible.
- **Hilos con título y orden por actividad (foro):** fuera de alcance; la plataforma es una biblioteca, no un foro.

## Consecuencias

- Una consulta nueva que lea `comment` como contenido de primer nivel y olvide `rootCommentsOnly()` mostraría
  respuestas sueltas (la misma clase de bug que el ADR 0009 evita con el borrado físico). Cada superficie lleva una
  prueba que inserta una respuesta y comprueba que no aparece.
- Sin notificaciones, quien publica un tema no se entera de las respuestas hasta volver a la página. Es el principal
  motivo para priorizarlas después.
- Sin tope de respuestas por raíz hasta que haya señal de abuso.
