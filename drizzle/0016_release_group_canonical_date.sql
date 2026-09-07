-- =====================================================================
-- Migración 0016 — release_group: fecha de lanzamiento canónica
-- =====================================================================
-- Motivo (openspec: canonicalize-release-group): el "año del álbum" se
-- derivaba de `release.release_date` de la única edición ingerida, que
-- puede ser una reedición o un remaster — un disco de 1994 figuraba con
-- el año de su reissue de 2015. MusicBrainz calcula `first-release-date`
-- sobre TODAS las ediciones del release-group; se persiste acá.
--
-- Dos columnas, misma semántica que `release-date-precision`: nunca se
-- inventa mes ni día. `YYYY-MM-DD` puebla ambas; `YYYY` / `YYYY-MM`
-- pueblan solo el año; ausente deja ambas en NULL.
--
-- Sin backfill en SQL: el valor correcto viene de MusicBrainz, no de la
-- edición local ya ingerida. El backfill de filas existentes se hace con
-- `scripts/recanonicalize-release-group.ts` (fase de fecha canónica).
-- =====================================================================

ALTER TABLE release_group ADD COLUMN first_release_date DATE;
ALTER TABLE release_group ADD COLUMN first_release_year SMALLINT;

CREATE INDEX idx_release_group_first_year ON release_group (first_release_year);
