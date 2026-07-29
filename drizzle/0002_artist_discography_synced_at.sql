-- =====================================================================
-- Migración 0002 — artist.discography_synced_at
-- =====================================================================
-- Motivo: findOrIngestDiscography no tenía forma de distinguir "ya
-- traje la discografía de este artista antes" de "todavía no". A
-- diferencia de findOrIngestArtist (que chequea local.mbid) y de
-- findOrIngestTracklist (que chequea si ya existe un release), acá no
-- alcanza con mirar si hay release_group relacionados: un artista con
-- discografía real cero (recién debutó) es indistinguible de un artista
-- que nunca se sincronizó. Se necesita una marca de tiempo explícita.
-- =====================================================================

ALTER TABLE artist ADD COLUMN discography_synced_at TIMESTAMPTZ;
