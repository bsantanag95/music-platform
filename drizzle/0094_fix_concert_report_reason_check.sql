-- =====================================================================
-- 0094_fix_concert_report_reason_check.sql
-- Corrige el CHECK chk_content_report_reason_code de la 0093
-- (add-shared-concerts-phase2): con reason_code nulo, `reason_code IN (...)`
-- da NULL, `false OR NULL` es NULL y un CHECK que evalúa NULL se acepta, así que
-- un reporte de concierto sin motivo cerrado pasaba. Lo detectó
-- scripts/smoke-test-community-concerts.ts. Se exige `IS NOT NULL` explícito.
-- La 0093 ya está aplicada: no se edita (AGENTS.md).
-- =====================================================================

ALTER TABLE content_report
    DROP CONSTRAINT chk_content_report_reason_code,
    ADD CONSTRAINT chk_content_report_reason_code CHECK (
        (concert_id IS NULL AND reason_code IS NULL)
        OR (
            concert_id IS NOT NULL
            AND reason_code IS NOT NULL
            AND reason_code IN ('did_not_happen', 'duplicate', 'wrong_data')
        )
    );
