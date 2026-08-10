# catalog-artist

Delta del perfil de artista para sincronización de memberships antes de la lectura.

## ADDED Requirements

### Requirement: Memberships disponibles tras ingesta fría
El perfil de artista SHALL garantizar que las memberships se hayan sincronizado antes de construir la respuesta de un artista frío, y SHALL leerlas desde PostgreSQL después de esa sincronización.

#### Scenario: Perfil frío con relaciones
- **WHEN** una persona visita un artista cuyo `memberships_synced_at` es `NULL`
- **THEN** la aplicación sincroniza las relaciones válidas y muestra integrantes o grupos relacionados en el perfil

#### Scenario: Perfil cacheado
- **WHEN** una persona visita un artista con memberships ya sincronizadas
- **THEN** el perfil no realiza una llamada externa adicional para resolver memberships
