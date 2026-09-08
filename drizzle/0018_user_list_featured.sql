-- =====================================================================
-- Migración 0018 — user_list_featured: colecciones destacadas de /explore
-- =====================================================================
-- Motivo (openspec: add-album-discovery): la superficie de descubrimiento
-- `/explore` necesita un riel editorial de colecciones — listas públicas
-- de la cuenta curadora, ordenadas. La señal "destacada + orden" es SOLO
-- una señal de distribución: no cambia visibilidad, permisos, lectura ni
-- comportamiento de la lista.
--
-- Tabla aparte (no columna en user_list) A PROPÓSITO, mismo motivo que
-- user_list_pin (migración 0013): user_list.updated_at lo mantiene un
-- trigger en CUALQUIER UPDATE, y el feed deriva de ese updated_at los
-- eventos de "lista actualizada". Escribir la marca en user_list generaría
-- un evento de feed falso al sembrar. Con tabla aparte, destacar no toca
-- user_list.
--
-- Presencia de fila = destacada. `rank` NOT NULL, UNIQUE (orden editorial
-- inequívoco) y > 0. Las filas las escribe scripts/seed-discovery.ts.
-- =====================================================================

CREATE TABLE user_list_featured (
    list_id     UUID PRIMARY KEY REFERENCES user_list (id) ON DELETE CASCADE,
    rank        SMALLINT NOT NULL CHECK (rank > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unicidad del rango + índice de lectura del riel editorial en uno.
CREATE UNIQUE INDEX uq_user_list_featured_rank ON user_list_featured (rank);
