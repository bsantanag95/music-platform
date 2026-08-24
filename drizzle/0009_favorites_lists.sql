-- Migración 0009: favoritos y listas curadas — señales curatoriales de Fase 5.
-- Fase 5, cambio add-favorites-and-lists.
--
-- favorito: señal simple (toggle) sobre artista, álbum o canción, con
-- audiencia propia e independiente de escucha, rating y comentario.
-- user_list + user_list_item: colecciones curadas mono-tipo con orden
-- manual y visibilidad por audiencia.

-- ============================================================
-- FAVORITES
-- ============================================================

CREATE TABLE favorite (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id        UUID REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id UUID REFERENCES release_group (id) ON DELETE CASCADE,
    recording_id     UUID REFERENCES recording (id) ON DELETE CASCADE,
    audience         TEXT NOT NULL DEFAULT 'followers' CHECK (
                         audience IN ('private', 'followers', 'public')
                     ),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- exactamente un objetivo por favorito (mismo patrón que rating/comment)
    CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1),
    -- un usuario tiene a lo sumo un favorito por objetivo
    UNIQUE (user_id, artist_id),
    UNIQUE (user_id, release_group_id),
    UNIQUE (user_id, recording_id)
);

-- Consulta de favoritos propios (orden cronológico) y ajenos por perfil.
CREATE INDEX idx_favorite_user_created ON favorite (user_id, created_at DESC);

-- Recuperación por objetivo (perfil futuro, agregados).
CREATE INDEX idx_favorite_artist        ON favorite (artist_id);
CREATE INDEX idx_favorite_release_group ON favorite (release_group_id);
CREATE INDEX idx_favorite_recording     ON favorite (recording_id);

-- ============================================================
-- USER LIST (cabecera de la lista)
-- ============================================================

CREATE TABLE user_list (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (
                    entity_type IN ('artist', 'release_group', 'recording')
                ),
    title       TEXT NOT NULL CHECK (length(title) <= 100),
    description TEXT CHECK (length(description) <= 500),
    audience    TEXT NOT NULL DEFAULT 'followers' CHECK (
                    audience IN ('private', 'followers', 'public')
                ),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Listado propio por fecha descendente.
CREATE INDEX idx_user_list_owner_created ON user_list (owner_id, created_at DESC);

-- Listado público de un usuario en su perfil.
CREATE INDEX idx_user_list_owner_audience ON user_list (owner_id, audience);

-- ============================================================
-- USER LIST ITEM (elementos de la lista)
-- ============================================================

CREATE TABLE user_list_item (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id          UUID NOT NULL REFERENCES user_list (id) ON DELETE CASCADE,
    artist_id        UUID REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id UUID REFERENCES release_group (id) ON DELETE CASCADE,
    recording_id     UUID REFERENCES recording (id) ON DELETE CASCADE,
    position         INTEGER NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- exactamente un objetivo por ítem (mismo patrón que rating/comment)
    CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1),
    -- un mismo objetivo a lo sumo una vez por lista
    UNIQUE (list_id, artist_id),
    UNIQUE (list_id, release_group_id),
    UNIQUE (list_id, recording_id),
    -- reordenamiento transaccional: se reescribe position en una transacción
    UNIQUE (list_id, position)
);

-- Recuperación de ítems de una lista (ordenada por position).
CREATE INDEX idx_user_list_item_list ON user_list_item (list_id, position);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at se mantiene por trigger (regla del proyecto: nunca desde la app).
CREATE OR REPLACE FUNCTION trg_user_list_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_list_updated_at
    BEFORE UPDATE ON user_list
    FOR EACH ROW
    EXECUTE FUNCTION trg_user_list_set_updated_at();

-- Validación cruzada: el objetivo del ítem debe coincidir con entity_type
-- de la lista padre. Este CHECK requiere consultar otra tabla y por tanto
-- se implementa como trigger, mismo criterio que trg_membership_types.
CREATE OR REPLACE FUNCTION trg_user_list_item_target_type()
RETURNS TRIGGER AS $$
DECLARE
    expected_type TEXT;
BEGIN
    SELECT entity_type INTO expected_type FROM user_list WHERE id = NEW.list_id;

    IF expected_type = 'artist' AND NEW.artist_id IS NULL THEN
        RAISE EXCEPTION 'user_list_item must reference an artist when list is artist-type';
    ELSIF expected_type = 'release_group' AND NEW.release_group_id IS NULL THEN
        RAISE EXCEPTION 'user_list_item must reference a release_group when list is release_group-type';
    ELSIF expected_type = 'recording' AND NEW.recording_id IS NULL THEN
        RAISE EXCEPTION 'user_list_item must reference a recording when list is recording-type';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_list_item_target_type
    BEFORE INSERT OR UPDATE ON user_list_item
    FOR EACH ROW
    EXECUTE FUNCTION trg_user_list_item_target_type();
