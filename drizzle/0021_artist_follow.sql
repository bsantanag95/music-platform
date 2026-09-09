-- =====================================================================
-- Migración 0021 — artist_follow: seguir artista (usuario → artista)
-- =====================================================================
-- Motivo (openspec: add-artist-following, Fase 2 de
-- redefine-content-hierarchy): relación unilateral usuario → artista,
-- separada del seguimiento usuario → usuario (`user_follow`). En esta
-- fase es señal de afinidad, descubrimiento y organización personal —
-- NO notificaciones de lanzamientos.
--
-- SIN `status`: un artista no es una cuenta que apruebe solicitudes.
-- Seguir = insertar la fila; dejar de seguir = borrarla. `ON DELETE
-- CASCADE` en ambas FK. El espacio para notificaciones de lanzamiento
-- más adelante es aditivo (tabla nueva o columna `notify`).
-- =====================================================================

CREATE TABLE artist_follow (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id   UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un usuario sigue a un artista a lo sumo una vez (base del toggle idempotente).
CREATE UNIQUE INDEX uq_artist_follow_pair ON artist_follow (user_id, artist_id);
-- Recuperación por artista (conteo de seguidores futuro, afinidad).
CREATE INDEX idx_artist_follow_artist ON artist_follow (artist_id);
