-- =====================================================================
-- Migración 0030 — Artista/álbum definitorios pasan a user_showcase
-- =====================================================================
-- Motivo: en el uso real, el marcador "me define" (0029) vivía solo sobre
-- user_pinned_item ("Destacados"), sin ninguna vía para marcar un álbum que
-- el dueño ya fijó en "Álbumes favoritos" (user_album_pin) — dos listas
-- separadas a propósito, pero eso dejaba el álbum definitorio inalcanzable
-- salvo agregándolo dos veces (duplicado en Destacados). Se decouplea el
-- marcador de cualquier lista de fijado: artista y álbum definitorios pasan
-- a ser referencias directas en user_showcase, mismo criterio que ya usaba
-- anthem_recording_id (cualquier entidad válida del catálogo, sin requerir
-- que sea también un destacado o un favorito).
--
-- Reversible sin pérdida de datos real: is_defining nunca tuvo más de un
-- artista y un álbum marcados por usuario (índices únicos parciales de
-- 0029), así que se puede migrar 1:1 a las columnas nuevas si hiciera falta
-- un backfill — no se agrega acá porque no hay usuarios en producción
-- todavía con datos marcados.
-- =====================================================================

ALTER TABLE user_showcase
    ADD COLUMN defining_artist_id UUID REFERENCES artist (id) ON DELETE SET NULL,
    ADD COLUMN defining_release_group_id UUID REFERENCES release_group (id) ON DELETE SET NULL;

DROP INDEX IF EXISTS uq_user_pinned_item_defining_artist;
DROP INDEX IF EXISTS uq_user_pinned_item_defining_release_group;

ALTER TABLE user_pinned_item
    DROP CONSTRAINT IF EXISTS chk_user_pinned_item_defining_not_recording;

ALTER TABLE user_pinned_item
    DROP COLUMN IF EXISTS is_defining;
