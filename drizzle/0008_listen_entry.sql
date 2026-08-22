-- Migración 0008: diario de escucha — presencia manual con reacción emocional.
-- Fase 5, cambio add-listen-diary-reactions.
--
-- listen_entry es un registro append-only de "qué se escuchó y cómo se
-- sintió". Reemplaza deliberadamente las estrellas de valoración por una
-- reacción emocional (gramática de sensación): el rating vigente (tabla
-- rating) sigue siendo la única fuente de la valoración numérica y ninguna
-- mutación de esta tabla lo toca.

CREATE TABLE listen_entry (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    artist_id        UUID REFERENCES artist (id) ON DELETE CASCADE,
    release_group_id UUID REFERENCES release_group (id) ON DELETE CASCADE,
    recording_id     UUID REFERENCES recording (id) ON DELETE CASCADE,
    -- contexto de la escucha: primera / repetición / redescubrimiento
    listen_context   TEXT NOT NULL CHECK (
                         listen_context IN ('first_listen', 'relisten', 'rediscovery')
                     ),
    -- impresión breve (≤500 caracteres), opcional
    body             TEXT,
    -- reacción emocional, opcional: ausencia de dato (NULL) es distinta de
    -- 'neutral' elegido explícitamente. Extender la taxonomía futura
    -- requiere migrar este CHECK (textos de UI viven en i18n).
    reaction         TEXT CHECK (
                         reaction IN ('liked', 'loved', 'obsessed', 'neutral', 'disliked')
                     ),
    -- audiencia de la actividad: alimenta el futuro feed/perfil
    audience         TEXT NOT NULL DEFAULT 'followers' CHECK (
                         audience IN ('private', 'followers', 'public')
                     ),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- exactamente un objetivo por entrada (mismo patrón que rating/comment)
    CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1),
    CHECK (body IS NULL OR length(body) <= 500)
);

-- El diario se consulta por usuario y fecha descendente.
CREATE INDEX idx_listen_entry_user_created ON listen_entry (user_id, created_at DESC);

-- Recuperación por objetivo (perfil futuro, feed, agregados).
CREATE INDEX idx_listen_entry_artist        ON listen_entry (artist_id);
CREATE INDEX idx_listen_entry_release_group ON listen_entry (release_group_id);
CREATE INDEX idx_listen_entry_recording     ON listen_entry (recording_id);