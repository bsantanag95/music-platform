-- =====================================================================
-- Migración 0019 — user_album_pin: sección "Álbumes favoritos" del perfil
-- =====================================================================
-- Motivo (openspec: redesign-profile-album-identity, Fase 1 de
-- redefine-content-hierarchy): el bloque de identidad cultural del perfil
-- arranca con una sección propia de hasta 6 álbumes fijados y ordenados
-- por el dueño, separada de los 4 destacados mixtos.
--
-- Opción B: NO es una señal nueva de "amo este álbum". La fila es un PIN
-- DE UN FAVORITO — `favorite_id` referencia un favorito de álbum que el
-- dueño ya tiene. `ON DELETE CASCADE` desde favorite: quitar el favorito
-- desfija el álbum de la identidad automáticamente (feature, no borde).
--
-- El servicio valida además que el favorito sea propio y de tipo álbum
-- (release_group_id no nulo) y el máximo de 6 (además del CHECK). La
-- posición es 1..6, única por usuario → orden inequívoco.
-- =====================================================================

CREATE TABLE user_album_pin (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    favorite_id  UUID NOT NULL REFERENCES favorite (id) ON DELETE CASCADE,
    position     SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 6),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un favorito fijado a lo sumo una vez por usuario; una posición a lo sumo
-- una vez por usuario.
CREATE UNIQUE INDEX uq_user_album_pin_favorite ON user_album_pin (user_id, favorite_id);
CREATE UNIQUE INDEX uq_user_album_pin_position ON user_album_pin (user_id, position);
