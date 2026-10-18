-- =====================================================================
-- 0073_award_source_and_voting.sql
-- Fuente de cada ceremonia y tipo de votación de cada premio (openspec: add-four-music-awards,
-- design D9, D9b, D9c).
--   award.voting            quién decide el premio: academy (la academia o la industria), jury (un
--                           jurado), public (el público) o mixed (el público y un comité).
--   award_ceremony.source_url  la URL contra la que se curó la ceremonia (Wikipedia o el sitio
--                           oficial); la página la muestra por la atribución de la fuente.
-- Ambas columnas son nulas hasta la próxima corrida de `scripts/load-awards.ts`, que las escribe desde
-- los archivos de `data/awards/` (fuente de verdad): no se inventan valores de relleno. La página omite
-- el dato mientras falte. Aditivo: el código anterior ignora las columnas.
-- =====================================================================

ALTER TABLE award ADD COLUMN voting TEXT;

ALTER TABLE award ADD CONSTRAINT chk_award_voting
  CHECK (voting IS NULL OR voting IN ('academy', 'jury', 'public', 'mixed'));

ALTER TABLE award_ceremony ADD COLUMN source_url TEXT;

ALTER TABLE award_ceremony ADD CONSTRAINT chk_award_ceremony_source_url
  CHECK (source_url IS NULL OR source_url ~ '^https?://');
