-- =====================================================================
-- 0068_music_awards.sql
-- Premios musicales curados (openspec: add-music-awards, ADR 0032).
-- La fuente de verdad son los archivos de `data/awards/`; estas tablas las
-- llena `scripts/load-awards.ts` y no las escribe la aplicación. Por eso no
-- llevan `updated_at`: la carga es idempotente y dos corridas seguidas no deben
-- cambiar ninguna fila.
--
--   award ─< award_ceremony ─< award_category_edition >─ award_category
--                                       └─< award_nomination
--
-- Una nominación tiene siempre su texto visible y, como mucho, un sujeto del
-- catálogo. Las FK de sujeto son SET NULL: borrar el disco no borra la
-- nominación, que vuelve a mostrarse como texto. Que el tipo de sujeto coincida
-- con la categoría y que una edición `winner_only` solo tenga ganadores cruza
-- tablas: lo valida el cargador (ver design.md D1).
-- Aditivo: el código anterior ignora estas tablas.
-- =====================================================================

CREATE TABLE award (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  TEXT NOT NULL UNIQUE,
  CONSTRAINT chk_award_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE award_ceremony (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id  UUID NOT NULL REFERENCES award (id) ON DELETE CASCADE,
  -- Año de la ceremonia (no el de elegibilidad): "Grammy 2025" es la 67.ª, de febrero de 2025.
  year      SMALLINT NOT NULL,
  edition   SMALLINT NOT NULL,
  held_on   DATE NOT NULL,
  CONSTRAINT uq_award_ceremony_year UNIQUE (award_id, year),
  CONSTRAINT uq_award_ceremony_edition UNIQUE (award_id, edition),
  CONSTRAINT chk_award_ceremony_year CHECK (year BETWEEN 1900 AND 2100),
  CONSTRAINT chk_award_ceremony_edition CHECK (edition > 0),
  CONSTRAINT chk_award_ceremony_held_on CHECK (EXTRACT(YEAR FROM held_on) = year)
);

CREATE TABLE award_category (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id        UUID NOT NULL REFERENCES award (id) ON DELETE CASCADE,
  -- Clave estable para la historia de la categoría. Una categoría renombrada, fusionada o
  -- dividida es otra fila, enlazada con `predecessor_id`.
  key             TEXT NOT NULL,
  tier            TEXT NOT NULL,
  subject_kind    TEXT NOT NULL,
  -- Canción del año premia la composición: su sujeto es la grabación ancla, pero se destacan sus autores.
  honors          TEXT NOT NULL DEFAULT 'performer',
  name_es         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  predecessor_id  UUID REFERENCES award_category (id) ON DELETE SET NULL,
  sort_order      SMALLINT NOT NULL,
  CONSTRAINT uq_award_category_key UNIQUE (award_id, key),
  CONSTRAINT chk_award_category_key CHECK (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT chk_award_category_tier CHECK (tier IN ('general', 'genre')),
  CONSTRAINT chk_award_category_subject CHECK (subject_kind IN ('release_group', 'recording', 'artist')),
  CONSTRAINT chk_award_category_honors CHECK (honors IN ('performer', 'songwriter')),
  CONSTRAINT chk_award_category_not_own_predecessor CHECK (predecessor_id IS NULL OR predecessor_id <> id)
);

CREATE TABLE award_category_edition (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ceremony_id  UUID NOT NULL REFERENCES award_ceremony (id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES award_category (id) ON DELETE CASCADE,
  coverage     TEXT NOT NULL,
  CONSTRAINT uq_award_category_edition UNIQUE (ceremony_id, category_id),
  CONSTRAINT chk_award_category_edition_coverage CHECK (coverage IN ('complete', 'winner_only'))
);

CREATE INDEX idx_award_category_edition_category ON award_category_edition (category_id);

CREATE TABLE award_nomination (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_edition_id  UUID NOT NULL REFERENCES award_category_edition (id) ON DELETE CASCADE,
  won                  BOOLEAN NOT NULL,
  nominee_text         TEXT NOT NULL,
  credit_text          TEXT,
  release_group_id     UUID REFERENCES release_group (id) ON DELETE SET NULL,
  recording_id         UUID REFERENCES recording (id) ON DELETE SET NULL,
  artist_id            UUID REFERENCES artist (id) ON DELETE SET NULL,
  -- Disco donde aparece una grabación nominada (ADR 0032, punto 3): de ahí salen su carátula y el enlace
  -- "del álbum …", porque el stub de la grabación no tiene pistas. Sin CHECK contra `recording_id`: el
  -- SET NULL de la grabación no debe poder romper el borrado.
  anchor_release_group_id UUID REFERENCES release_group (id) ON DELETE SET NULL,
  sort_order           SMALLINT NOT NULL,
  CONSTRAINT chk_award_nomination_text CHECK (length(btrim(nominee_text)) > 0),
  CONSTRAINT chk_award_nomination_one_subject CHECK (
    num_nonnulls(release_group_id, recording_id, artist_id) <= 1
  ),
  CONSTRAINT uq_award_nomination_order UNIQUE (category_edition_id, sort_order)
);

-- Para leer los premios de un álbum, grabación o artista (insignias del cambio siguiente).
CREATE INDEX idx_award_nomination_release_group ON award_nomination (release_group_id)
  WHERE release_group_id IS NOT NULL;
CREATE INDEX idx_award_nomination_recording ON award_nomination (recording_id)
  WHERE recording_id IS NOT NULL;
CREATE INDEX idx_award_nomination_artist ON award_nomination (artist_id)
  WHERE artist_id IS NOT NULL;
