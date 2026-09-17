-- =====================================================================
-- Migración 0029 — Tarjeta de Identidad, valoraciones y diario destacados
-- =====================================================================
-- Motivo (openspec: rework-user-profile). Extiende el patrón "fijar" ya
-- usado por user_album_pin/user_list_pin/user_list_featured a tres lugares
-- nuevos:
--
-- 1) user_pinned_item gana un marcador "me define" (is_defining), exclusivo
--    por tipo: a lo sumo un destacado de tipo artista y a lo sumo uno de
--    tipo álbum por usuario pueden estar marcados. Nunca una canción (el
--    himno de user_showcase ya cumple ese rol). Junto con el himno, los
--    destacados marcados componen la Tarjeta de Identidad del perfil.
--
-- 2) rating_highlight y listen_entry_highlight: tablas de señal aparte,
--    mismo motivo que user_list_pin/user_list_featured — destacar NO debe
--    tocar rating.updated_at ni listen_entry (no dispara eventos de feed
--    ni pisa el disparador de huella/en rotación). Presencia de fila =
--    destacada. Una valoración o entrada destacada se vuelve visible para
--    cualquier visitante con acceso al perfil, sin importar su audiencia
--    o la relación de seguimiento (ver specs profile-affinity/
--    diary-visibility/rating-highlights del change). Mismo patrón de
--    "presencia = destacado, sin posición" que user_list_pin — el orden lo
--    da `highlighted_at`, no una posición explícita; el tope de 6 (por
--    tipo) lo valida el servicio, igual que el resto de los topes de esta
--    fase (no un CHECK, porque un CHECK no puede contar filas).
--
-- Todo aditivo y reversible sin pérdida de datos: columnas con DEFAULT,
-- tablas nuevas vacías.
-- =====================================================================

-- ---------------------------------------------------------------------
-- USER_PINNED_ITEM — marcador "me define", exclusivo por tipo
-- ---------------------------------------------------------------------
ALTER TABLE user_pinned_item
    ADD COLUMN is_defining BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE user_pinned_item
    ADD CONSTRAINT chk_user_pinned_item_defining_not_recording
        CHECK (NOT is_defining OR recording_id IS NULL);

-- A lo sumo un destacado de tipo artista, y a lo sumo uno de tipo álbum,
-- marcado como definitorio por usuario.
CREATE UNIQUE INDEX uq_user_pinned_item_defining_artist
    ON user_pinned_item (user_id)
    WHERE is_defining AND artist_id IS NOT NULL;

CREATE UNIQUE INDEX uq_user_pinned_item_defining_release_group
    ON user_pinned_item (user_id)
    WHERE is_defining AND release_group_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- RATING_HIGHLIGHT — hasta 6 valoraciones propias destacadas
-- ---------------------------------------------------------------------
CREATE TABLE rating_highlight (
    user_id        UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    rating_id      UUID NOT NULL REFERENCES rating (id) ON DELETE CASCADE,
    highlighted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, rating_id)
);

CREATE INDEX idx_rating_highlight_user_highlighted ON rating_highlight (user_id, highlighted_at);

-- ---------------------------------------------------------------------
-- LISTEN_ENTRY_HIGHLIGHT — hasta 6 entradas de diario propias destacadas
-- ---------------------------------------------------------------------
CREATE TABLE listen_entry_highlight (
    user_id         UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    listen_entry_id UUID NOT NULL REFERENCES listen_entry (id) ON DELETE CASCADE,
    highlighted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, listen_entry_id)
);

CREATE INDEX idx_listen_entry_highlight_user_highlighted ON listen_entry_highlight (user_id, highlighted_at);
