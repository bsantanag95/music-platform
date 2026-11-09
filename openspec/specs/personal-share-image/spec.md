# personal-share-image Specification

## Purpose
Permitir que el dueño comparta lo suyo sin publicarlo: la imagen privada de una valoración o escucha, que nunca entra a una caché compartida, el estado que recibe la hoja de compartir y el gesto explícito que hace pública una sola fila. Es la única excepción a que lo compartido se calcula como anónimo (ADR 0050).
## Requirements
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

### Requirement: Tier list propia
Una tier list SHALL ser un objeto propio, como una Lámina Top N: su dueño SHALL recibir el estado para compartirla y la imagen privada mientras
no sea pública, y el gesto de hacerla pública SHALL poner `audience = 'public'` solo en esa tier list.

#### Scenario: Tier list privada
- **WHEN** el dueño, con el perfil público, pide el estado de una tier list privada
- **THEN** la respuesta es `needs_gesture` y la imagen es la personal

#### Scenario: Hacerla pública
- **WHEN** el dueño hace pública su tier list desde la hoja
- **THEN** su audiencia pasa a `public` y las demás Láminas no cambian

### Requirement: Año propio
El año en discos SHALL ser un objeto propio con referencia `<userId>.<año>`: su dueño SHALL recibir el estado para compartirlo y la imagen privada mientras
no esté marcado, el gesto SHALL crear la marca del año con la zona horaria del dueño y avisar antes qué se verá, y dejar de compartir SHALL borrarla.

#### Scenario: Año sin marca
- **WHEN** el dueño, con el perfil público, pide el estado de su año 2026 sin marca
- **THEN** la respuesta es `needs_gesture`, con la imagen personal y el aviso de qué se verá

#### Scenario: Dejar de compartir
- **WHEN** el dueño deja de compartir su año
- **THEN** la marca se borra y un anónimo ya no lo ve

