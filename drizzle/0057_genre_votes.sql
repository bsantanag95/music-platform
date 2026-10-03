-- =====================================================================
-- 0057_genre_votes.sql
-- Votos de la comunidad sobre los géneros de un álbum (openspec:
-- add-genre-votes, ADR 0025).
--
-- - `release_group_genre_vote`: un voto (+1 / -1) por persona, álbum y
--   género. Votar un género que el álbum no tiene lo propone. El tope de 8
--   por persona y álbum, que el género sea de estilo y que la persona haya
--   interactuado con el álbum se validan en el servicio.
-- - `release_group_genre_score`: puntaje por álbum y género = semilla propia
--   (vale 1) + votos de cuentas no desactivadas.
-- - `release_group_effective_genre` se redefine sobre el puntaje: géneros con
--   puntaje > 0 ordenados por puntaje; si no hay ninguno, los 3 primeros
--   géneros de estilo del artista principal (heredados). Mismas columnas que
--   en 0056 más `score` al final: los lectores existentes no cambian.
-- =====================================================================

CREATE TABLE release_group_genre_vote (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    release_group_id  UUID NOT NULL REFERENCES release_group(id) ON DELETE CASCADE,
    genre_id          UUID NOT NULL REFERENCES genre(id) ON DELETE RESTRICT,
    value             SMALLINT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_release_group_genre_vote UNIQUE (user_id, release_group_id, genre_id),
    CONSTRAINT chk_release_group_genre_vote_value CHECK (value IN (-1, 1))
);

-- Puntaje de un álbum y votos de una persona en un álbum.
CREATE INDEX idx_release_group_genre_vote_album ON release_group_genre_vote (release_group_id, genre_id);

CREATE TRIGGER trg_release_group_genre_vote_touch
BEFORE UPDATE ON release_group_genre_vote
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

DROP VIEW release_group_effective_genre;

CREATE VIEW release_group_genre_score AS
SELECT
    u.release_group_id,
    u.genre_id,
    SUM(u.seed)::int AS seed,
    SUM(u.up)::int AS up,
    SUM(u.down)::int AS down,
    (SUM(u.seed) + SUM(u.up) - SUM(u.down))::int AS score,
    MIN(u.seed_position)::smallint AS seed_position
FROM (
    SELECT s.release_group_id, s.genre_id, 1 AS seed, 0 AS up, 0 AS down, s.position::int AS seed_position
    FROM release_group_genre_seed s
    JOIN genre g ON g.id = s.genre_id AND g.kind <> 'hidden'
    UNION ALL
    SELECT v.release_group_id, v.genre_id, 0, (v.value = 1)::int, (v.value = -1)::int, NULL::int
    FROM release_group_genre_vote v
    JOIN genre g ON g.id = v.genre_id AND g.kind = 'style'
    JOIN app_user au ON au.id = v.user_id AND au.deactivated_at IS NULL
) u
GROUP BY u.release_group_id, u.genre_id;

CREATE VIEW release_group_effective_genre AS
SELECT
    sc.release_group_id,
    sc.genre_id,
    (ROW_NUMBER() OVER (
        PARTITION BY sc.release_group_id
        ORDER BY sc.score DESC, sc.seed_position NULLS LAST, g.name
    ))::smallint AS position,
    false AS inherited,
    sc.score
FROM release_group_genre_score sc
JOIN genre g ON g.id = sc.genre_id
WHERE sc.score > 0
UNION ALL
SELECT rg.id AS release_group_id, a.genre_id, a.position, true AS inherited, 0 AS score
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
    FROM release_group_genre_score sc2
    WHERE sc2.release_group_id = rg.id AND sc2.score > 0
);
