-- =====================================================================
-- 0078_feed_seen_at.sql
-- Marca de la última visita al feed de seguidos (openspec:
-- redesign-feed-people, D1).
--
-- Aditiva y sin backfill: nula = nunca abrió el feed desde esta versión, y la
-- primera visita no marca nada como nuevo (D3). Mismo patrón que
-- `notifications_seen_at` (0075).
-- =====================================================================

ALTER TABLE app_user
    ADD COLUMN feed_seen_at TIMESTAMPTZ;
