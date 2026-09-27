-- =====================================================================
-- Migración 0052 — retirar las variantes de grabación sin uso
-- =====================================================================
-- openspec: redesign-song-page (design D2, ADR 0020).
--
-- `recording.variant_type` y `recording.variant_of_id` (0000) nunca se
-- completaron: ninguna ingesta las escribe y todas las grabaciones son
-- `original` sin `variant_of`. Qué versión es una grabación (en vivo,
-- cover, instrumental, …) lo dicen los atributos de su vínculo con la
-- obra (`recording_work.attributes`, 0049), que se leen al servir la
-- página; la obra conecta las versiones entre sí.
-- =====================================================================

-- ---------------------------------------------------------------------
-- No perder datos: si alguna grabación declara una variante, abortar en
-- lugar de descartarla.
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM recording WHERE variant_type <> 'original' OR variant_of_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Hay grabaciones con variant_type o variant_of_id: revisarlas antes de aplicar 0052.';
  END IF;
END
$$;

DROP INDEX IF EXISTS idx_recording_variant_of;

-- CHECK sin nombre de 0000: `variant_type = 'original' OR variant_of_id IS
-- NOT NULL` y `variant_of_id IS NULL OR variant_of_id <> id`.
ALTER TABLE recording DROP CONSTRAINT IF EXISTS recording_check;
ALTER TABLE recording DROP CONSTRAINT IF EXISTS recording_check1;
ALTER TABLE recording DROP CONSTRAINT IF EXISTS recording_variant_type_check;

ALTER TABLE recording DROP COLUMN variant_of_id;
ALTER TABLE recording DROP COLUMN variant_type;
