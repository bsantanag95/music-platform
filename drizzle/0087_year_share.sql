-- =====================================================================
-- 0087_year_share.sql
-- Marca de "Tu año en discos" compartido y tipo `year` de share_event
-- (openspec: add-year-in-discs-phase1).
--
-- El año en discos es una Lámina derivada: se calcula de las escuchas del diario
-- de una persona en ese año. Las escuchas tienen audiencia propia y nacen privadas,
-- así que una fila acá es la decisión del dueño de abrir ese año (sus discos y sus
-- cifras, nunca las escuchas) a quien pueda ver su perfil. No cambia la audiencia
-- de ninguna escucha. Guarda la zona horaria del dueño al compartir: los meses se
-- cuentan en esa zona para cualquier otra persona, así todos ven los mismos meses.
-- =====================================================================

CREATE TABLE year_share (
    user_id    UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    year       SMALLINT NOT NULL,
    time_zone  TEXT NOT NULL,
    shared_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, year),
    CONSTRAINT chk_year_share_year CHECK (year BETWEEN 2000 AND 2100),
    CONSTRAINT chk_year_share_time_zone CHECK (char_length(time_zone) BETWEEN 1 AND 64)
);

ALTER TABLE share_event DROP CONSTRAINT chk_share_event_target_kind;

ALTER TABLE share_event ADD CONSTRAINT chk_share_event_target_kind CHECK (target_kind IN (
    'album', 'song', 'artist', 'genre', 'awards', 'award', 'ceremony',
    'halls', 'hall', 'hall_class', 'collections', 'collection', 'profile',
    'review', 'comment', 'list', 'camino', 'user_collection', 'fingerprint',
    'rating', 'listen', 'top', 'discography', 'tier', 'year'
));
