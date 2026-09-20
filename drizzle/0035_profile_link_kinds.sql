-- =====================================================================
-- PROFILE_LINK_KINDS - tipos de enlace X, TikTok y Spotify
-- =====================================================================

-- Cambio add-profile-link-validation. Amplia el conjunto cerrado de
-- user_profile_link.kind con 'x', 'tiktok' y 'spotify'. No toca filas.
--
-- El CHECK de la migracion 0014 se declaro en linea y sin nombre, asi que
-- Postgres lo llamo user_profile_link_kind_check; el espejo de schema.ts lo
-- llama chk_user_profile_link_kind. Se eliminan ambos nombres (IF EXISTS) y se
-- deja uno solo, con el nombre del espejo.
ALTER TABLE user_profile_link
    DROP CONSTRAINT IF EXISTS user_profile_link_kind_check;

ALTER TABLE user_profile_link
    DROP CONSTRAINT IF EXISTS chk_user_profile_link_kind;

ALTER TABLE user_profile_link
    ADD CONSTRAINT chk_user_profile_link_kind
    CHECK (
        kind IN (
            'website', 'bandcamp', 'lastfm', 'discogs',
            'instagram', 'youtube', 'soundcloud',
            'x', 'tiktok', 'spotify',
            'other'
        )
    );

-- Rollback (documentado, no se ejecuta): antes de restaurar el CHECK de ocho
-- tipos hay que convertir las filas nuevas:
--   UPDATE user_profile_link SET kind = 'other' WHERE kind IN ('x', 'tiktok', 'spotify');
