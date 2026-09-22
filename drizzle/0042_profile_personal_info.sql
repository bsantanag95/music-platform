-- =====================================================================
-- PROFILE_PERSONAL_INFO - pais y pronombres de lista cerrada
-- =====================================================================

-- Change profile-personal-info (capability profile-personal-info). Dos columnas
-- opcionales, sin backfill: nacen en NULL y ninguna fila existente cambia de
-- comportamiento. `location` (ahora "ciudad o region") y `pronouns` (ahora el valor
-- de "Otro") se conservan tal cual.
--
--   country      codigo ISO 3166-1 alfa-2 en mayusculas. La lista de paises vive en
--                el codigo (src/lib/personal-info.ts), igual que generos y roles:
--                la base solo asegura el FORMATO.
--   pronoun_set  clave de la lista cerrada de pronombres (he | she | they). Sus
--                valores tampoco se validan aqui; la base solo impide el estado
--                mixto: o hay una clave de la lista o hay un texto libre ("Otro"),
--                nunca los dos.
--
-- Cuando el perfil es privado y quien mira no tiene acceso, `getProfileView`
-- (services/profiles/profile-view.ts) vacia estos datos junto con `location` y
-- `pronouns`.

ALTER TABLE app_user
    ADD COLUMN country TEXT,
    ADD COLUMN pronoun_set TEXT;

ALTER TABLE app_user
    ADD CONSTRAINT chk_app_user_country
        CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
    ADD CONSTRAINT chk_app_user_pronouns_exclusive
        CHECK (pronoun_set IS NULL OR pronouns IS NULL);
