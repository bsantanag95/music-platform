-- Migración 0027: subtipo "recorrido de artista" sobre user_list.
-- openspec: add-artist-journey.
--
-- Reutiliza user_list/user_list_item (mismo mecanismo que las listas
-- genéricas) en vez de crear una entidad nueva: la selección de álbumes de
-- un recorrido ES la lista de user_list_item, ni más ni menos. Solo se
-- agregan columnas de subtipo a nivel de lista, igual que las columnas
-- editoriales de la migración 0025.
--
-- El estado "completo"/"en curso" NO se persiste aquí: se deriva en el
-- momento de lectura cruzando los ítems del recorrido contra listen_entry
-- (ver src/services/artist-journeys/artist-journeys.ts), para que agregar o
-- quitar un ítem nunca deje un estado guardado desactualizado. Solo
-- "archivado" es un estado que el usuario fija explícitamente, por eso es la
-- única columna de estado que se persiste.

ALTER TABLE user_list
    ADD COLUMN kind TEXT NOT NULL DEFAULT 'standard'
        CHECK (kind IN ('standard', 'artist_journey')),
    ADD COLUMN journey_artist_id UUID REFERENCES artist (id) ON DELETE CASCADE,
    ADD COLUMN journey_archived_at TIMESTAMPTZ;

-- Recuperación por artista objetivo (detalle propio, faceta de perfil).
CREATE INDEX idx_user_list_journey_artist ON user_list (journey_artist_id);

-- A lo sumo un recorrido activo por usuario y artista. NO parcial a
-- propósito: mismo patrón que favorite/want_to_listen_entry (FK nullable +
-- UNIQUE simple) — las listas genéricas siempre tienen journey_artist_id
-- NULL, y Postgres nunca considera dos NULL iguales en una restricción
-- única, así que no compiten entre sí. Una restricción parcial
-- (`WHERE kind = 'artist_journey'`) requeriría repetir ese predicado en
-- cada `ON CONFLICT` para que Postgres la use como árbitro — innecesario
-- acá, y drizzle-orm no expresa bien esa repetición.
CREATE UNIQUE INDEX uq_user_list_journey_owner_artist
    ON user_list (owner_id, journey_artist_id);
