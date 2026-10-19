-- =====================================================================
-- 0074_award_kind.sql
-- Salones de la fama como tipo de premio (openspec: add-grammy-hall-of-fame, design D1, D2; ADR 0044).
--   award.kind                 competition (un premio con nominados y ganadores: todos los anteriores)
--                              o hall_of_fame (un salón: incorpora una clase cada año).
--   award_ceremony.edition     pasa a admitir NULL: las clases de un salón no se numeran y numerarlas
--                              sería inventar un dato.
--   award_ceremony.held_on     pasa a poder ser del año de la ceremonia o del anterior: la clase "2021" del
--                              Grammy Hall of Fame se anunció el 21 de diciembre de 2020. Que una competencia
--                              exija el mismo año cruza tablas (`award.kind`): lo valida la carga.
-- `kind` vale 'competition' por omisión porque describe con verdad a todo premio cargado hasta hoy (no es
-- un relleno inventado). Que una competencia exija número de edición y un salón no lo tenga también cruza
-- tablas: lo valida la carga, no un CHECK. Los únicos `(award_id, edition)` ya toleran varios NULL. Aditivo: el
-- código anterior ignora `kind` y trata toda ceremonia como una competencia.
-- =====================================================================

ALTER TABLE award ADD COLUMN kind TEXT NOT NULL DEFAULT 'competition';

ALTER TABLE award ADD CONSTRAINT chk_award_kind
  CHECK (kind IN ('competition', 'hall_of_fame'));

ALTER TABLE award_ceremony ALTER COLUMN edition DROP NOT NULL;

ALTER TABLE award_ceremony DROP CONSTRAINT chk_award_ceremony_edition;

ALTER TABLE award_ceremony ADD CONSTRAINT chk_award_ceremony_edition
  CHECK (edition IS NULL OR edition > 0);

ALTER TABLE award_ceremony DROP CONSTRAINT chk_award_ceremony_held_on;

ALTER TABLE award_ceremony ADD CONSTRAINT chk_award_ceremony_held_on
  CHECK (EXTRACT(YEAR FROM held_on) BETWEEN year - 1 AND year);
