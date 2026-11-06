-- =====================================================================
-- 0082_share_event_story.sql
-- Formato Historia en share_event (openspec: add-share-user-actions-phase3).
-- La lista del CHECK es la de src/lib/share/kinds.ts.
-- =====================================================================

ALTER TABLE share_event DROP CONSTRAINT chk_share_event_format;

ALTER TABLE share_event ADD CONSTRAINT chk_share_event_format CHECK (format IN ('link', 'story'));
