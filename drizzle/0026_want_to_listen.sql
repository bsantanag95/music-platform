-- Migración 0026: want_to_listen — señal prospectiva "quiero escuchar esto".
-- openspec: add-want-to-listen.
--
-- Mismo patrón de objetivo que favorite/rating/comment (FK nullable + CHECK
-- num_nonnulls = 1), pero restringido a artista y álbum: sin columna
-- recording_id, porque las canciones quedan fuera de alcance por decisión de
-- producto. Se retira automáticamente (desde la app, no por trigger) cuando
-- el usuario registra una escucha del mismo objetivo — ver
-- src/services/diary/diary.ts (createListenEntry).

CREATE TABLE want_to_listen_entry (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id        UUID REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id UUID REFERENCES release_group (id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- exactamente un objetivo por entrada (artista o álbum, nunca ambos)
    CHECK (num_nonnulls(artist_id, release_group_id) = 1),
    -- un usuario tiene a lo sumo una entrada por objetivo
    UNIQUE (user_id, artist_id),
    UNIQUE (user_id, release_group_id)
);

-- Listado propio (orden cronológico descendente).
CREATE INDEX idx_want_to_listen_entry_user_created ON want_to_listen_entry (user_id, created_at DESC);

-- Recuperación por objetivo (auto-remoción al registrar una escucha).
CREATE INDEX idx_want_to_listen_entry_artist        ON want_to_listen_entry (artist_id);
CREATE INDEX idx_want_to_listen_entry_release_group ON want_to_listen_entry (release_group_id);
