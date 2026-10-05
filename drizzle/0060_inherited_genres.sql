-- =====================================================================
-- 0060_inherited_genres.sql
-- Herencia de géneros materializada (openspec: add-genre-artist-discovery,
-- ADR 0028).
--
-- La rama de herencia de `release_group_effective_genre` (0057) hacía, por
-- CADA release-group, una búsqueda lateral de su primer crédito principal y
-- de los 3 primeros géneros de estilo de ese artista: 360 ms con 58 mil
-- release-groups, lineal con el catálogo, y ningún predicado por género se
-- empuja dentro de ella. Es el suelo de rendimiento de las páginas de género.
--
-- - `release_group_inherited_genre`: SOLO la herencia (los 3 primeros géneros
--   de estilo del primer artista principal). El puntaje y los votos no se
--   guardan: la vista sigue calculándolos en lectura, así que votar o quitar
--   una semilla se refleja al instante sin mantenimiento.
-- - `recompute_inherited_genres(uuid[])`: recalcula esos álbumes (idempotente).
--   `rebuild_inherited_genres()` reconstruye todo (migración y reparación).
-- - Triggers que mantienen la tabla: `credit` (por fila, solo créditos
--   principales), `artist_genre_seed` (por sentencia, con tablas de transición)
--   y `genre` (cambio de `kind`).
-- - `release_group_effective_genre` se redefine con las MISMAS columnas, tipos
--   y semántica: la rama propia (puntaje > 0) queda igual y la heredada lee de
--   la tabla, exigiendo `kind = 'style'` y la ausencia de puntaje positivo en
--   lectura.
--
-- Reversión: devolver la vista a la definición de 0057 (abajo) y borrar los
-- triggers, las funciones y la tabla.
--
--   CREATE OR REPLACE VIEW release_group_effective_genre AS
--   SELECT sc.release_group_id, sc.genre_id,
--          (ROW_NUMBER() OVER (PARTITION BY sc.release_group_id
--             ORDER BY sc.score DESC, sc.seed_position NULLS LAST, g.name))::smallint AS position,
--          false AS inherited, sc.score
--   FROM release_group_genre_score sc JOIN genre g ON g.id = sc.genre_id
--   WHERE sc.score > 0
--   UNION ALL
--   SELECT rg.id, a.genre_id, a.position, true, 0
--   FROM release_group rg
--   JOIN LATERAL (SELECT c.artist_id FROM credit c
--                 WHERE c.release_group_id = rg.id AND c.role = 'primary'
--                 ORDER BY c.position LIMIT 1) pc ON true
--   JOIN LATERAL (SELECT s.genre_id, s.position FROM artist_genre_seed s
--                 JOIN genre g ON g.id = s.genre_id AND g.kind = 'style'
--                 WHERE s.artist_id = pc.artist_id ORDER BY s.position LIMIT 3) a ON true
--   WHERE NOT EXISTS (SELECT 1 FROM release_group_genre_score sc2
--                     WHERE sc2.release_group_id = rg.id AND sc2.score > 0);
-- =====================================================================

CREATE TABLE release_group_inherited_genre (
    release_group_id  UUID NOT NULL REFERENCES release_group(id) ON DELETE CASCADE,
    genre_id          UUID NOT NULL REFERENCES genre(id) ON DELETE CASCADE,
    position          SMALLINT NOT NULL,
    PRIMARY KEY (release_group_id, genre_id),
    CONSTRAINT chk_release_group_inherited_genre_position CHECK (position >= 0)
);

-- Los listados y conteos por género entran por aquí.
CREATE INDEX idx_release_group_inherited_genre_genre ON release_group_inherited_genre (genre_id);

-- Recalcula la herencia de los álbumes dados: primer crédito principal (por posición) y los 3 primeros
-- géneros de estilo de ese artista. Idempotente; `ON CONFLICT` tolera dos recálculos concurrentes.
CREATE FUNCTION recompute_inherited_genres(p_release_group_ids UUID[]) RETURNS void
LANGUAGE sql
AS $$
    DELETE FROM release_group_inherited_genre WHERE release_group_id = ANY(p_release_group_ids);
    INSERT INTO release_group_inherited_genre (release_group_id, genre_id, position)
    SELECT rg.id, a.genre_id, a.position
    FROM release_group rg
    JOIN LATERAL (
        SELECT c.artist_id FROM credit c
        WHERE c.release_group_id = rg.id AND c.role = 'primary'
        ORDER BY c.position LIMIT 1
    ) pc ON true
    JOIN LATERAL (
        SELECT s.genre_id, s.position FROM artist_genre_seed s
        JOIN genre g ON g.id = s.genre_id AND g.kind = 'style'
        WHERE s.artist_id = pc.artist_id
        ORDER BY s.position LIMIT 3
    ) a ON true
    WHERE rg.id = ANY(p_release_group_ids)
    ON CONFLICT (release_group_id, genre_id) DO UPDATE SET position = EXCLUDED.position;
$$;

-- Recalcula los álbumes donde los artistas dados figuran como principales.
CREATE FUNCTION recompute_inherited_genres_for_artists(p_artist_ids UUID[]) RETURNS void
LANGUAGE sql
AS $$
    SELECT recompute_inherited_genres(COALESCE(array_agg(DISTINCT c.release_group_id), '{}'::uuid[]))
    FROM credit c
    WHERE c.artist_id = ANY(p_artist_ids) AND c.role = 'primary' AND c.release_group_id IS NOT NULL;
$$;

-- Reconstruye toda la tabla (migración y reparación si se sospecha un desfase).
CREATE FUNCTION rebuild_inherited_genres() RETURNS void
LANGUAGE sql
AS $$
    DELETE FROM release_group_inherited_genre;
    INSERT INTO release_group_inherited_genre (release_group_id, genre_id, position)
    SELECT rg.id, a.genre_id, a.position
    FROM release_group rg
    JOIN LATERAL (
        SELECT c.artist_id FROM credit c
        WHERE c.release_group_id = rg.id AND c.role = 'primary'
        ORDER BY c.position LIMIT 1
    ) pc ON true
    JOIN LATERAL (
        SELECT s.genre_id, s.position FROM artist_genre_seed s
        JOIN genre g ON g.id = s.genre_id AND g.kind = 'style'
        WHERE s.artist_id = pc.artist_id
        ORDER BY s.position LIMIT 3
    ) a ON true;
$$;

-- Créditos: solo importan los principales de un álbum (los de invitado y los de grabaciones no heredan).
CREATE FUNCTION fn_credit_inherited_genres() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP IN ('DELETE', 'UPDATE') AND OLD.release_group_id IS NOT NULL AND OLD.role = 'primary' THEN
        PERFORM recompute_inherited_genres(ARRAY[OLD.release_group_id]);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.release_group_id IS NOT NULL AND NEW.role = 'primary' THEN
        PERFORM recompute_inherited_genres(ARRAY[NEW.release_group_id]);
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_credit_inherited_genres
AFTER INSERT OR UPDATE OR DELETE ON credit
FOR EACH ROW EXECUTE FUNCTION fn_credit_inherited_genres();

-- Semillas del artista: un recálculo por sentencia (reemplazar las semillas borra e inserta varias filas).
CREATE FUNCTION fn_seed_insert_inherited_genres() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM recompute_inherited_genres_for_artists((SELECT array_agg(DISTINCT artist_id) FROM new_rows));
    RETURN NULL;
END;
$$;

CREATE FUNCTION fn_seed_delete_inherited_genres() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM recompute_inherited_genres_for_artists((SELECT array_agg(DISTINCT artist_id) FROM old_rows));
    RETURN NULL;
END;
$$;

CREATE FUNCTION fn_seed_update_inherited_genres() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM recompute_inherited_genres_for_artists(
        (SELECT array_agg(DISTINCT artist_id) FROM (SELECT artist_id FROM old_rows UNION SELECT artist_id FROM new_rows) u)
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_artist_genre_seed_insert_inherited
AFTER INSERT ON artist_genre_seed
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT EXECUTE FUNCTION fn_seed_insert_inherited_genres();

CREATE TRIGGER trg_artist_genre_seed_delete_inherited
AFTER DELETE ON artist_genre_seed
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT EXECUTE FUNCTION fn_seed_delete_inherited_genres();

CREATE TRIGGER trg_artist_genre_seed_update_inherited
AFTER UPDATE ON artist_genre_seed
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
FOR EACH STATEMENT EXECUTE FUNCTION fn_seed_update_inherited_genres();

-- Un género que deja (o vuelve) a ser de estilo cambia los 3 primeros de los artistas que lo tienen.
CREATE FUNCTION fn_genre_kind_inherited_genres() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM recompute_inherited_genres_for_artists(
        (SELECT array_agg(DISTINCT artist_id) FROM artist_genre_seed WHERE genre_id = NEW.id)
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_genre_kind_inherited
AFTER UPDATE OF kind ON genre
FOR EACH ROW WHEN (OLD.kind IS DISTINCT FROM NEW.kind)
EXECUTE FUNCTION fn_genre_kind_inherited_genres();

-- Relleno inicial desde la definición actual de la herencia.
SELECT rebuild_inherited_genres();

-- La vista conserva columnas, tipos y semántica; la rama heredada lee de la tabla.
DROP VIEW release_group_effective_genre;

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
SELECT ig.release_group_id, ig.genre_id, ig.position, true AS inherited, 0 AS score
FROM release_group_inherited_genre ig
JOIN genre g ON g.id = ig.genre_id AND g.kind = 'style'
WHERE NOT EXISTS (
    SELECT 1
    FROM release_group_genre_score sc2
    WHERE sc2.release_group_id = ig.release_group_id AND sc2.score > 0
);
