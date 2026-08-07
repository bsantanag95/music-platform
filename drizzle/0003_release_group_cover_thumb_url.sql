-- =====================================================================
-- Migración 0003 — release_group.cover_thumb_url
-- =====================================================================
-- Motivo: la carátula se resuelve a nivel de release-group contra Cover
-- Art Archive y no necesita la ingesta del tracklist de una edición. Antes
-- vivía en release.cover_thumb_url y solo se resolvía al ingestar la
-- edición; con la columna nueva, la grilla del perfil resuelve carátulas
-- con un HEAD a CAA (0 llamadas a MusicBrainz).
-- release.cover_thumb_url queda deprecada como lectura legada (fallback
-- para filas pre-migración) — la app deja de escribirla.
-- =====================================================================

ALTER TABLE release_group ADD COLUMN cover_thumb_url TEXT;

-- Backfill: copia las carátulas ya cacheadas en release a release_group,
-- para que el fallback legado casi nunca se active.
UPDATE release_group rg
SET cover_thumb_url = r.cover_thumb_url
FROM release r
WHERE r.release_group_id = rg.id
  AND r.cover_thumb_url IS NOT NULL;
