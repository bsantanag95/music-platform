-- =====================================================================
-- 0088_year_curation.sql
-- Curaduría de "Tu año en discos": Top 5 elegido y discos ocultos
-- (openspec: add-year-in-discs-phase2).
--
-- year_top guarda el Top 5 que el dueño eligió para un año; sin filas, el Top 5
-- se prellena en cada lectura con sus discos mejor valorados de ese año. Que cada
-- disco haya sido escuchado ese año y no esté oculto es una regla entre tablas:
-- la aplica el servicio al guardar y la lectura descarta lo que dejó de cumplirla.
--
-- year_hidden guarda los discos que el dueño ocultó de un año: desaparecen del
-- calendario, del Top 5, de la imagen y de las cifras. No toca el diario.
-- =====================================================================

CREATE TABLE year_top (
    user_id          UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    year             SMALLINT NOT NULL,
    position         SMALLINT NOT NULL,
    release_group_id UUID NOT NULL REFERENCES release_group (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, year, position),
    CONSTRAINT uq_year_top_disc UNIQUE (user_id, year, release_group_id),
    CONSTRAINT chk_year_top_year CHECK (year BETWEEN 2000 AND 2100),
    CONSTRAINT chk_year_top_position CHECK (position BETWEEN 1 AND 5)
);

CREATE TABLE year_hidden (
    user_id          UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    year             SMALLINT NOT NULL,
    release_group_id UUID NOT NULL REFERENCES release_group (id) ON DELETE CASCADE,
    hidden_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, year, release_group_id),
    CONSTRAINT chk_year_hidden_year CHECK (year BETWEEN 2000 AND 2100)
);
