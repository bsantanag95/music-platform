## Context

Tras `add-artist-comment-topics`, `comment` tiene `topic` (obligatorio en artista, nulo en el resto)
y tres `CHECK` con nombre. Toda la lógica de comentarios asume una lista plana: `listComments`, el
feed, la actividad de la comunidad, "Comentarios populares", los likes, la moderación, los reportes
y la exportación de datos leen `comment` sin distinguir raíces de otra cosa. No existen
notificaciones. El borrado es físico (ADR 0009) y los comentarios cuelgan de cuentas con
`ON DELETE CASCADE`.

## Goals / Non-Goals

**Goals:** respuestas de un nivel en artista, con tema heredado; ninguna superficie existente las
muestra por accidente; estructura apta para notificaciones futuras.

**Non-Goals:** notificaciones, álbum/canción, anidamiento profundo, menciones, hilos con título.

## Decisions

### D1. `parent_id` autorreferenciado, mismo `comment`
`parent_id UUID NULL REFERENCES comment(id) ON DELETE CASCADE`. Una respuesta es una fila de
`comment` con padre. **Alternativa:** tabla `comment_reply` — duplica likes, reportes, moderación,
bloqueos y exportación, que ya referencian `comment.id`. Con la misma tabla todo eso funciona sin
tocarlo. El `ON DELETE CASCADE` encaja con el borrado físico del ADR 0009: borrar una raíz borra sus
respuestas y los likes de ambas.

### D2. Un solo nivel, normalizado en el servidor
Una respuesta siempre tiene como padre una **raíz** (`parent_id IS NULL`). Si el cliente responde a
una respuesta, el servicio resuelve la raíz de esa respuesta y cuelga la nueva de ella. Así la UI es
una lista plana de respuestas bajo cada raíz y no hay árboles que paginar. **Alternativa:** niveles
ilimitados (CTE recursivo, sangrías) — mucho más costo de lectura y de moderación, sin una necesidad
que lo pida.

### D3. La respuesta copia el objetivo de su raíz
La respuesta guarda el mismo `artist_id` que su raíz (y `release_group_id`/`recording_id` nulos).
Mantiene los índices por objetivo y las uniones existentes funcionando y permite borrar por
objetivo. Que coincida con la raíz lo impone el servicio al crear (la respuesta lo copia, nunca lo
recibe del cliente). Un `CHECK` entre filas no es posible; un trigger sería sobreingeniería para un
valor que solo el servicio escribe.

### D4. Tema heredado, `topic` nulo en la respuesta
La respuesta tiene `topic NULL`; su tema es el de la raíz. **Alternativa:** copiar el tema a cada
respuesta — dato duplicado que habría que mantener si algún día el tema se pudiera cambiar. La
migración `0066` recrea solo `chk_comment_artist_topic_required` como
`artist_id IS NULL OR topic IS NOT NULL OR parent_id IS NOT NULL`, y añade
`chk_comment_reply_no_topic : parent_id IS NULL OR topic IS NULL` (una respuesta no puede tener
tema propio). Los otros dos `CHECK` de `add-artist-comment-topics` no cambian.

### D5. "Solo artista" en el servicio, no en el esquema
`createReply` rechaza con `REPLIES_NOT_ALLOWED` (400) si la raíz no es de artista. Es el mismo
patrón que las reseñas (solo álbum, en la validación). Habilitar Álbum/Canción más adelante es
cambiar una condición, sin migración.

### D6. Raíces y respuestas se leen con helpers distintos
Para evitar la clase de bug que describe el ADR 0009 ("una query nueva olvida el filtro"), todas las
lecturas "de comentarios como contenido de primer nivel" pasan por un único helper
`rootCommentsOnly()` (`parent_id IS NULL`) en lugar de repetir la condición a mano: `listComments`,
feed, actividad de comunidad y "Comentarios populares". Las lecturas que **sí** deben ver
respuestas (likes, moderación, reportes, exportación, edición, borrado) leen `comment` completo y lo
dicen en el código. Cada superficie lleva una prueba que inserta una respuesta y comprueba que no
aparece donde no debe.

### D7. Listado: raíces paginadas con `replyCount`; respuestas bajo demanda
`GET .../comments` sigue devolviendo solo raíces, más recientes primero, con la paginación y el
filtro por tema de `add-artist-comment-topics`, y suma `replyCount` (respuestas visibles, de
cuentas no desactivadas y no ocultas por moderación). Las respuestas salen de
`GET /api/catalog/comments/{commentId}/replies` (paginado), **de la más antigua a la más reciente**:
una conversación se lee en orden. **Alternativa:** incluir las respuestas dentro de cada raíz en el
listado — una consulta más pesada y una página cuyo tamaño ya no es predecible. El cliente pide el
hilo al desplegarlo (cliente HTTP único de `src/lib/api`).

### D8. Publicar una respuesta
`POST /api/catalog/comments/{commentId}/replies` con `{ body }`. Requiere sesión y que la actividad
social no esté suspendida, igual que comentar. Rechaza una raíz inexistente u oculta
(`COMMENT_NOT_FOUND`, 404). Devuelve `201 { comment }` con `parentId` y el tema heredado de la
raíz (la respuesta no lo guarda, la serialización lo calcula con la raíz).

### D9. Ninguna actividad propia de las respuestas
Feed, actividad de la comunidad y "Comentarios populares" siguen mostrando solo raíces (D6). Una
respuesta no crea una entrada de feed "respondió a…". Razón: un usuario muy activo respondiendo
saturaría el feed de quienes lo siguen; el debate se lee dentro del artista.

### D10. Derivación futura de notificaciones
No se crea ninguna tabla ahora. "Te respondieron" se podrá derivar de las respuestas cuyo padre
pertenece a la persona (`parent_id` → autor de la raíz). La estructura no necesita datos extra.

### D11. Moderación y bloqueos igual que en una raíz
Una respuesta oculta por moderación no se lista ni cuenta en `replyCount`. Una raíz oculta no
muestra su hilo (la ruta de respuestas devuelve `COMMENT_NOT_FOUND`). Los bloqueos y las cuentas
desactivadas se aplican a las respuestas como hoy a los comentarios. Un reporte sobre una respuesta
usa `targetType: "comment"`.

## Risks / Trade-offs

- **[Sin notificaciones, el autor de un tema no se entera de las respuestas]** → riesgo aceptado y
  anotado: el debate depende de que la gente vuelva a la página. Es el principal motivo para
  priorizar las notificaciones después de este cambio.
- **[Una query nueva olvida el filtro de raíces y muestra respuestas sueltas]** → helper único
  `rootCommentsOnly()` + una prueba por superficie (D6).
- **[Hilos largos]** → la ruta de respuestas es paginada; sin tope de respuestas por raíz hasta que
  haya señal de abuso.
- **[Respuesta con objetivo distinto del de su raíz]** → el servicio copia el objetivo de la raíz y
  nunca lo recibe del cliente (D3).
- **[Moderar una raíz oculta conversaciones de terceros]** → es la semántica esperada del borrado en
  cascada; las respuestas se pueden moderar individualmente sin tocar la raíz.

## Migration Plan

1. Aplicar `0066` después de `0065`: columna `parent_id` nullable (las filas existentes quedan
   como raíces), índice parcial `idx_comment_parent (parent_id, created_at) WHERE parent_id IS NOT
   NULL`, recreación del `CHECK` de tema requerido y el nuevo `chk_comment_reply_no_topic`.
2. Aditiva: el código anterior sigue funcionando (todas las filas son raíces). Rollback = revertir el
   código; la columna puede quedarse.

## Open Questions

- ¿Tope de respuestas por raíz o de respuestas por persona y hora, si aparece abuso?
- ¿Habilitar respuestas en Álbum y Canción? Decisión de producto aparte (la conversación allí es
  más general que un tema).
- Forma del "te respondieron" cuando existan notificaciones.
