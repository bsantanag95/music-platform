-- =====================================================================
-- 0090_artist_link_setlistfm.sql
-- Enlace a la página del artista en setlist.fm (openspec: add-setlistfm-artist-link).
--
-- Aditiva: el CHECK de `artist_link.kind` se rehace (mismo nombre, regla más
-- amplia) para aceptar `setlistfm`; ninguna fila existente lo viola. Sin
-- backfill: el enlace llega con la actualización de la ficha (cada 30 días) y
-- mientras tanto la cabecera enlaza a la búsqueda por nombre en setlist.fm.
-- =====================================================================

ALTER TABLE artist_link
    DROP CONSTRAINT chk_artist_link_kind;

ALTER TABLE artist_link
    ADD CONSTRAINT chk_artist_link_kind CHECK (kind IN ('official', 'bandcamp', 'streaming', 'setlistfm'));
