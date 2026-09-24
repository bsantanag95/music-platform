-- =====================================================================
-- Migración 0047 — espejo propio de carátulas
-- =====================================================================
-- openspec: mirror-cover-art.
--
-- `cover_storage_key`: clave del objeto espejado en el storage propio
-- (`covers/{mbid}/{hash}.webp`). Es la fuente de verdad para operar el
-- storage; `cover_thumb_url` sigue siendo "la URL servible" (espejo o CAA),
-- denormalizada, para no tocar los ~25 lectores del read-model.
--
-- `cover_checked_at`: momento de la última verificación concluyente contra
-- Cover Art Archive (carátula encontrada o 404). Acota el reintento de
-- negativos a una vez cada 7 días. Sin backfill: la verificación del `HEAD`
-- viejo es más débil que la del `GET` nuevo y su momento es desconocido;
-- fijar `now()` inventaría una verificación. Una `cover_thumb_url` no nula ya
-- cuenta como resuelta para la grilla, así que no hace falta.
--
-- `cover_blocked_at`: marca de retiro a pedido. Un release-group con esta
-- marca no se vuelve a resolver, espejar ni mostrar por hotlink.
-- =====================================================================

ALTER TABLE release_group ADD COLUMN cover_storage_key TEXT UNIQUE;
ALTER TABLE release_group ADD COLUMN cover_checked_at TIMESTAMPTZ;
ALTER TABLE release_group ADD COLUMN cover_blocked_at TIMESTAMPTZ;
