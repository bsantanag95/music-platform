-- Migración 0015: índice para la huella de gusto del perfil.
-- Fase 5, cambio redesign-user-profile.
--
-- La curva de valoraciones y el reparto por tipo agrupan las valoraciones de
-- un usuario (WHERE user_id = ? GROUP BY stars / FILTER por tipo). Los índices
-- existentes de `rating` son por objetivo (recording/release_group/artist),
-- no por autor.

CREATE INDEX idx_rating_user ON rating (user_id);
