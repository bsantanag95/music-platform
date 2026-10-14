-- =====================================================================
-- Migración 0071 — la familia es propiedad de la colección
-- =====================================================================
-- Motivo (openspec: unify-explore-collections, ADR 0038): /explore pasa a
-- mostrar un solo riel de colecciones, mezclando las curadas a mano y las
-- generadas por plantilla. A quien mira no le sirve saber cómo se mantiene
-- una colección; lo que la distingue de las otras es su familia.
--
-- Hasta ahora la familia se derivaba en código de `template_key`
-- (TEMPLATE_FAMILY en collections/families.ts) y una fila `curated` no tenía
-- familia: no había de dónde derivarla. Pasa a vivir en la fila.
--
-- Efecto lateral deseado: el archivo deja de depender del registro de
-- plantillas. Hoy una plantilla retirada cae a `discovery` y pierde su
-- familia histórica; con la columna la conserva.
--
-- `community` se renombra a `rankings`: agrupa rankings calculados de la
-- actividad de la gente (top-rated-quarter, most-reviewed-month) y el nombre
-- chocaba con "Listas de la comunidad" (/lists), que son listas escritas por
-- personas. El renombre va aquí porque la columna nace en esta migración:
-- hacerlo después exigiría tocar el CHECK dos veces.
-- =====================================================================

ALTER TABLE user_list_featured ADD COLUMN family TEXT;

-- Relleno de las generadas desde el registro de plantillas vigente al escribir
-- esta migración. Una clave que no esté aquí cae a `discovery`, igual que hacía
-- FALLBACK_FAMILY.
UPDATE user_list_featured
   SET family = CASE template_key
                    WHEN 'anniversaries'       THEN 'ephemeris'
                    WHEN 'grammy-winners'      THEN 'awards'
                    WHEN 'new-releases'        THEN 'releases'
                    WHEN 'upcoming'            THEN 'releases'
                    WHEN 'genre-spotlight'     THEN 'discovery'
                    WHEN 'one-per-decade'      THEN 'discovery'
                    WHEN 'top-rated-quarter'   THEN 'rankings'
                    WHEN 'most-reviewed-month' THEN 'rankings'
                    ELSE 'discovery'
                END
 WHERE source = 'template';

-- Las curadas no tenían familia. `discovery` es el destino neutro: la consola
-- pide elegirla al destacar de aquí en adelante, y estas se pueden reasignar.
UPDATE user_list_featured
   SET family = 'discovery'
 WHERE source = 'curated';

ALTER TABLE user_list_featured
    ALTER COLUMN family SET NOT NULL,
    ADD CONSTRAINT chk_user_list_featured_family
        CHECK (family IN ('ephemeris', 'awards', 'releases', 'discovery', 'rankings'));

-- Lectura de la página de colecciones: las vigentes agrupadas por familia.
CREATE INDEX idx_user_list_featured_family ON user_list_featured (family);
