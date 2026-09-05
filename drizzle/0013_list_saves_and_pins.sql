-- Migración 0013: guardar/seguir listas ajenas y fijar listas propias.
-- Cambio rework-lists-section (sección /me/lists: Mis listas · Guardadas · Descubrir).
--
-- list_save: marcador privado de una lista ajena visible. `following` es el eje
-- extra: cuando es TRUE, las actualizaciones de metadatos de esa lista entran en
-- el feed de quien la sigue. Toggle idempotente por (saver_id, list_id).
--
-- user_list_pin: el propietario fija sus listas favoritas propias para que
-- aparezcan primero en su superficie. Tabla aparte (no columna en user_list) a
-- propósito: user_list.updated_at lo mantiene un trigger en CUALQUIER UPDATE y el
-- feed deriva de ese updated_at los eventos de "lista actualizada"; escribir el
-- pin en user_list generaría un evento de feed falso. Con tabla aparte, fijar no
-- toca user_list.

-- ============================================================
-- LIST SAVE (guardar / seguir listas ajenas)
-- ============================================================

CREATE TABLE list_save (
    saver_id   UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    list_id    UUID NOT NULL REFERENCES user_list (id) ON DELETE CASCADE,
    following  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (saver_id, list_id)
);

-- Superficie "Guardadas": listas guardadas por un usuario, orden por fecha desc.
CREATE INDEX idx_list_save_saver_created ON list_save (saver_id, created_at DESC);

-- Feed de listas seguidas: quiénes siguen una lista dada (composición del feed
-- y limpieza por cascade desde user_list).
CREATE INDEX idx_list_save_list ON list_save (list_id);

-- ============================================================
-- USER LIST PIN (fijar listas propias)
-- ============================================================

CREATE TABLE user_list_pin (
    owner_id  UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    list_id   UUID NOT NULL REFERENCES user_list (id) ON DELETE CASCADE,
    pinned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (owner_id, list_id)
);

-- Orden de la superficie propia: fijadas primero, por pinned_at desc.
CREATE INDEX idx_user_list_pin_owner_pinned ON user_list_pin (owner_id, pinned_at DESC);
