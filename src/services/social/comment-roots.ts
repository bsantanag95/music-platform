import { isNull, sql } from "drizzle-orm";
import { comment } from "@/db/schema";
import type { CommentTopic } from "@/db/schema";

// Raíces y respuestas (openspec: add-comment-replies). `comment` guarda las dos cosas: una respuesta
// es una fila con `parent_id` apuntando a una raíz. Toda lectura que trate a los comentarios como
// contenido de primer nivel (listado de la página, feed, actividad de la comunidad, "Comentarios
// populares") DEBE filtrar con `rootCommentsOnly()`, en vez de repetir la condición a mano: una
// consulta nueva que lo olvide mostraría respuestas sueltas, sin su pregunta (mismo riesgo que
// describe el ADR 0009 con `deleted_at`).
//
// Las lecturas que SÍ deben ver las respuestas leen `comment` completo y lo dicen en el código:
// likes (`comment-likes.ts`), moderación y reportes (`moderation*.ts`), exportación de datos,
// edición y borrado (`social.ts`) y el hilo (`listReplies`).

/** Solo comentarios raíz (`parent_id IS NULL`). Requiere `comment` en el FROM. */
export const rootCommentsOnly = () => isNull(comment.parentId);

/**
 * Cantidad de respuestas visibles de la raíz: sin las ocultas por moderación ni las de cuentas
 * desactivadas. Correlacionada con `"comment"."id"` por literal (como `COMMENT_LIKE_COUNT_SQL`):
 * requiere `comment` en el FROM.
 */
export const COMMENT_REPLY_COUNT_SQL = sql<number>`(
  SELECT count(*)::int
  FROM comment rp
  JOIN app_user ru ON ru.id = rp.user_id
  WHERE rp.parent_id = "comment"."id"
    AND rp.moderation_status = 'visible'
    AND ru.deactivated_at IS NULL
)`;

/**
 * Tema del comentario: el propio, o el de su raíz si es una respuesta (que no tiene tema propio).
 * Correlacionado con `"comment"` por literal: requiere `comment` en el FROM.
 */
export const COMMENT_EFFECTIVE_TOPIC_SQL = sql<CommentTopic | null>`COALESCE(
  "comment"."topic",
  (SELECT rt.topic FROM comment rt WHERE rt.id = "comment"."parent_id")
)`;
