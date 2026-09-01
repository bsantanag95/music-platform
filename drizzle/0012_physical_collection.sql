-- Migración 0012: colección física — coleccionismo de discos en soporte físico.
-- Fase 5, cambio add-physical-collection.
--
-- collection_entry: declaración por álbum (release_group) de una copia física
-- que el usuario posee. El objetivo es fijo (solo álbum), no polimórfico, así
-- que usa una FK directa y no el patrón CHECK num_nonnulls de favorite/rating.
--
-- Grano por álbum + copia: se permiten varias entradas para el mismo álbum
-- (mismo o distinto formato). No hay toggle idempotente ni restricción de
-- unicidad: "tengo el vinilo y el CD" o "dos CDs con portada distinta" son
-- estados válidos.
--
-- format y attributes son 100% dato del usuario: el catálogo no modela
-- formato físico (release = edición, no soporte).

CREATE TABLE collection_entry (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    release_group_id UUID NOT NULL REFERENCES release_group (id) ON DELETE CASCADE,
    format           TEXT NOT NULL CHECK (
                         format IN ('vinyl', 'cd', 'cassette', 'other')
                     ),
    -- Vocabulario cerrado y curado de atributos de edición/copia. Son
    -- descriptores, no afirmaciones de identidad de catálogo. El servicio
    -- deduplica y ordena el array antes de persistir.
    attributes       TEXT[] NOT NULL DEFAULT '{}' CHECK (
                         attributes <@ ARRAY[
                             'limited-edition', 'numbered', 'first-press', 'reissue',
                             'remaster', 'anniversary-edition', 'deluxe-edition',
                             'colored-vinyl', 'picture-disc', '180g', 'gatefold', 'box-set',
                             'regional-edition',
                             'bonus-tracks', 'extra-disc',
                             'signed', 'promo'
                         ]::TEXT[]
                     ),
    -- Nota libre para lo que el vocabulario no captura (detalle de prensado,
    -- arte de portada, número de catálogo, estado de la copia). No se
    -- interpreta ni se valida contra catálogo.
    note             TEXT CHECK (note IS NULL OR length(note) <= 140),
    audience         TEXT NOT NULL DEFAULT 'followers' CHECK (
                         audience IN ('private', 'followers', 'public')
                     ),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colección propia paginada por fecha de alta descendente.
CREATE INDEX idx_collection_entry_user_created
    ON collection_entry (user_id, created_at DESC);

-- Copias del usuario para un álbum concreto (acción en la página de álbum).
CREATE INDEX idx_collection_entry_user_release_group
    ON collection_entry (user_id, release_group_id);

-- Recuperación por álbum (colección pública por álbum, limpieza por cascade).
CREATE INDEX idx_collection_entry_release_group
    ON collection_entry (release_group_id);

-- Filtro por atributo sobre el array.
CREATE INDEX idx_collection_entry_attributes
    ON collection_entry USING GIN (attributes);

-- updated_at se mantiene por trigger (regla del proyecto: nunca desde la app).
CREATE OR REPLACE FUNCTION trg_collection_entry_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_collection_entry_updated_at
    BEFORE UPDATE ON collection_entry
    FOR EACH ROW
    EXECUTE FUNCTION trg_collection_entry_set_updated_at();
