-- =====================================================================
-- PROFILE_LINK_KINDS - se unifican 'website' y 'other' en 'other'
-- =====================================================================

-- Cambio add-profile-link-validation. 'website' y 'other' eran identicos
-- (misma validacion y misma URL; solo cambiaba la etiqueta), asi que se deja un
-- unico tipo: 'other', mostrado como "Enlace". Las filas existentes de tipo
-- 'website' pasan a 'other' conservando la URL, la posicion y el usuario.
UPDATE user_profile_link
    SET kind = 'other'
    WHERE kind = 'website';

ALTER TABLE user_profile_link
    DROP CONSTRAINT IF EXISTS chk_user_profile_link_kind;

ALTER TABLE user_profile_link
    ADD CONSTRAINT chk_user_profile_link_kind
    CHECK (
        kind IN (
            'bandcamp', 'lastfm', 'discogs',
            'instagram', 'youtube', 'soundcloud',
            'x', 'tiktok', 'spotify',
            'other'
        )
    );

-- Rollback (documentado, no se ejecuta): restaurar el CHECK con 'website' es
-- seguro, pero la conversion de datos no se puede revertir porque ya no se sabe
-- cuales de las filas 'other' fueron 'website'.
