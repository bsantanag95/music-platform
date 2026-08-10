-- Migración 0006: estado de sincronización de memberships e idempotencia.

ALTER TABLE artist
    ADD COLUMN memberships_synced_at TIMESTAMPTZ;

-- Si una base existente contiene duplicados, conservar la fila con el UUID menor
-- como canónica, combinar sus roles y conservar el intervalo más amplio antes
-- de crear la restricción de unicidad. En music_platform_scratch la consulta
-- previa no encontró duplicados, por lo que este bloque no elimina filas.
CREATE TEMP TABLE membership_duplicates ON COMMIT DROP AS
SELECT
    person_id,
    group_id,
    MIN(id::text)::uuid AS canonical_id,
    string_agg(DISTINCT role, ', ' ORDER BY role) AS merged_role,
    MIN(joined_on) AS merged_joined_on,
    MAX(left_on) AS merged_left_on
FROM membership
GROUP BY person_id, group_id
HAVING COUNT(*) > 1;

UPDATE membership AS m
SET
    role = d.merged_role,
    joined_on = d.merged_joined_on,
    left_on = d.merged_left_on
FROM membership_duplicates AS d
WHERE m.id = d.canonical_id;

DELETE FROM membership AS m
USING membership_duplicates AS d
WHERE m.person_id = d.person_id
  AND m.group_id = d.group_id
  AND m.id <> d.canonical_id;

CREATE UNIQUE INDEX uq_membership_person_group
    ON membership (person_id, group_id);
