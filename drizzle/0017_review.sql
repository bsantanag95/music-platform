-- =====================================================================
-- Migración 0017 — review: reseña como entidad propia
-- =====================================================================
-- Motivo (openspec: add-album-review, primera pieza de la Fase 0 de
-- redefine-content-hierarchy): la reseña es la superficie crítica del
-- álbum — texto elaborado, con título opcional y rating asociado, una
-- vigente por (usuario, objetivo), editable. Distinta del `comment`
-- (nota conversacional corta, N por objetivo).
--
-- Forma de objetivo: tres FK nullable + CHECK num_nonnulls = 1, idéntica
-- a rating / comment / favorite / listen_entry. NO polimórfica. En esta
-- versión la escritura se restringe a álbumes en la capa de validación
-- (REVIEWABLE_TARGET_TYPES), no en el esquema — la tabla admite los tres
-- objetivos desde ya, para habilitar reseñas de artista/canción sin
-- migración futura.
--
-- El rating NO se almacena acá: `rating` es la única fuente de verdad de
-- la valoración (el listado hace LEFT JOIN). Borrar el rating deja la
-- reseña con rating nulo; borrar la reseña no toca el rating.
-- =====================================================================

CREATE TABLE review (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id         UUID REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id  UUID REFERENCES release_group (id) ON DELETE CASCADE,
    recording_id      UUID REFERENCES recording (id) ON DELETE CASCADE,
    title             TEXT,
    body              TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- exactamente un objetivo: artista, álbum o canción
    CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1),

    -- título opcional (1–120 cuando existe; la app normaliza '' a NULL)
    CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 120),

    -- cuerpo obligatorio, 1–10000
    CHECK (char_length(body) BETWEEN 1 AND 10000)
);

-- Un usuario solo puede tener UNA reseña vigente por objetivo
CREATE UNIQUE INDEX uq_review_user_artist
    ON review (user_id, artist_id) WHERE artist_id IS NOT NULL;
CREATE UNIQUE INDEX uq_review_user_release_group
    ON review (user_id, release_group_id) WHERE release_group_id IS NOT NULL;
CREATE UNIQUE INDEX uq_review_user_recording
    ON review (user_id, recording_id) WHERE recording_id IS NOT NULL;

-- Lectura del listado por objetivo
CREATE INDEX idx_review_artist         ON review (artist_id);
CREATE INDEX idx_review_release_group  ON review (release_group_id);
CREATE INDEX idx_review_recording      ON review (recording_id);

-- updated_at con el trigger genérico existente
CREATE TRIGGER trg_review_touch
BEFORE UPDATE ON review
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
