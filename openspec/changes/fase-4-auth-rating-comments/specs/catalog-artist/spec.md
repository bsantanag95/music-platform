# catalog-artist

Delta de la capacidad de perfil público de artista para navegación por membresías.

## ADDED Requirements

### Requirement: Sección de integrantes y membresías
El perfil SHALL integrar la sección de integrantes para grupos y SHALL integrar la discografía de los grupos asociados al perfil de una persona, respetando las categorías y los enlaces locale-aware existentes.

#### Scenario: Perfil de grupo con integrantes
- **WHEN** se visita un perfil de tipo `group` con filas `membership`
- **THEN** la página muestra integrantes enlazados y mantiene la discografía del grupo

#### Scenario: Perfil de persona con membresías
- **WHEN** se visita un perfil de tipo `person` con grupos relacionados
- **THEN** la página combina discografía solista y de grupos sin duplicar álbumes
