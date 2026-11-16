-- =====================================================================
-- 0097_profile_tone.sql
-- Tono del perfil (openspec: redesign-user-profile-phase3).
--
-- - `profile_tone`: color de acento del perfil, en hex `#rrggbb` minúscula,
--   derivado de la carátula del álbum definitorio cuando el dueño lo elige o lo
--   cambia (`src/services/profiles/tone.ts`). NULL = sin álbum, sin arte o sin un
--   matiz dominante saturado: el perfil usa el ámbar del sitio.
--
-- Es un dato derivado, no algo que el usuario escribe: se recalcula con
-- `scripts/backfill-profile-tone.ts`. Aditivo: el código anterior ignora la
-- columna.
-- =====================================================================

ALTER TABLE user_showcase
  ADD COLUMN profile_tone text;

ALTER TABLE user_showcase
  ADD CONSTRAINT user_showcase_profile_tone_hex
  CHECK (profile_tone IS NULL OR profile_tone ~ '^#[0-9a-f]{6}$');
