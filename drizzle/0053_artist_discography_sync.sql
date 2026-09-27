-- =====================================================================
-- Migración 0053 — discografía completa, sin bootlegs y con tipos originales
-- =====================================================================
-- openspec: fix-artist-discography-ingestion.
--
-- La ingesta anterior guardaba solo el primer browse de 100 release-groups,
-- sin filtrar bootlegs ni volver a sincronizar.
-- - `artist.discography_complete_at`: NULL = la discografía nunca se recorrió
--   entera. Arranca en NULL para todos los artistas: es el estado real (el
--   browse anterior se cortaba en 100 y no filtraba estado), no un valor
--   inventado. `discography_synced_at` conserva su significado ("hay datos").
-- - `release_group.discography_unlisted_at`: fuera de la discografía (solo
--   bootleg, o ya no devuelto por MusicBrainz). No borra el release-group ni
--   sus créditos: puede tener escuchas, valoraciones o colecciones.
-- - `release_group.primary_type` / `secondary_types`: tipos crudos de
--   MusicBrainz (NULL = todavía no sincronizados; `{}` = sin secundarios).
--   Sin CHECK: MusicBrainz puede agregar tipos nuevos. `category` no cambia.
-- El número 0052 queda reservado para el cambio redesign-song-page.
-- =====================================================================

ALTER TABLE artist
    ADD COLUMN discography_complete_at TIMESTAMPTZ;

ALTER TABLE release_group
    ADD COLUMN discography_unlisted_at TIMESTAMPTZ,
    ADD COLUMN primary_type TEXT,
    ADD COLUMN secondary_types TEXT[];
