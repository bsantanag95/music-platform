-- =====================================================================
-- 0072_award_category_levels.sql
-- Niveles de categoría de premios (openspec: expand-grammy-categories, design D1, D3, D9).
-- Los niveles pasan de dos (`general`, `genre`) a tres, en este orden de presentación:
--   general  campo general (las cuatro grandes, Productor y Compositor del año)
--   album    los "Mejor álbum de …"            (antes `genre`)
--   genre    interpretaciones, canciones y grabaciones por género, agrupadas por campo
-- Las categorías `genre` declaran su `field` (pop, rock-alternative…); las demás lo dejan NULL.
-- El mapeo `genre` → `album` es conocido: toda categoría `genre` cargada por `add-music-awards`
-- es un "Mejor álbum de …". Orden de los pasos: ninguna fila viola una restricción a mitad de camino.
-- =====================================================================

ALTER TABLE award_category ADD COLUMN field TEXT;

ALTER TABLE award_category ADD CONSTRAINT chk_award_category_field
  CHECK (field IS NULL OR field ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE award_category DROP CONSTRAINT chk_award_category_tier;

UPDATE award_category SET tier = 'album' WHERE tier = 'genre';

ALTER TABLE award_category ADD CONSTRAINT chk_award_category_tier
  CHECK (tier IN ('general', 'album', 'genre'));

ALTER TABLE award_category ADD CONSTRAINT chk_award_category_genre_field
  CHECK (tier <> 'genre' OR field IS NOT NULL);
