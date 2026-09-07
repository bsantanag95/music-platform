-- Migración 0014: rediseño del perfil de usuario.
-- Fase 5, cambio redesign-user-profile.
--
-- Identidad extendida (bio, pronombres, ubicación, zona horaria, avatar
-- reservado), enlaces externos, cuatro destacados, himno, y tags de género
-- sembrados para la huella de gusto.
--
-- Todas las columnas de app_user son NULL-ables y aditivas: el despliegue es
-- reversible sin pérdida de datos. `avatar_url` se añade ahora aunque la UI
-- no lo lea todavía (la subida de avatares es un cambio posterior).

-- ---------------------------------------------------------------------
-- APP_USER — campos de identidad extendida
-- ---------------------------------------------------------------------
ALTER TABLE app_user
    ADD COLUMN bio        TEXT,
    ADD COLUMN pronouns   TEXT,
    ADD COLUMN location   TEXT,
    ADD COLUMN timezone   TEXT,
    ADD COLUMN avatar_url  TEXT;

ALTER TABLE app_user
    ADD CONSTRAINT chk_app_user_bio
        CHECK (bio IS NULL OR length(bio) <= 200),
    ADD CONSTRAINT chk_app_user_pronouns
        CHECK (pronouns IS NULL OR length(pronouns) <= 40),
    ADD CONSTRAINT chk_app_user_location
        CHECK (location IS NULL OR length(location) <= 80),
    ADD CONSTRAINT chk_app_user_timezone
        CHECK (timezone IS NULL OR length(timezone) <= 64),
    ADD CONSTRAINT chk_app_user_avatar_url
        CHECK (avatar_url IS NULL OR length(avatar_url) <= 400);

-- ---------------------------------------------------------------------
-- USER_PROFILE_LINK — enlaces externos del perfil (máx. 5, orden explícito)
-- El máximo de 5 se valida en el servicio: un CHECK no puede contar filas.
-- ---------------------------------------------------------------------
CREATE TABLE user_profile_link (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    kind      TEXT NOT NULL CHECK (
                  kind IN (
                      'website', 'bandcamp', 'lastfm', 'discogs',
                      'instagram', 'youtube', 'soundcloud', 'other'
                  )
              ),
    url       TEXT NOT NULL CHECK (length(url) <= 400),
    position  INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profile_link_user ON user_profile_link (user_id, position);

-- ---------------------------------------------------------------------
-- USER_PINNED_ITEM — cuatro destacados (máx. 4, tipos mezclados)
-- Patrón triple-FK nullable + CHECK num_nonnulls, igual que rating/favorite.
-- El máximo de 4 se valida en el servicio.
-- ---------------------------------------------------------------------
CREATE TABLE user_pinned_item (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id        UUID REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id UUID REFERENCES release_group (id) ON DELETE CASCADE,
    recording_id     UUID REFERENCES recording (id) ON DELETE CASCADE,
    note             TEXT CHECK (note IS NULL OR length(note) <= 120),
    position         INTEGER NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1)
);

CREATE INDEX idx_user_pinned_item_user ON user_pinned_item (user_id, position);

-- ---------------------------------------------------------------------
-- USER_SHOWCASE — una fila por usuario; himno elegido manualmente.
-- El himno es siempre un recording. ON DELETE SET NULL: si el recording
-- desaparece del catálogo, el usuario se queda sin himno pero la fila
-- (y cualquier estado futuro) se conserva.
-- ---------------------------------------------------------------------
CREATE TABLE user_showcase (
    user_id             UUID PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
    anthem_recording_id UUID REFERENCES recording (id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_showcase_touch
BEFORE UPDATE ON user_showcase
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- ---------------------------------------------------------------------
-- RELEASE_GROUP_TAG — tags de género por álbum, para la cresta de géneros
-- de la huella de gusto. Se siembran (scripts/seed-release-group-tags.ts)
-- hasta que exista ingesta real desde MusicBrainz (cambio posterior).
-- ---------------------------------------------------------------------
CREATE TABLE release_group_tag (
    release_group_id UUID NOT NULL REFERENCES release_group (id) ON DELETE CASCADE,
    tag              TEXT NOT NULL CHECK (length(tag) <= 80),
    count            INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (release_group_id, tag)
);

CREATE INDEX idx_release_group_tag_tag ON release_group_tag (tag);
