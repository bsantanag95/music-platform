-- =====================================================================
-- 0066_comment_replies.sql
-- Respuestas de un nivel a los comentarios de artista (openspec:
-- add-comment-replies).
--
-- Una respuesta es una fila de `comment` con `parent_id` apuntando a una
-- RAÍZ (parent_id NULL): un solo nivel, normalizado por el servicio. Los
-- likes, reportes, moderación y bloqueos ya referencian comment.id, así que
-- funcionan igual con las respuestas. ON DELETE CASCADE (ADR 0009: borrado
-- físico): borrar una raíz borra sus respuestas, y los likes de ambas
-- caen por su propio FK.
--
-- La respuesta copia el objetivo (artist_id) de su raíz —lo fija el servicio,
-- nunca el cliente— y NO tiene tema propio: hereda el de la raíz. Por eso
-- chk_comment_artist_topic_required (0065) se recrea permitiendo topic NULL
-- cuando hay parent_id, y chk_comment_reply_no_topic impide que una
-- respuesta tenga tema. Los otros dos CHECK de 0065 no cambian.
-- Que el padre sea una raíz del mismo objetivo cruza filas y no es un CHECK:
-- lo impone el servicio. "Solo artista" también vive en el servicio, para
-- poder habilitar álbum/canción más adelante sin migración.
-- Aditivo: las filas existentes quedan como raíces (parent_id NULL).
-- =====================================================================

ALTER TABLE comment
  ADD COLUMN parent_id UUID REFERENCES comment (id) ON DELETE CASCADE;

ALTER TABLE comment DROP CONSTRAINT chk_comment_artist_topic_required;

ALTER TABLE comment
  ADD CONSTRAINT chk_comment_artist_topic_required
    CHECK (artist_id IS NULL OR topic IS NOT NULL OR parent_id IS NOT NULL),
  ADD CONSTRAINT chk_comment_reply_no_topic
    CHECK (parent_id IS NULL OR topic IS NULL);

-- Hilo de una raíz, de la respuesta más antigua a la más reciente.
CREATE INDEX idx_comment_parent
  ON comment (parent_id, created_at)
  WHERE parent_id IS NOT NULL;
