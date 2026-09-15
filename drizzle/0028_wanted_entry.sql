-- Migración 0028: wishlist de colección — discos que el usuario querría
-- conseguir, no que ya tiene. Fase 5, cambio add-collection-wishlist.
--
-- wanted_entry: entrada de deseo por álbum (release_group). A diferencia de
-- collection_entry, format es NULLABLE ("cualquier formato me sirve") y no
-- tiene audiencia: la wishlist es privada del dueño, sin vista pública ni de
-- terceros (mismo criterio que want_to_listen). Grano por variante deseada:
-- se permiten varias entradas para el mismo álbum (mismo o distinto
-- formato), sin deduplicar ni bloquear, igual que collection_entry.
--
-- format y attributes son 100% dato del usuario, mismo vocabulario cerrado
-- que collection_entry (src/services/collection/vocabulary.ts).

CREATE TABLE wanted_entry (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    release_group_id UUID NOT NULL REFERENCES release_group (id) ON DELETE CASCADE,
    -- NULL = "cualquier formato". A diferencia de collection_entry.format
    -- (obligatorio: representa una copia real), acá es opcional porque una
    -- entrada de deseo puede no tener un formato específico en mente.
    format           TEXT CHECK (
                         format IS NULL OR format IN ('vinyl', 'cd', 'cassette', 'other')
                     ),
    -- Mismo vocabulario cerrado que collection_entry.attributes (ver esa
    -- migración). El servicio deduplica y ordena el array antes de persistir.
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
    note             TEXT CHECK (note IS NULL OR length(note) <= 140),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wishlist propia paginada por fecha de alta descendente.
CREATE INDEX idx_wanted_entry_user_created
    ON wanted_entry (user_id, created_at DESC);

-- Entradas de deseo del usuario para un álbum concreto (acción en la página
-- de álbum).
CREATE INDEX idx_wanted_entry_user_release_group
    ON wanted_entry (user_id, release_group_id);

-- Recuperación por álbum (limpieza por cascade).
CREATE INDEX idx_wanted_entry_release_group
    ON wanted_entry (release_group_id);

-- updated_at se mantiene por trigger (regla del proyecto: nunca desde la app).
CREATE OR REPLACE FUNCTION trg_wanted_entry_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wanted_entry_updated_at
    BEFORE UPDATE ON wanted_entry
    FOR EACH ROW
    EXECUTE FUNCTION trg_wanted_entry_set_updated_at();
