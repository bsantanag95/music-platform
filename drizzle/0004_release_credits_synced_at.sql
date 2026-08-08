-- Migración 0004: Añadir marca de sincronización de créditos al release
-- Permite detectar releases cacheados antes de la ingesta de créditos
-- y re-sincronizarlos sin re-ingestar el tracklist completo.

ALTER TABLE release
ADD COLUMN credits_synced_at TIMESTAMPTZ;
