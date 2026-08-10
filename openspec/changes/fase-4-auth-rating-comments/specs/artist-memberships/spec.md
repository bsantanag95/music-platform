# artist-memberships

Navegación por membresías entre personas y grupos del catálogo.

## ADDED Requirements

### Requirement: Integrantes de un grupo
El perfil de un artista con tipo `group` SHALL mostrar sus integrantes conocidos desde `membership` y SHALL enlazarlos a sus perfiles localizados.

#### Scenario: Grupo con integrantes
- **WHEN** una persona visita el perfil de un grupo con membresías almacenadas
- **THEN** ve los integrantes, roles y períodos disponibles, y cada integrante enlaza a `/artist/{id}` con el locale activo

#### Scenario: Grupo sin integrantes
- **WHEN** un grupo no tiene membresías almacenadas
- **THEN** el perfil conserva su discografía y no muestra una sección rota o falsa de integrantes

### Requirement: Discografía por membresía
El perfil de una persona SHALL combinar su discografía directa con la de los grupos a los que pertenece, sin sustituir ni duplicar indebidamente su discografía propia.

#### Scenario: Persona con carrera y grupo
- **WHEN** una persona tiene discografía solista y membresías a uno o más grupos
- **THEN** el perfil muestra ambas fuentes agrupadas por categoría y cada álbum aparece una sola vez

#### Scenario: Membresía sin discografía cacheada
- **WHEN** una membresía apunta a un grupo válido cuya discografía aún no está cacheada
- **THEN** el servicio usa el patrón de cacheo bajo demanda definido para el catálogo y la página conserva un estado de carga o error localizado

### Requirement: Integridad de membresías
La navegación SHALL consultar únicamente relaciones válidas de `membership` y no SHALL crear llamadas externas adicionales durante la lectura de una página ya cacheada.

#### Scenario: Relación válida
- **WHEN** la base contiene una membresía entre un artista persona y un artista grupo
- **THEN** la relación se usa para enlaces y composición de discografía

#### Scenario: Relación inválida o ausente
- **WHEN** una relación no existe o no cumple las restricciones de tipos
- **THEN** el servicio la omite o devuelve un error controlado sin romper el perfil
