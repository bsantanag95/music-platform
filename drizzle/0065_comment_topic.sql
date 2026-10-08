-- =====================================================================
-- 0065_comment_topic.sql
-- Tema de los comentarios de artista (openspec: add-artist-comment-topics).
--
-- Un comentario de artista pertenece a exactamente un tema del catálogo
-- cerrado start | albums | songs | general. Los de álbum y canción no tienen
-- tema (topic NULL).
--
-- Tres CHECK con nombre, separados a propósito: el cambio siguiente
-- (add-comment-replies) solo recrea chk_comment_artist_topic_required para
-- permitir respuestas sin tema propio, sin tocar los otros dos.
--
-- Las notas de artista anteriores pasan a 'general': no hay forma de saber
-- de qué trataban y no se inventa un tema. El relleno va ANTES de los CHECK
-- (el tercero fallaría con las filas existentes).
-- Aditivo: la columna es nullable, el código anterior sigue funcionando.
-- =====================================================================

ALTER TABLE comment ADD COLUMN topic TEXT;

UPDATE comment SET topic = 'general' WHERE artist_id IS NOT NULL;

ALTER TABLE comment
  ADD CONSTRAINT chk_comment_topic_values
    CHECK (topic IS NULL OR topic IN ('start', 'albums', 'songs', 'general')),
  ADD CONSTRAINT chk_comment_topic_artist_only
    CHECK (topic IS NULL OR artist_id IS NOT NULL),
  ADD CONSTRAINT chk_comment_artist_topic_required
    CHECK (artist_id IS NULL OR topic IS NOT NULL);

-- Filtro por tema del listado de un artista, del más reciente al más antiguo.
CREATE INDEX idx_comment_artist_topic
  ON comment (artist_id, topic, created_at DESC)
  WHERE artist_id IS NOT NULL;
