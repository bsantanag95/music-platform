-- =====================================================================
-- 0098_list_theme.sql
-- Tema y "sobre qué" de una lista (openspec: add-list-themes-phase1).
--
-- - `theme`: para qué existe la lista, de un vocabulario cerrado de diez
--   valores (fuente en la app: LIST_THEMES de src/services/lists/types.ts; un
--   test compara ambas listas). NULL = "Sin tema": listas previas a este
--   cambio y altas del sistema que aún no lo declaran (colecciones generadas,
--   borradores editoriales). La obligatoriedad para la persona vive en el
--   contrato de la API, no en la base.
-- - `subject_artist_id` / `subject_genre_id`: de qué trata la lista, a lo
--   sumo uno; independiente de su contenido.
--
-- Sin backfill: no se deduce ningún tema del título. Aditivo: el código
-- anterior ignora las columnas.
-- =====================================================================

ALTER TABLE user_list
  ADD COLUMN theme text,
  ADD COLUMN subject_artist_id uuid REFERENCES artist(id) ON DELETE SET NULL,
  ADD COLUMN subject_genre_id uuid REFERENCES genre(id) ON DELETE SET NULL;

ALTER TABLE user_list
  ADD CONSTRAINT chk_user_list_theme
  CHECK (theme IS NULL OR theme IN (
    'start_here', 'recommendations', 'personal_ranking', 'hidden_gems', 'moment',
    'history', 'connections', 'year_review', 'curiosities', 'other'
  ));

ALTER TABLE user_list
  ADD CONSTRAINT chk_user_list_single_subject
  CHECK (num_nonnulls(subject_artist_id, subject_genre_id) <= 1);

CREATE INDEX idx_user_list_theme_created
  ON user_list (theme, created_at DESC)
  WHERE theme IS NOT NULL;

CREATE INDEX idx_user_list_subject_artist
  ON user_list (subject_artist_id)
  WHERE subject_artist_id IS NOT NULL;

CREATE INDEX idx_user_list_subject_genre
  ON user_list (subject_genre_id)
  WHERE subject_genre_id IS NOT NULL;
