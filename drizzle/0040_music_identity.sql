-- =====================================================================
-- MUSIC_IDENTITY - identidad musical del perfil y hora local
-- =====================================================================

-- Change rework-account-settings, Fase 2 (capability profile-music-identity).
-- Los valores permitidos de cada lista (roles, generos, formatos, preguntas) se
-- validan en la aplicacion (src/lib/music-identity.ts), NO aqui: agregar un
-- genero es cambiar codigo, no una migracion (a diferencia del CHECK de tipos de
-- enlace). La base solo garantiza los topes de cardinalidad.

ALTER TABLE app_user
    ADD COLUMN self_roles         TEXT[]  NOT NULL DEFAULT '{}',
    ADD COLUMN genres             TEXT[]  NOT NULL DEFAULT '{}',
    ADD COLUMN listening_formats  TEXT[]  NOT NULL DEFAULT '{}',
    ADD COLUMN show_local_time    BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE app_user
    ADD CONSTRAINT chk_app_user_self_roles CHECK (cardinality(self_roles) <= 3),
    ADD CONSTRAINT chk_app_user_genres CHECK (cardinality(genres) <= 5),
    ADD CONSTRAINT chk_app_user_listening_formats CHECK (cardinality(listening_formats) <= 5);

-- La zona horaria pasa de texto libre (que ninguna vista mostraba) a un
-- identificador IANA valido. Los valores previos que no sean una zona real se
-- descartan; los que si lo eran se conservan. No es reversible y es aceptado:
-- eran texto libre que nunca se mostro.
UPDATE app_user
    SET timezone = NULL
    WHERE timezone IS NOT NULL
      AND timezone NOT IN (SELECT name FROM pg_timezone_names);

-- Mostrar la hora local exige tener zona: sin ella la opcion no significa nada.
ALTER TABLE app_user
    ADD CONSTRAINT chk_app_user_local_time CHECK (NOT show_local_time OR timezone IS NOT NULL);

-- ---------------------------------------------------------------------
-- USER_PROFILE_PROMPT - preguntas del perfil (hasta 3, una linea cada una)
-- ---------------------------------------------------------------------
-- El conjunto se reemplaza completo al guardar (mismo patron que los enlaces).
-- UNIQUE (user_id, position) con position 0..2 hace que la base impida mas de 3
-- filas por usuario, ademas de la validacion del servicio.

CREATE TABLE user_profile_prompt (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    prompt_key  TEXT NOT NULL,
    answer      TEXT NOT NULL,
    position    SMALLINT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_user_profile_prompt_position CHECK (position BETWEEN 0 AND 2),
    CONSTRAINT chk_user_profile_prompt_answer CHECK (char_length(answer) BETWEEN 1 AND 100 AND answer !~ E'[\r\n]'),
    CONSTRAINT uq_user_profile_prompt_key UNIQUE (user_id, prompt_key),
    CONSTRAINT uq_user_profile_prompt_position UNIQUE (user_id, position)
);
