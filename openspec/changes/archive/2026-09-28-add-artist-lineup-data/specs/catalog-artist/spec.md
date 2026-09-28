## MODIFIED Requirements

### Requirement: Memberships disponibles tras ingesta fría

El perfil de artista SHALL garantizar que las memberships se hayan sincronizado antes de construir la respuesta de un artista frío, y SHALL leerlas desde PostgreSQL después de esa sincronización. La sincronización fría SHALL guardar, en la misma request a MusicBrainz, los períodos de cada pertenencia y los músicos de apoyo (capability `artist-lineup`).

#### Scenario: Perfil frío con relaciones

- **WHEN** una persona visita un artista cuyo `memberships_synced_at` es `NULL`
- **THEN** la aplicación sincroniza las relaciones válidas, con sus períodos y el apoyo, y muestra integrantes o grupos relacionados en el perfil

#### Scenario: Perfil cacheado

- **WHEN** una persona visita un artista con memberships ya sincronizadas
- **THEN** el perfil no realiza una llamada externa adicional para resolver memberships
