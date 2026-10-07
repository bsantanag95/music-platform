-- =====================================================================
-- 0062_comment_like.sql
-- Likes en comentarios (openspec: add-comment-likes). Registro contable y
-- anónimo: solo deduplica (un like por persona y comentario) y alimenta el
-- conteo; la identidad de quien likeó nunca sale de la base.
--
-- Los comentarios se borran físicamente (ADR 0009) y las cuentas también:
-- ambos FK en cascada. Sin id propio (nada la referencia): la PK es el par.
-- El conteo es COUNT(*) —excluyendo cuentas desactivadas— sobre la PK; el
-- índice por user_id sirve a `likedByMe` y a la cascada de la cuenta.
-- Aditivo: el código anterior ignora la tabla.
-- =====================================================================

CREATE TABLE comment_like (
  comment_id UUID NOT NULL REFERENCES comment (id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX idx_comment_like_user ON comment_like (user_id);
