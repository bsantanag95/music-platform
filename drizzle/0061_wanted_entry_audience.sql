-- =====================================================================
-- 0061_wanted_entry_audience.sql
-- Audiencia por entrada de la wishlist ("En tu búsqueda") para que una alta
-- pueda aparecer en el feed de seguidos (openspec: expand-feed-coverage, D5).
--
-- Hasta ahora la wishlist era privada del dueño por diseño (0028). Las
-- entradas existentes quedan `private`: es exactamente la visibilidad que ya
-- tenían, así que no es un backfill inventado y nada se expone. Después se
-- cambia el DEFAULT a `followers` (default del tipo, simétrico a
-- collection_entry): el servicio siempre pasa la audiencia resuelta con
-- `resolveNewContentAudience`, el DEFAULT solo es red de seguridad.
-- Aditivo: el código anterior ignora la columna.
-- =====================================================================

ALTER TABLE wanted_entry
  ADD COLUMN audience TEXT NOT NULL DEFAULT 'private'
    CONSTRAINT chk_wanted_entry_audience CHECK (audience IN ('private', 'followers', 'public'));

ALTER TABLE wanted_entry
  ALTER COLUMN audience SET DEFAULT 'followers';
