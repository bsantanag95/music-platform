## MODIFIED Requirements

### Requirement: Hacer público
`POST /api/me/share/<tipo>/<ref>` SHALL hacer pública solo esa valoración (con la marca), esa escucha o esa Lámina (con `audience = 'public'`) y
responder su nuevo estado. Con el perfil privado SHALL responder `409` con `PROFILE_PRIVATE` sin cambiar nada. `DELETE` SHALL quitar la
marca de una valoración.

#### Scenario: Hacer pública una escucha
- **WHEN** el dueño hace pública una escucha privada
- **THEN** su audiencia pasa a `public`, las demás no cambian y el estado es `public`

#### Scenario: Perfil privado
- **WHEN** el dueño de un perfil privado intenta hacer pública una valoración
- **THEN** la respuesta es `409` con `PROFILE_PRIVATE` y no se crea la marca

#### Scenario: Hacer pública una Lámina
- **WHEN** el dueño hace pública una Lámina privada
- **THEN** su audiencia pasa a `public` y el estado es `public`
