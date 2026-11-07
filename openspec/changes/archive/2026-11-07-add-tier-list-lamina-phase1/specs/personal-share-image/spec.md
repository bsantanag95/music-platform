## ADDED Requirements

### Requirement: Tier list propia
Una tier list SHALL ser un objeto propio, como una Lámina Top N: su dueño SHALL recibir el estado para compartirla y la imagen privada mientras
no sea pública, y el gesto de hacerla pública SHALL poner `audience = 'public'` solo en esa tier list.

#### Scenario: Tier list privada
- **WHEN** el dueño, con el perfil público, pide el estado de una tier list privada
- **THEN** la respuesta es `needs_gesture` y la imagen es la personal

#### Scenario: Hacerla pública
- **WHEN** el dueño hace pública su tier list desde la hoja
- **THEN** su audiencia pasa a `public` y las demás Láminas no cambian
