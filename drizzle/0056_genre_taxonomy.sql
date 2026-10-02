-- =====================================================================
-- Migración 0056 — taxonomía de géneros y semillas de Wikidata
-- =====================================================================
-- openspec: add-genre-taxonomy (ADR 0023).
--
-- - `genre`: la lista oficial de géneros de MusicBrainz (dump core, CC0).
--   Las filas las escribe `scripts/load-genre-taxonomy.ts` desde
--   `data/genres/taxonomy.json`; esta migración solo crea el esquema.
--   `slug` es la clave estable (URL, API e identidad musical), única y en
--   inglés para todos los idiomas. `name` es el de MusicBrainz y `name_es` la
--   etiqueta en español de Wikidata (P8052), sin traducción automática.
--   `kind`: estilo, descriptor (Instrumental, Navideña, Orquestal) u oculto
--   (nunca se muestra ni cuenta; también un género que MusicBrainz retiró).
-- - `genre_relation`: "el género es subgénero de / fusión de / influido por
--   el género relacionado", la dirección natural para subir hacia la raíz.
-- - `genre_family` + `genre_family_member`: las 20 familias curadas (N:M).
--   Las familias son vocabulario del producto y se insertan acá; sus nombres
--   viven en `messages/*`. La pertenencia la calcula el script de generación.
-- - `artist_genre_seed` / `release_group_genre_seed`: géneros semilla desde
--   Wikidata P136 (CC0), en el orden de Wikidata. Separados de los votos de la
--   comunidad (cambio add-genre-votes). Se reemplazan completas en cada
--   sincronización, por eso no llevan `updated_at`.
-- - `release_group.wikidata_id`: entidad que MusicBrainz declara para el
--   álbum (relación `wikidata` del browse de discografía, ADR 0021/0023).
--   `genres_synced_at`: NULL = sus semillas nunca se sincronizaron; vigencia
--   de 30 días. El artista usa `wikimedia_synced_at`.
-- - `release_group_effective_genre`: géneros efectivos de un álbum, con
--   herencia del artista principal. Única definición para todas las lecturas.
-- - Se elimina `release_group_tag` (datos sembrados a mano, no reales).
-- - `app_user.genres` pasa a claves de la taxonomía (falla cerrada si una
--   elección migrada supera el tope de 5).
-- =====================================================================

CREATE TABLE genre (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mbid         UUID NOT NULL UNIQUE,
    slug         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    name_es      TEXT,
    wikidata_id  TEXT,
    kind         TEXT NOT NULL DEFAULT 'style',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_genre_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT chk_genre_name CHECK (length(btrim(name)) > 0),
    CONSTRAINT chk_genre_name_es CHECK (name_es IS NULL OR length(btrim(name_es)) > 0),
    CONSTRAINT chk_genre_wikidata_id CHECK (wikidata_id IS NULL OR wikidata_id ~ '^Q[0-9]+$'),
    CONSTRAINT chk_genre_kind CHECK (kind IN ('style', 'descriptor', 'hidden'))
);

-- Traducción QID de Wikidata → género al sembrar (P136).
CREATE INDEX idx_genre_wikidata_id ON genre (wikidata_id) WHERE wikidata_id IS NOT NULL;

CREATE TRIGGER trg_genre_touch
BEFORE UPDATE ON genre
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE genre_relation (
    genre_id          UUID NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
    related_genre_id  UUID NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
    kind              TEXT NOT NULL,
    PRIMARY KEY (genre_id, related_genre_id, kind),
    CONSTRAINT chk_genre_relation_kind CHECK (kind IN ('subgenre_of', 'fusion_of', 'influenced_by')),
    CONSTRAINT chk_genre_relation_not_self CHECK (genre_id <> related_genre_id)
);

-- Bajar del padre a sus subgéneros (listado por género con subgéneros).
CREATE INDEX idx_genre_relation_related ON genre_relation (related_genre_id, kind);

CREATE TABLE genre_family (
    key       TEXT PRIMARY KEY,
    tier      TEXT NOT NULL,
    position  SMALLINT NOT NULL UNIQUE,
    CONSTRAINT chk_genre_family_key CHECK (key ~ '^[a-z]+(-[a-z]+)*$'),
    CONSTRAINT chk_genre_family_tier CHECK (tier IN ('main', 'more')),
    CONSTRAINT chk_genre_family_position CHECK (position > 0)
);

-- 17 principales y 3 secundarias (detrás de "Más"), en el orden de la interfaz.
INSERT INTO genre_family (key, tier, position) VALUES
    ('rock', 'main', 1),
    ('metal', 'main', 2),
    ('punk', 'main', 3),
    ('pop', 'main', 4),
    ('electronic', 'main', 5),
    ('hip-hop', 'main', 6),
    ('rnb', 'main', 7),
    ('jazz', 'main', 8),
    ('blues', 'main', 9),
    ('folk', 'main', 10),
    ('country', 'main', 11),
    ('classical', 'main', 12),
    ('experimental', 'main', 13),
    ('ambient', 'main', 14),
    ('caribbean', 'main', 15),
    ('latin', 'main', 16),
    ('brazilian', 'main', 17),
    ('spoken', 'more', 18),
    ('religious', 'more', 19),
    ('world', 'more', 20);

CREATE TABLE genre_family_member (
    genre_id    UUID NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
    family_key  TEXT NOT NULL REFERENCES genre_family(key) ON DELETE RESTRICT,
    PRIMARY KEY (genre_id, family_key)
);

CREATE INDEX idx_genre_family_member_family ON genre_family_member (family_key);

-- Un género retirado queda `hidden` en vez de borrarse: RESTRICT protege las semillas.
CREATE TABLE artist_genre_seed (
    artist_id   UUID NOT NULL REFERENCES artist(id) ON DELETE CASCADE,
    genre_id    UUID NOT NULL REFERENCES genre(id) ON DELETE RESTRICT,
    position    SMALLINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (artist_id, genre_id),
    CONSTRAINT chk_artist_genre_seed_position CHECK (position >= 0)
);

CREATE INDEX idx_artist_genre_seed_genre ON artist_genre_seed (genre_id);

CREATE TABLE release_group_genre_seed (
    release_group_id  UUID NOT NULL REFERENCES release_group(id) ON DELETE CASCADE,
    genre_id          UUID NOT NULL REFERENCES genre(id) ON DELETE RESTRICT,
    position          SMALLINT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (release_group_id, genre_id),
    CONSTRAINT chk_release_group_genre_seed_position CHECK (position >= 0)
);

CREATE INDEX idx_release_group_genre_seed_genre ON release_group_genre_seed (genre_id);

ALTER TABLE release_group
    ADD COLUMN wikidata_id       TEXT,
    ADD COLUMN genres_synced_at  TIMESTAMPTZ,
    ADD CONSTRAINT chk_release_group_wikidata_id CHECK (wikidata_id IS NULL OR wikidata_id ~ '^Q[0-9]+$');

-- Géneros efectivos de un álbum: sus semillas propias visibles si tiene alguna;
-- si no, los 3 primeros géneros de estilo de su artista principal (primer
-- crédito `primary` por `position`, misma regla que
-- src/services/catalog/primary-artists.ts), marcados como heredados. Solo 3:
-- un género secundario del artista (5.º de 7 en Pink Floyd) no debe extenderse
-- a toda su discografía; los descriptores no se heredan. Nunca incluye géneros
-- ocultos. El cambio add-genre-votes la redefine en una migración nueva para
-- sumar los votos de la comunidad.
CREATE VIEW release_group_effective_genre AS
SELECT s.release_group_id, s.genre_id, s.position, false AS inherited
FROM release_group_genre_seed s
JOIN genre g ON g.id = s.genre_id AND g.kind <> 'hidden'
UNION ALL
SELECT rg.id AS release_group_id, a.genre_id, a.position, true AS inherited
FROM release_group rg
JOIN LATERAL (
    SELECT c.artist_id
    FROM credit c
    WHERE c.release_group_id = rg.id AND c.role = 'primary'
    ORDER BY c.position
    LIMIT 1
) pc ON true
JOIN LATERAL (
    SELECT s.genre_id, s.position
    FROM artist_genre_seed s
    JOIN genre g ON g.id = s.genre_id AND g.kind = 'style'
    WHERE s.artist_id = pc.artist_id
    ORDER BY s.position
    LIMIT 3
) a ON true
WHERE NOT EXISTS (
    SELECT 1
    FROM release_group_genre_seed s2
    JOIN genre g2 ON g2.id = s2.genre_id AND g2.kind <> 'hidden'
    WHERE s2.release_group_id = rg.id
);

-- Datos sembrados a mano (scripts/seed-release-group-tags.ts): no hay nada real que migrar.
DROP TABLE release_group_tag;

-- "Géneros que me mueven" pasa a claves de la taxonomía. Solo cambian dos
-- claves (el resto ya coincide con su slug): `soul-funk` → `soul`, `funk` e
-- `indie` → `indie-rock`, `indie-pop`. Sin duplicados y conservando el orden
-- elegido. Si una elección migrada supera el tope de 5 se aborta en vez de
-- recortarla (no se inventan ni se pierden datos del usuario).
DO $$
DECLARE
    u RECORD;
    migrated TEXT[];
BEGIN
    FOR u IN
        SELECT id, username, genres FROM app_user WHERE genres && ARRAY['soul-funk', 'indie']::TEXT[]
    LOOP
        SELECT array_agg(t.g ORDER BY t.o1, t.o2) INTO migrated
        FROM (
            SELECT DISTINCT ON (m.g) m.g, e.o1, m.o2
            FROM unnest(u.genres) WITH ORDINALITY AS e(x, o1)
            CROSS JOIN LATERAL unnest(
                CASE e.x
                    WHEN 'soul-funk' THEN ARRAY['soul', 'funk']
                    WHEN 'indie' THEN ARRAY['indie-rock', 'indie-pop']
                    ELSE ARRAY[e.x]
                END
            ) WITH ORDINALITY AS m(g, o2)
            ORDER BY m.g, e.o1, m.o2
        ) t;

        IF cardinality(migrated) > 5 THEN
            RAISE EXCEPTION 'app_user % (%): sus géneros migrados (%) superan el tope de 5; resolver a mano antes de migrar',
                u.username, u.id, array_to_string(migrated, ', ');
        END IF;

        UPDATE app_user SET genres = migrated WHERE id = u.id;
    END LOOP;
END $$;
