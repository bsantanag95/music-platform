-- =====================================================================
-- Migración 0001 — artist.type admite 'unknown'
-- =====================================================================
-- Motivo: al ingerir créditos (feat., colaboraciones) desde MusicBrainz,
-- se crean filas "stub" de artist con solo mbid + name, sin saber todavía
-- si es persona o grupo (esa info requeriría una llamada extra por cada
-- artista credited, lo cual no es viable dado el límite de 1 req/seg).
-- Esas filas quedan en 'unknown' hasta que alguien visita el perfil de
-- ese artista directamente y se enriquece bajo demanda — mismo patrón de
-- cacheo bajo demanda del roadmap, aplicado de forma recursiva.
-- =====================================================================

ALTER TABLE artist DROP CONSTRAINT artist_type_check;
ALTER TABLE artist ADD CONSTRAINT artist_type_check
    CHECK (type IN ('person', 'group', 'various', 'unknown'));
