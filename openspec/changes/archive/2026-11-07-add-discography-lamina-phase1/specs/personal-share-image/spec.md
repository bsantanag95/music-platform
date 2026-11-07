## MODIFIED Requirements

### Requirement: Imagen privada del dueño
Con `?personal=1`, la ruta de imágenes SHALL generar la imagen de una valoración, una escucha, una Lámina o una discografía para su dueño aunque no sea pública.
SHALL exigir su sesión; a cualquier otro visitante SHALL responderle la imagen genérica. La respuesta SHALL llevar `Cache-Control:
private, no-store` y SHALL NOT anunciarse en metadatos.

#### Scenario: Dueño de un perfil privado
- **WHEN** el dueño de un perfil privado pide la imagen personal de su valoración
- **THEN** recibe la imagen con su nota y sin caché pública

#### Scenario: Otra persona
- **WHEN** otra persona pide esa misma URL
- **THEN** recibe la imagen genérica

#### Scenario: Sin sesión
- **WHEN** un visitante sin sesión pide esa URL
- **THEN** recibe la imagen genérica

### Requirement: Hacer público
`POST /api/me/share/<tipo>/<ref>` SHALL hacer pública solo esa valoración (con la marca), esa escucha o esa Lámina (con `audience = 'public'`), o esa discografía (con su marca), y
responder su nuevo estado. Con el perfil privado SHALL responder `409` con `PROFILE_PRIVATE` sin cambiar nada. `DELETE` SHALL quitar la
marca de una valoración o de una discografía. Hacer pública una discografía SHALL exigir que no haya suspensión social.

#### Scenario: Hacer pública una escucha
- **WHEN** el dueño hace pública una escucha privada
- **THEN** su audiencia pasa a `public`, las demás no cambian y el estado es `public`

#### Scenario: Perfil privado
- **WHEN** el dueño de un perfil privado intenta hacer pública una valoración
- **THEN** la respuesta es `409` con `PROFILE_PRIVATE` y no se crea la marca

#### Scenario: Hacer pública una Lámina
- **WHEN** el dueño hace pública una Lámina privada
- **THEN** su audiencia pasa a `public` y el estado es `public`

#### Scenario: Hacer pública una discografía
- **WHEN** el dueño hace pública su discografía de un artista
- **THEN** se crea la marca de ese artista, las de otros artistas no cambian y el estado es `public`

#### Scenario: Quitar la marca de una discografía
- **WHEN** el dueño pide `DELETE` sobre su discografía con marca
- **THEN** la marca se borra y el estado vuelve a pedir el gesto
