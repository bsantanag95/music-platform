-- =====================================================================
-- Letterboxd de Música — Esquema de base de datos (PostgreSQL 14+)
-- =====================================================================
-- Decisiones de diseño reflejadas en este esquema:
--   1. ARTIST unifica personas y bandas (type), con MEMBERSHIP como
--      tabla de unión para resolver el caso "Roger Waters / Pink Floyd".
--   2. CREDIT resuelve feat., duos y compilados (Various Artists) sin
--      una FK directa artist_id en release_group/recording.
--   3. RECORDING es la unidad que acumula rating/comentarios, separada
--      de TRACK (posición dentro de un RELEASE concreto).
--   4. variant_type distingue re-grabación/remix/en vivo (registro
--      nuevo) de un remaster (mismo registro, sin importar el audio).
--   5. RATING fuerza la coherencia entre estrellas y "valoración
--      detallada" con un CHECK, no solo a nivel de aplicación.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- para gen_random_uuid()

-- ---------------------------------------------------------------------
-- USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    display_name  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- ARTIST — persona, grupo, o "Various Artists"
-- ---------------------------------------------------------------------
CREATE TABLE artist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid        UUID UNIQUE,               -- referencia externa a MusicBrainz
    type        TEXT NOT NULL CHECK (type IN ('person', 'group', 'various')),
    name        TEXT NOT NULL,
    bio         TEXT,
    photo_url   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_artist_name ON artist (name);

-- ---------------------------------------------------------------------
-- MEMBERSHIP — une personas con grupos (caso Roger Waters / Pink Floyd)
-- ---------------------------------------------------------------------
CREATE TABLE membership (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id   UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    group_id    UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    role        TEXT,          -- ej: 'bajista', 'voz principal'
    joined_on   DATE,
    left_on     DATE,
    CHECK (person_id <> group_id),
    CHECK (left_on IS NULL OR joined_on IS NULL OR left_on >= joined_on)
);

CREATE INDEX idx_membership_person ON membership (person_id);
CREATE INDEX idx_membership_group  ON membership (group_id);

-- Un CHECK no puede consultar otra fila, así que la regla
-- "person_id debe ser type=person y group_id debe ser type=group"
-- se aplica con un trigger.
CREATE OR REPLACE FUNCTION fn_check_membership_types()
RETURNS TRIGGER AS $$
DECLARE
    v_person_type TEXT;
    v_group_type  TEXT;
BEGIN
    SELECT type INTO v_person_type FROM artist WHERE id = NEW.person_id;
    SELECT type INTO v_group_type  FROM artist WHERE id = NEW.group_id;

    IF v_person_type IS DISTINCT FROM 'person' THEN
        RAISE EXCEPTION 'membership.person_id debe referenciar un artist con type=person';
    END IF;
    IF v_group_type IS DISTINCT FROM 'group' THEN
        RAISE EXCEPTION 'membership.group_id debe referenciar un artist con type=group';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_membership_types
BEFORE INSERT OR UPDATE ON membership
FOR EACH ROW EXECUTE FUNCTION fn_check_membership_types();

-- ---------------------------------------------------------------------
-- RELEASE_GROUP — el álbum como concepto (independiente de ediciones)
-- ---------------------------------------------------------------------
CREATE TABLE release_group (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid        UUID UNIQUE,
    title       TEXT NOT NULL,
    category    TEXT NOT NULL CHECK (category IN ('studio', 'single_ep', 'compilation', 'live_other')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_release_group_title ON release_group (title);

-- ---------------------------------------------------------------------
-- RELEASE — una edición concreta (original, remaster, japonesa, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE release (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid              UUID UNIQUE,
    release_group_id  UUID NOT NULL REFERENCES release_group (id) ON DELETE CASCADE,
    edition_label     TEXT NOT NULL DEFAULT 'original',
    release_date      DATE,
    cover_thumb_url   TEXT   -- baja resolución (ver nota de licencia de Cover Art Archive)
);

CREATE INDEX idx_release_release_group ON release (release_group_id);

-- ---------------------------------------------------------------------
-- RECORDING — la grabación única; dueña de rating y comentarios
-- ---------------------------------------------------------------------
CREATE TABLE recording (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid          UUID UNIQUE,
    title         TEXT NOT NULL,
    duration_sec  INT CHECK (duration_sec IS NULL OR duration_sec > 0),
    variant_type  TEXT NOT NULL DEFAULT 'original'
                  CHECK (variant_type IN ('original', 're_recording', 'remix', 'live')),
    variant_of_id UUID REFERENCES recording (id),  -- a qué grabación original hace referencia
    CHECK (variant_type = 'original' OR variant_of_id IS NOT NULL),
    CHECK (variant_of_id IS NULL OR variant_of_id <> id)
);

CREATE INDEX idx_recording_title ON recording (title);
CREATE INDEX idx_recording_variant_of ON recording (variant_of_id);

-- Nota: un remaster de audio NUNCA crea una fila nueva aquí — reutiliza
-- el mismo id de recording. variant_type solo existe para re-grabación,
-- remix o versión en vivo, tal como se definió.

-- ---------------------------------------------------------------------
-- TRACK — posición de una RECORDING dentro de una RELEASE concreta
-- ---------------------------------------------------------------------
CREATE TABLE track (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id    UUID NOT NULL REFERENCES release (id) ON DELETE CASCADE,
    recording_id  UUID NOT NULL REFERENCES recording (id) ON DELETE RESTRICT,
    disc_number   INT NOT NULL DEFAULT 1 CHECK (disc_number > 0),
    position      INT NOT NULL CHECK (position > 0),
    UNIQUE (release_id, disc_number, position)
);

CREATE INDEX idx_track_release   ON track (release_id);
CREATE INDEX idx_track_recording ON track (recording_id);

-- ---------------------------------------------------------------------
-- CREDIT — resuelve feat., dúos y "Various Artists"
-- ---------------------------------------------------------------------
CREATE TABLE credit (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id         UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id  UUID REFERENCES release_group (id) ON DELETE CASCADE,
    recording_id      UUID REFERENCES recording (id) ON DELETE CASCADE,
    position          INT NOT NULL CHECK (position >= 0),
    role              TEXT NOT NULL CHECK (role IN ('primary', 'featured')),
    join_phrase       TEXT,  -- 'feat.', '&', 'con', 'vs.'
    -- exactamente un target: release_group O recording, nunca ambos ni ninguno
    CHECK (num_nonnulls(release_group_id, recording_id) = 1)
);

-- Un mismo artista no puede tener dos créditos en el mismo target,
-- y no puede haber dos artistas en la misma posición del mismo target.
-- Se usan índices únicos parciales porque un UNIQUE normal no detecta
-- duplicados cuando una de las dos columnas de target es NULL.
CREATE UNIQUE INDEX uq_credit_pos_release_group
    ON credit (release_group_id, position) WHERE release_group_id IS NOT NULL;
CREATE UNIQUE INDEX uq_credit_pos_recording
    ON credit (recording_id, position) WHERE recording_id IS NOT NULL;
CREATE UNIQUE INDEX uq_credit_artist_release_group
    ON credit (release_group_id, artist_id) WHERE release_group_id IS NOT NULL;
CREATE UNIQUE INDEX uq_credit_artist_recording
    ON credit (recording_id, artist_id) WHERE recording_id IS NOT NULL;

CREATE INDEX idx_credit_artist ON credit (artist_id);

-- ---------------------------------------------------------------------
-- RATING — estrellas (1-5, medios pasos) + valoración detallada (1-100)
-- ---------------------------------------------------------------------
CREATE TABLE rating (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id         UUID REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id  UUID REFERENCES release_group (id) ON DELETE CASCADE,
    recording_id      UUID REFERENCES recording (id) ON DELETE CASCADE,
    stars             NUMERIC(2,1) NOT NULL,
    detailed_score    SMALLINT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- exactamente un target: artista, álbum o canción
    CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1),

    -- estrellas en pasos de 0.5, entre 0.5 y 5
    CHECK (stars BETWEEN 0.5 AND 5 AND stars = ROUND(stars * 2) / 2.0),

    -- la valoración detallada, si existe, debe caer dentro de la banda
    -- de 10 puntos que le corresponde a las estrellas elegidas
    -- (0.5★→1-10, 1★→11-20, 1.5★→21-30 ... 5★→91-100)
    CHECK (
        detailed_score IS NULL OR (
            detailed_score BETWEEN 1 AND 100 AND
            detailed_score BETWEEN ((ROUND(stars * 2)::INT - 1) * 10 + 1)
                               AND ( ROUND(stars * 2)::INT * 10)
        )
    )
);

-- Un usuario solo puede tener UNA valoración vigente por target
CREATE UNIQUE INDEX uq_rating_user_artist
    ON rating (user_id, artist_id) WHERE artist_id IS NOT NULL;
CREATE UNIQUE INDEX uq_rating_user_release_group
    ON rating (user_id, release_group_id) WHERE release_group_id IS NOT NULL;
CREATE UNIQUE INDEX uq_rating_user_recording
    ON rating (user_id, recording_id) WHERE recording_id IS NOT NULL;

CREATE INDEX idx_rating_recording      ON rating (recording_id);
CREATE INDEX idx_rating_release_group  ON rating (release_group_id);
CREATE INDEX idx_rating_artist         ON rating (artist_id);

-- ---------------------------------------------------------------------
-- COMMENT — comentarios de texto libre, independientes del rating
-- ---------------------------------------------------------------------
CREATE TABLE comment (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id         UUID REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id  UUID REFERENCES release_group (id) ON DELETE CASCADE,
    recording_id      UUID REFERENCES recording (id) ON DELETE CASCADE,
    body              TEXT NOT NULL CHECK (char_length(body) > 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1)
);

CREATE INDEX idx_comment_recording      ON comment (recording_id);
CREATE INDEX idx_comment_release_group  ON comment (release_group_id);
CREATE INDEX idx_comment_artist         ON comment (artist_id);

-- ---------------------------------------------------------------------
-- Trigger genérico para mantener updated_at en rating
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rating_touch
BEFORE UPDATE ON rating
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
