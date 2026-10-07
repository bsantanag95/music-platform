-- =====================================================================
-- 0064_artist_discography_refresh.sql
-- Resincronización de discografías más barata y disparada por lanzamientos
-- (openspec: refresh-discography-on-new-releases).
--
-- `discography_complete_at` conserva su significado (última vez que se
-- recorrieron todas las páginas): lo leen la página de artista y el
-- descubrimiento de géneros como «discografía explorada», así que no se usa
-- para pedir un refresco.
--
-- - `discography_mb_total`: `release-group-count` que informó MusicBrainz en el
--   último recorrido completo no truncado. NULL = desconocido: la próxima
--   resincronización recorre todas las páginas.
-- - `discography_checked_at`: última vez que la discografía se dio por vigente
--   (recorrido completo o verificación barata de la página 1). La frescura de
--   7 días se mide desde aquí, o desde `discography_complete_at` si es NULL.
-- - `discography_refresh_requested_at`: la sincronización del calendario de
--   lanzamientos vio un disco del artista que no está en su discografía.
--   Posterior a la verificación = la próxima visita resincroniza completo.
-- Aditivo: el código anterior ignora las tres columnas.
-- =====================================================================

ALTER TABLE artist
  ADD COLUMN discography_mb_total INTEGER,
  ADD COLUMN discography_checked_at TIMESTAMPTZ,
  ADD COLUMN discography_refresh_requested_at TIMESTAMPTZ,
  ADD CONSTRAINT chk_artist_discography_mb_total
    CHECK (discography_mb_total IS NULL OR discography_mb_total >= 0);
