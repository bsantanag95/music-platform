# personal-share-image Specification

## Purpose
Permitir que el dueño comparta lo suyo sin publicarlo: la imagen privada de una valoración o escucha, que nunca entra a una caché compartida, el estado que recibe la hoja de compartir y el gesto explícito que hace pública una sola fila. Es la única excepción a que lo compartido se calcula como anónimo (ADR 0050).
## Requirements
### Requirement: Imagen privada del dueño
Con `?personal=1`, la ruta de imágenes SHALL generar la imagen de una valoración o una escucha para su dueño aunque no sea pública.
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

### Requirement: Imagen revocable
La imagen pública de una valoración o una escucha SHALL servirse siempre con la caché corta, aunque la versión coincida: su dueño puede
dejar de compartirla, y una caché inmutable la mantendría visible.

#### Scenario: Dejar de compartir
- **WHEN** el dueño deja de compartir una valoración cuya imagen ya se pidió
- **THEN** ninguna copia de esa imagen se sirve más allá de la caché corta

### Requirement: Estado para compartir lo propio
`GET /api/me/share/<tipo>/<ref>` SHALL exigir sesión y responder el estado de una valoración o escucha propia: `public` si un anónimo
puede verla, `needs_gesture` si no y el perfil es público, `private_profile` si el perfil es privado, con los datos de la hoja. Lo
ajeno o inexistente SHALL responder `404`.

#### Scenario: Escucha privada
- **WHEN** el dueño pide el estado de una escucha privada con el perfil público
- **THEN** la respuesta es `needs_gesture` y la imagen de los datos es la personal

### Requirement: Hacer público
`POST /api/me/share/<tipo>/<ref>` SHALL hacer pública solo esa valoración (con la marca) o esa escucha (con `audience = 'public'`) y
responder su nuevo estado. Con el perfil privado SHALL responder `409` con `PROFILE_PRIVATE` sin cambiar nada. `DELETE` SHALL quitar la
marca de una valoración.

#### Scenario: Hacer pública una escucha
- **WHEN** el dueño hace pública una escucha privada
- **THEN** su audiencia pasa a `public`, las demás no cambian y el estado es `public`

#### Scenario: Perfil privado
- **WHEN** el dueño de un perfil privado intenta hacer pública una valoración
- **THEN** la respuesta es `409` con `PROFILE_PRIVATE` y no se crea la marca

