-- =====================================================================
-- 0091_concert_entry.sql
-- Conciertos a los que fue el usuario (openspec: add-my-concerts, ADR 0056).
--
-- Cada fila es un recuerdo de la persona, no un concierto verificado: guarda
-- lo que escribió y nada más afirma. Si en el futuro existe una entidad de
-- concierto, se agrega una columna `concert_id` NULL que la referencia; los
-- campos escritos nunca se sobrescriben y los registros sin enlace siguen
-- siendo válidos.
--
-- - event_date: fecha parcial 'YYYY', 'YYYY-MM' o 'YYYY-MM-DD' (mismo formato
--   que artist.life_begin). Que sea una fecha real y no futura lo valida el
--   servicio: un CHECK con now() no es estable.
-- - country: código ISO 3166-1 alfa-2, como app_user.country.
-- - setlistfm_url: enlace a un setlist que pega la persona; no se usa la API
--   de setlist.fm.
-- - Sin unicidad: dos funciones del mismo artista el mismo día son válidas.
-- Aditiva: tabla nueva, sin backfill.
-- =====================================================================

CREATE TABLE concert_entry (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id      UUID NOT NULL REFERENCES artist (id) ON DELETE CASCADE,
    event_date     TEXT NOT NULL,
    country        TEXT,
    city           TEXT,
    venue          TEXT,
    tour           TEXT,
    setlistfm_url  TEXT,
    note           TEXT,
    audience       TEXT NOT NULL DEFAULT 'followers',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_concert_entry_event_date CHECK (event_date ~ '^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$'),
    CONSTRAINT chk_concert_entry_country CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
    CONSTRAINT chk_concert_entry_city CHECK (city IS NULL OR (length(city) BETWEEN 1 AND 100)),
    CONSTRAINT chk_concert_entry_venue CHECK (venue IS NULL OR (length(venue) BETWEEN 1 AND 100)),
    CONSTRAINT chk_concert_entry_tour CHECK (tour IS NULL OR (length(tour) BETWEEN 1 AND 100)),
    CONSTRAINT chk_concert_entry_setlistfm_url CHECK (
        setlistfm_url IS NULL
        OR (setlistfm_url ~ '^https://(www\.)?setlist\.fm/setlist/[^\s]+$' AND length(setlistfm_url) <= 500)
    ),
    CONSTRAINT chk_concert_entry_note CHECK (note IS NULL OR (length(note) BETWEEN 1 AND 140)),
    CONSTRAINT chk_concert_entry_audience CHECK (audience IN ('private', 'followers', 'public'))
);

-- Mis conciertos y el riel del perfil: por fecha descendente (texto: la fecha
-- más precisa queda antes que la parcial del mismo período).
CREATE INDEX idx_concert_entry_user_date
    ON concert_entry (user_id, event_date DESC, created_at DESC);

-- Fila En vivo del panel del artista y el filtro por artista.
CREATE INDEX idx_concert_entry_user_artist
    ON concert_entry (user_id, artist_id);

-- Limpieza por cascada al borrar un artista.
CREATE INDEX idx_concert_entry_artist
    ON concert_entry (artist_id);

-- updated_at por trigger, respetando el indicador app.preserve_updated_at (0037):
-- "Aplicar a lo existente" cambia la audiencia sin tocar la fecha.
CREATE OR REPLACE FUNCTION trg_concert_entry_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.preserve_updated_at', true) = 'on' THEN
        NEW.updated_at = OLD.updated_at;
    ELSE
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_concert_entry_updated_at
BEFORE UPDATE ON concert_entry
FOR EACH ROW EXECUTE FUNCTION trg_concert_entry_set_updated_at();
